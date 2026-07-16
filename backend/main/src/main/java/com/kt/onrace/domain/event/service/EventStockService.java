package com.kt.onrace.domain.event.service;

import java.util.List;

import org.redisson.api.RAtomicLong;
import org.redisson.api.RBucket;
import org.redisson.api.RScript;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.stereotype.Service;

import com.kt.onrace.common.util.RedisKeyGenerator;
import com.kt.onrace.domain.entry.config.EntryProperties;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventStockService {
	private final RedissonClient redissonClient;
	private final EntryProperties entryProperties;
	private final StockMetrics stockMetrics;

	private static final String CONFIRM_AND_DELETE_SCRIPT =
		"redis.call('DEL', KEYS[1]); " +
			"redis.call('INCR', KEYS[2]); " +
			"return 1";

	private static final String RESERVE_SCRIPT =
		"if redis.call('EXISTS', KEYS[1]) == 1 then return -2 end " +
			"local stock = redis.call('DECR', KEYS[2]) " +
			"if stock < 0 then redis.call('INCR', KEYS[2]); return -1 end " +
			"redis.call('SET', KEYS[1], '1', 'EX', ARGV[1]) " +
			"return stock"; // 스크립트가 한개이고 짧아서 외부 파일로 관리하지 않고 코드 내에 직접 작성(분리해도 됩니다)

	public void initializeStock(Long paceId, int totalStock, int confirmedStock) {
		// 재고 카운터 셋팅(이 부분은 추후에 어떻게 할지 고민해봐야할듯)
		RAtomicLong total = redissonClient.getAtomicLong(RedisKeyGenerator.totalStockKey(paceId));
		total.set(totalStock);

		RAtomicLong temp = redissonClient.getAtomicLong(RedisKeyGenerator.tempStockKey(paceId));
		temp.set(totalStock - confirmedStock);

		RAtomicLong confirm = redissonClient.getAtomicLong(RedisKeyGenerator.confirmStockKey(paceId));
		confirm.set(confirmedStock);

		stockMetrics.registerStockGauges(paceId,
			() -> redissonClient.getAtomicLong(RedisKeyGenerator.tempStockKey(paceId)).get(),
			() -> redissonClient.getAtomicLong(RedisKeyGenerator.confirmStockKey(paceId)).get());

		log.info("[STOCK] 재고 초기화 paceId={}, total={}, confirmed={}", paceId, totalStock, confirmedStock);
	}

	public long tryReserveStock(Long paceId, Long userId) {
		RScript script = redissonClient.getScript(StringCodec.INSTANCE);

		// -2: 이미 선점된 경우, -1: 재고 부족, 0 이상: 선점 성공 (남은 재고 수)
		// eval 자체가 내부적으로 EVALSHA → NOSCRIPT fallback을 자동으로 진행해줘서 인프라 요구사항에 충족할 수 잇음!
		long result = script.eval(
			RScript.Mode.READ_WRITE,
			RESERVE_SCRIPT,
			RScript.ReturnType.INTEGER,
			List.of(RedisKeyGenerator.reservationKey(paceId, userId), RedisKeyGenerator.tempStockKey(paceId)),
			String.valueOf(entryProperties.getTtlSeconds())
		);

		stockMetrics.recordReserveResult(paceId, result);

		String resultDesc;
		if (result >= 0) {
			resultDesc = "성공(남은:" + result + ")";
		} else if (result == -1) {
			resultDesc = "매진";
		} else {
			resultDesc = "중복";
		}
		log.info("[STOCK] 재고 선점 paceId={}, userId={}, result={}", paceId, userId, resultDesc);

		return result;
	}

	public long getTotalStock(Long paceId) {
		RAtomicLong stock = redissonClient.getAtomicLong(RedisKeyGenerator.totalStockKey(paceId));
		return stock.get();
	}

	public long getTempStock(Long paceId) {
		RAtomicLong stock = redissonClient.getAtomicLong(RedisKeyGenerator.tempStockKey(paceId));
		return stock.get();
	}

	public long getConfirmStock(Long paceId) {
		RAtomicLong stock = redissonClient.getAtomicLong(RedisKeyGenerator.confirmStockKey(paceId));
		return stock.get();
	}

	public long getReservationTtl(Long paceId, Long userId) {
		RBucket<String> bucket = redissonClient.getBucket(RedisKeyGenerator.reservationKey(paceId, userId),
			StringCodec.INSTANCE);
		return bucket.remainTimeToLive();
	}

	public void restoreStock(Long paceId) {
		redissonClient.getAtomicLong(RedisKeyGenerator.tempStockKey(paceId)).incrementAndGet();
		log.info("[STOCK] 재고 복원 paceId={}", paceId);
	}

	public boolean hasReservation(Long paceId, Long userId) {
		RBucket<String> bucket = redissonClient.getBucket(RedisKeyGenerator.reservationKey(paceId, userId),
			StringCodec.INSTANCE);
		return bucket.isExists();
	}

	public boolean deleteReservation(Long paceId, Long userId) {
		RBucket<String> bucket = redissonClient.getBucket(RedisKeyGenerator.reservationKey(paceId, userId),
			StringCodec.INSTANCE);
		return bucket.delete();
	}

	public void confirmStock(Long paceId) {
		RAtomicLong stock = redissonClient.getAtomicLong(RedisKeyGenerator.confirmStockKey(paceId));
		stock.incrementAndGet();
		log.info("[STOCK] 재고 확정 paceId={}", paceId);
	}

	public void confirmAndDeleteReservation(Long paceId, Long userId) {
		RScript script = redissonClient.getScript(StringCodec.INSTANCE);
		script.eval(
			RScript.Mode.READ_WRITE,
			CONFIRM_AND_DELETE_SCRIPT,
			RScript.ReturnType.INTEGER,
			List.of(RedisKeyGenerator.reservationKey(paceId, userId), RedisKeyGenerator.confirmStockKey(paceId))
		);
		log.info("[STOCK] 예약 삭제 + 재고 확정 paceId={}, userId={}", paceId, userId);
	}

	public void cancelConfirmedStock(Long paceId) {
		redissonClient.getAtomicLong(RedisKeyGenerator.confirmStockKey(paceId)).decrementAndGet();
	}

	public void cancelTempStock(Long paceId) {
		redissonClient.getAtomicLong(RedisKeyGenerator.tempStockKey(paceId)).incrementAndGet();
	}

}
