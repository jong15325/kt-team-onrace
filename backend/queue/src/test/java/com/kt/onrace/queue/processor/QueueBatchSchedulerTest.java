package com.kt.onrace.queue.processor;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.BatchOptions;
import org.redisson.api.RBatch;
import org.redisson.api.RBucketAsync;
import org.redisson.api.RDeque;
import org.redisson.api.RLock;
import org.redisson.api.RScoredSortedSet;
import org.redisson.api.RScript;
import org.redisson.api.RSet;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.Codec;

import com.kt.onrace.queue.config.QueueMetrics;
import com.kt.onrace.queue.config.QueueProperties;
import com.kt.onrace.queue.security.QueueTokenGenerator;

@ExtendWith(MockitoExtension.class)
class QueueBatchSchedulerTest {

	private static final Long PACE_ID = 1L;
	private static final Long PACE_ID_2 = 2L;
	private static final Long USER_ID = 100L;
	private static final Long USER_ID_2 = 200L;
	private static final int BATCH_SIZE = 100;
	private static final long PASS_TTL = 600L;
	private static final String PASS_TOKEN = "test-pass-token";

	@Mock private RedissonClient redissonClient;
	@Mock private QueueProperties queueProperties;
	@Mock private QueueTokenGenerator queueTokenGenerator;
	@Mock private QueueMetrics queueMetrics;

	@Mock private RSet<String> activePaces;
	@Mock private RLock lock;
	@Mock private RDeque<String> retryQueue;
	@Mock private RScoredSortedSet<String> waitingSet;
	@Mock private RBatch rBatch;
	@Mock private RBucketAsync<String> batchBucket;
	@Mock private RScript rScript;

	@InjectMocks
	private QueueBatchScheduler queueBatchScheduler;

	private void givenActivePaces(String... paceIds) {
		doReturn(activePaces).when(redissonClient).getSet(anyString(), any(Codec.class));
		when(activePaces.readAll()).thenReturn(Set.of(paceIds));
	}

	private void givenBatchProperties() {
		when(queueProperties.getBatchSize()).thenReturn(BATCH_SIZE);
		when(queueProperties.getPassTtlSeconds()).thenReturn(PASS_TTL);
	}

	private void givenLockAcquired() throws InterruptedException {
		when(redissonClient.getLock(anyString())).thenReturn(lock);
		when(lock.tryLock(eq(0L), eq(30L), eq(TimeUnit.SECONDS))).thenReturn(true);
		when(lock.isHeldByCurrentThread()).thenReturn(true);
	}

	private void givenLockNotAcquired() throws InterruptedException {
		when(redissonClient.getLock(anyString())).thenReturn(lock);
		when(lock.tryLock(eq(0L), eq(30L), eq(TimeUnit.SECONDS))).thenReturn(false);
	}

	private void givenRetryQueueEmpty() {
		doReturn(retryQueue).when(redissonClient).getDeque(anyString(), any(Codec.class));
		when(retryQueue.pollFirst()).thenReturn(null);
	}

	private void givenRetryQueueWith(String... entries) {
		doReturn(retryQueue).when(redissonClient).getDeque(anyString(), any(Codec.class));
		if (entries.length == 1) {
			when(retryQueue.pollFirst()).thenReturn(entries[0], (String) null);
		} else {
			String[] rest = new String[entries.length];
			System.arraycopy(entries, 1, rest, 0, entries.length - 1);
			rest[entries.length - 1] = null;
			when(retryQueue.pollFirst()).thenReturn(entries[0], rest);
		}
	}

	private void givenWaitingSetWith(String... userIds) {
		doReturn(waitingSet).when(redissonClient).getScoredSortedSet(anyString(), any(Codec.class));
		when(waitingSet.pollFirst(any(int.class))).thenReturn(List.of(userIds));
	}

	private void givenWaitingSetEmpty() {
		doReturn(waitingSet).when(redissonClient).getScoredSortedSet(anyString(), any(Codec.class));
		when(waitingSet.pollFirst(any(int.class))).thenReturn(List.of());
	}

	private void givenPipelineBatch() {
		when(redissonClient.createBatch(any(BatchOptions.class))).thenReturn(rBatch);
		doReturn(batchBucket).when(rBatch).getBucket(anyString(), any(Codec.class));
	}

	private void givenTokenGeneration() {
		when(queueTokenGenerator.generatePassToken(anyLong(), anyLong())).thenReturn(PASS_TOKEN);
		givenPipelineBatch();
	}

	private void givenLuaScript() {
		when(redissonClient.getScript(any(Codec.class))).thenReturn(rScript);
	}

	// ===== 정상 흐름 =====

	@Nested
	@DisplayName("정상 흐름")
	class NormalFlow {

		@Test
		@DisplayName("대기열 사용자가 파이프라인으로 통과 토큰을 발급받는다")
		void processBatch_issuesPassToken() throws InterruptedException {
			// given
			givenBatchProperties();
			givenActivePaces(String.valueOf(PACE_ID));
			givenLockAcquired();
			givenRetryQueueEmpty();
			givenWaitingSetWith(String.valueOf(USER_ID));
			givenTokenGeneration();
			givenLuaScript();

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(queueTokenGenerator).generatePassToken(USER_ID, PACE_ID);
			verify(batchBucket).setAsync(eq(PASS_TOKEN), eq(PASS_TTL), eq(TimeUnit.SECONDS));
			verify(rBatch).execute();
			verify(lock).unlock();
		}

		@Test
		@DisplayName("여러 pace가 각각 독립적으로 병렬 처리된다")
		void processBatch_multiPace() throws InterruptedException {
			// given
			givenBatchProperties();
			givenActivePaces(String.valueOf(PACE_ID), String.valueOf(PACE_ID_2));
			givenLockAcquired();
			givenRetryQueueEmpty();
			givenWaitingSetWith(String.valueOf(USER_ID));
			givenTokenGeneration();
			givenLuaScript();

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(lock, times(2)).tryLock(eq(0L), eq(30L), eq(TimeUnit.SECONDS));
			verify(queueTokenGenerator, times(2)).generatePassToken(eq(USER_ID), anyLong());
			verify(rBatch, times(2)).execute();
		}
	}

	// ===== 재시도 큐 =====

	@Nested
	@DisplayName("재시도 큐")
	class RetryQueueTest {

		@Test
		@DisplayName("토큰 생성 실패 시 재시도 큐에 등록된다")
		void processBatch_tokenFailure_addedToRetryQueue() throws InterruptedException {
			// given
			givenBatchProperties();
			givenActivePaces(String.valueOf(PACE_ID));
			givenLockAcquired();
			givenRetryQueueEmpty();
			givenWaitingSetWith(String.valueOf(USER_ID));
			when(queueTokenGenerator.generatePassToken(anyLong(), anyLong()))
				.thenThrow(new RuntimeException("JWT 생성 실패"));
			givenLuaScript();

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(retryQueue).addLast(USER_ID + ":1");
		}

		@Test
		@DisplayName("재시도 큐 사용자가 대기열보다 먼저 처리된다")
		void processBatch_retryQueueProcessedFirst() throws InterruptedException {
			// given
			givenBatchProperties();
			givenActivePaces(String.valueOf(PACE_ID));
			givenLockAcquired();
			givenRetryQueueWith(String.valueOf(USER_ID));
			givenWaitingSetWith(String.valueOf(USER_ID_2));
			givenTokenGeneration();
			givenLuaScript();

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(queueTokenGenerator).generatePassToken(USER_ID, PACE_ID);
			verify(queueTokenGenerator).generatePassToken(USER_ID_2, PACE_ID);
		}

		@Test
		@DisplayName("재시도 큐 처리 후 남은 배치 여유분만 대기열에서 처리한다")
		void processBatch_retryReducesRemainingBatch() throws InterruptedException {
			// given
			when(queueProperties.getBatchSize()).thenReturn(3);
			when(queueProperties.getPassTtlSeconds()).thenReturn(PASS_TTL);
			givenActivePaces(String.valueOf(PACE_ID));
			givenLockAcquired();
			givenRetryQueueWith(String.valueOf(USER_ID), String.valueOf(USER_ID_2));
			givenTokenGeneration();
			givenLuaScript();
			doReturn(waitingSet).when(redissonClient).getScoredSortedSet(anyString(), any(Codec.class));
			when(waitingSet.pollFirst(1)).thenReturn(List.of("300"));

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(waitingSet).pollFirst(1);
		}
	}

	// ===== 최대 재시도 제한 =====

	@Nested
	@DisplayName("최대 재시도 제한")
	class MaxRetryLimit {

		@Test
		@DisplayName("최대 재시도 횟수 초과 시 사용자가 제거된다")
		void processBatch_maxRetryExceeded_userDropped() throws InterruptedException {
			// given
			givenBatchProperties();
			givenActivePaces(String.valueOf(PACE_ID));
			givenLockAcquired();
			givenRetryQueueWith(USER_ID + ":3");
			givenWaitingSetEmpty();
			givenLuaScript();

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(queueTokenGenerator, never()).generatePassToken(anyLong(), anyLong());
		}

		@Test
		@DisplayName("재시도 횟수가 증가하며 기록된다")
		void processBatch_retryCountIncremented() throws InterruptedException {
			// given
			givenBatchProperties();
			givenActivePaces(String.valueOf(PACE_ID));
			givenLockAcquired();
			givenRetryQueueWith(USER_ID + ":1");
			doReturn(waitingSet).when(redissonClient).getScoredSortedSet(anyString(), any(Codec.class));
			when(waitingSet.pollFirst(any(int.class))).thenReturn(List.of());
			when(queueTokenGenerator.generatePassToken(anyLong(), anyLong()))
				.thenThrow(new RuntimeException("JWT 생성 실패"));
			givenLuaScript();

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(retryQueue).addLast(USER_ID + ":2");
		}
	}

	// ===== 락 동작 =====

	@Nested
	@DisplayName("락 동작")
	class LockBehavior {

		@Test
		@DisplayName("락 획득 실패 시 해당 pace를 건너뛴다")
		void processBatch_lockNotAcquired_skipped() throws InterruptedException {
			// given
			givenActivePaces(String.valueOf(PACE_ID));
			givenLockNotAcquired();

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(queueTokenGenerator, never()).generatePassToken(anyLong(), anyLong());
			verify(lock, never()).unlock();
		}
	}

	// ===== 빈 큐 정리 =====

	@Nested
	@DisplayName("빈 큐 정리")
	class EmptyQueueCleanup {

		@Test
		@DisplayName("대기열과 재시도 큐가 모두 비었을 때 Lua 스크립트로 activePaces 정리를 시도한다")
		void processBatch_emptyQueues_luaScriptCalled() throws InterruptedException {
			// given
			givenBatchProperties();
			givenActivePaces(String.valueOf(PACE_ID));
			givenLockAcquired();
			givenRetryQueueEmpty();
			givenWaitingSetEmpty();
			givenLuaScript();

			// when
			queueBatchScheduler.processBatch();

			// then
			verify(rScript).eval(
				eq(RScript.Mode.READ_WRITE),
				anyString(),
				eq(RScript.ReturnType.INTEGER),
				any(List.class),
				eq(String.valueOf(PACE_ID))
			);
		}
	}
}
