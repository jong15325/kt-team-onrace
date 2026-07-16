package com.kt.onrace.queue.processor;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.redisson.api.BatchOptions;
import org.redisson.api.RBatch;
import org.redisson.api.RBucketAsync;
import org.redisson.api.RDeque;
import org.redisson.api.RLock;
import org.redisson.api.RScoredSortedSet;
import org.redisson.api.RScript;
import org.redisson.api.RSet;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.kt.onrace.common.util.RedisKeyGenerator;
import com.kt.onrace.queue.config.QueueMetrics;
import com.kt.onrace.queue.config.QueueProperties;
import com.kt.onrace.queue.security.QueueTokenGenerator;

import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class QueueBatchScheduler {

	private final RedissonClient redissonClient;
	private final QueueProperties queueProperties;
	private final QueueTokenGenerator queueTokenGenerator;
	private final QueueMetrics queueMetrics;

	private static final long LOCK_LEASE_SECONDS = 30;
	private static final int MAX_RETRY_COUNT = 3;
	private static final String RETRY_SEPARATOR = ":";
	private static final int PACE_THREAD_POOL_SIZE = 8;

	private final ExecutorService paceExecutor = Executors.newFixedThreadPool(PACE_THREAD_POOL_SIZE,
		r -> {
			Thread t = new Thread(r, "queue-pace-worker");
			t.setDaemon(true);
			return t;
		});

	// 대기열(waiting)과 재시도 큐(retry)가 모두 비어있을 때만 activePaces에서 제거
	private static final String REMOVE_IF_EMPTY_SCRIPT =
		"if redis.call('ZCARD', KEYS[1]) == 0 and redis.call('LLEN', KEYS[2]) == 0 then " +
			"redis.call('SREM', KEYS[3], ARGV[1]) " +
			"return 1 " +
		"end " +
		"return 0";

	@Scheduled(fixedDelayString = "${queue.interval-ms}")
	public void processBatch() {
		Timer.Sample sample = queueMetrics.startBatchTimer();

		try {
			RSet<String> activePaces = redissonClient.getSet(RedisKeyGenerator.queueActivePaces(), StringCodec.INSTANCE);
			Set<String> paceIds = activePaces.readAll();

			List<CompletableFuture<Void>> futures = paceIds.stream()
				.map(paceIdStr -> CompletableFuture.runAsync(() -> {
					try {
						Long paceId = Long.parseLong(paceIdStr);
						processPaceQueue(paceId);
					} catch (Exception e) {
						log.error("배치 처리 오류 - paceId={}, error={}", paceIdStr, e.getMessage());
					}
				}, paceExecutor))
				.toList();

			CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();
		} finally {
			queueMetrics.stopBatchTimer(sample);
		}
	}

	private void processPaceQueue(Long paceId) {
		// pace별 분산 락 획득
		RLock lock = redissonClient.getLock(RedisKeyGenerator.queueBatchLock(paceId));

		boolean acquired;
		try {
			acquired = lock.tryLock(0, LOCK_LEASE_SECONDS, TimeUnit.SECONDS);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			return;
		}
		if (!acquired) {
			return;
		}

		try {
			RDeque<String> retryQueue = redissonClient.getDeque(
				RedisKeyGenerator.queueRetry(paceId), StringCodec.INSTANCE);
			RScoredSortedSet<String> waitingSet = redissonClient.getScoredSortedSet(
				RedisKeyGenerator.queueWaiting(paceId), StringCodec.INSTANCE);
			int batchSize = queueProperties.getBatchSize();
			long passTtl = queueProperties.getPassTtlSeconds();

			// 1단계: 재시도 큐 우선 처리
			int issued = processRetryQueue(retryQueue, paceId, passTtl, batchSize);

			// 2단계: 남은 배치 여유분만큼 대기열에서 처리
			issued += processWaitingQueue(waitingSet, paceId, passTtl, retryQueue, batchSize - issued);

			// 메트릭 기록
			queueMetrics.recordPass(paceId, issued);
			queueMetrics.updateWaitingSize(paceId, waitingSet.size());

			if (issued > 0) {
				log.info("[QUEUE] 배치 처리 완료 paceId={}, issued={}, waiting={}", paceId, issued, waitingSet.size());
			}

			removeActivePaceIfEmpty(paceId);
		} finally {
			if (lock.isHeldByCurrentThread()) {
				lock.unlock();
			}
		}
	}

	private record PassTokenEntry(String userIdStr, String passKey, String passToken, int retryCount) {}

	private int processWaitingQueue(RScoredSortedSet<String> waitingSet, Long paceId, long passTtl,
		RDeque<String> retryQueue, int count) {
		if (count <= 0) {
			return 0;
		}
		Collection<String> popped = waitingSet.pollFirst(count);
		if (popped == null || popped.isEmpty()) {
			return 0;
		}

		List<PassTokenEntry> entries = new ArrayList<>();
		for (String userIdStr : popped) {
			if (userIdStr == null) {
				continue;
			}
			try {
				Long userId = Long.parseLong(userIdStr);
				String passKey = RedisKeyGenerator.queuePass(paceId, userId);
				String passToken = queueTokenGenerator.generatePassToken(userId, paceId);
				entries.add(new PassTokenEntry(userIdStr, passKey, passToken, 0));
			} catch (Exception e) {
				log.error("통과 토큰 생성 실패, 재시도 큐 등록 (1/{}) - paceId={}, userId={}",
					MAX_RETRY_COUNT, paceId, userIdStr, e);
				retryQueue.addLast(userIdStr + RETRY_SEPARATOR + 1);
			}
		}

		return executeTokenBatch(entries, paceId, passTtl, retryQueue);
	}

	private int processRetryQueue(RDeque<String> retryQueue, Long paceId, long passTtl, int batchSize) {
		List<PassTokenEntry> entries = new ArrayList<>();

		String entry;
		while (entries.size() < batchSize && (entry = retryQueue.pollFirst()) != null) {
			String userId = parseUserId(entry);
			int retryCount = parseRetryCount(entry);

			if (retryCount >= MAX_RETRY_COUNT) {
				log.warn("최대 재시도 횟수 초과, 사용자 제거 - paceId={}, userId={}, retryCount={}", paceId, userId, retryCount);
				continue;
			}

			try {
				Long userIdLong = Long.parseLong(userId);
				String passKey = RedisKeyGenerator.queuePass(paceId, userIdLong);
				String passToken = queueTokenGenerator.generatePassToken(userIdLong, paceId);
				entries.add(new PassTokenEntry(userId, passKey, passToken, retryCount));
			} catch (Exception e) {
				int nextRetry = retryCount + 1;
				log.error("통과 토큰 생성 실패, 재시도 큐 등록 ({}/{}) - paceId={}, userId={}",
					nextRetry, MAX_RETRY_COUNT, paceId, userId, e);
				retryQueue.addLast(userId + RETRY_SEPARATOR + nextRetry);
			}
		}

		return executeTokenBatch(entries, paceId, passTtl, retryQueue);
	}

	private int executeTokenBatch(List<PassTokenEntry> entries, Long paceId, long passTtl, RDeque<String> retryQueue) {
		if (entries.isEmpty()) {
			return 0;
		}

		try {
			RBatch batch = redissonClient.createBatch(BatchOptions.defaults());
			for (PassTokenEntry entry : entries) {
				RBucketAsync<String> bucket = batch.getBucket(entry.passKey(), StringCodec.INSTANCE);
				bucket.setAsync(entry.passToken(), passTtl, TimeUnit.SECONDS);
			}
			batch.execute();

			for (PassTokenEntry entry : entries) {
				log.debug("[QUEUE] 통과 토큰 발급 userId={}, paceId={}", entry.userIdStr(), paceId);
			}
			return entries.size();
		} catch (Exception e) {
			log.error("파이프라인 실행 실패, 재시도 큐 등록 - paceId={}, count={}", paceId, entries.size(), e);
			for (PassTokenEntry entry : entries) {
				int nextRetry = entry.retryCount() + 1;
				retryQueue.addLast(entry.userIdStr() + RETRY_SEPARATOR + nextRetry);
			}
			return 0;
		}
	}

	private String parseUserId(String entry) {
		int idx = entry.indexOf(RETRY_SEPARATOR);
		return (idx == -1) ? entry : entry.substring(0, idx);
	}

	private int parseRetryCount(String entry) {
		int idx = entry.indexOf(RETRY_SEPARATOR);
		if (idx == -1) {
			return 0;
		}
		try {
			return Integer.parseInt(entry.substring(idx + 1));
		} catch (NumberFormatException e) {
			return 0;
		}
	}

	private void removeActivePaceIfEmpty(Long paceId) {
		RScript script = redissonClient.getScript(StringCodec.INSTANCE);
		script.eval(RScript.Mode.READ_WRITE, REMOVE_IF_EMPTY_SCRIPT, RScript.ReturnType.INTEGER,
			List.of(
				RedisKeyGenerator.queueWaiting(paceId),
				RedisKeyGenerator.queueRetry(paceId),
				RedisKeyGenerator.queueActivePaces()),
			String.valueOf(paceId));
	}
}
