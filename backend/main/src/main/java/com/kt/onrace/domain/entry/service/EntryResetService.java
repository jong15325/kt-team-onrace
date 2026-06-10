package com.kt.onrace.domain.entry.service;

import java.util.List;

import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.common.logging.annotation.ServiceLog;
import com.kt.onrace.common.util.RedisKeyGenerator;
import com.kt.onrace.domain.entry.dto.EntryResetResponse;
import com.kt.onrace.domain.entry.repository.EntryRepository;
import com.kt.onrace.domain.event.entity.EventPace;
import com.kt.onrace.domain.event.entity.EventStock;
import com.kt.onrace.domain.event.repository.EventPaceRepository;
import com.kt.onrace.domain.event.repository.EventStockRepository;
import com.kt.onrace.domain.event.service.EventStockService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * [데모/관리] 이벤트 신청 전체 초기화.
 * - 신청(Entry) 전체 삭제
 * - 페이스별 Redis 재고 재초기화(확정=0 → 전량 가용)
 * - 페이스별 대기열(waiting/retry/pass)·재고 예약 키 정리 + 활성 페이스 해제
 *
 * ※ 파괴적 동작. 포트폴리오 데모용 컨트롤이며 실제 운영에선 관리자 권한 제한 필요.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EntryResetService {

	private final EntryRepository entryRepository;
	private final EventPaceRepository eventPaceRepository;
	private final EventStockRepository eventStockRepository;
	private final EventStockService eventStockService;
	private final RedissonClient redissonClient;

	@ServiceLog
	@Transactional
	public EntryResetResponse resetEvent(Long eventId) {
		// 1) 신청(Entry) 전체 삭제
		long deleted = entryRepository.deleteByEventId(eventId);

		// 2) 페이스별 재고 재초기화 + 대기열/예약 키 정리
		List<EventPace> paces = eventPaceRepository.findByEventCourseEventId(eventId);
		for (EventPace pace : paces) {
			Long paceId = pace.getId();

			// 재고 재초기화(확정 0 → 전량 가용)
			EventStock stock = eventStockRepository.findByEventPaceIdOrThrow(paceId);
			eventStockService.initializeStock(paceId, stock.getTotalStock(), 0);

			// 대기열 키 정리
			redissonClient.getKeys().delete(
				RedisKeyGenerator.queueWaiting(paceId),
				RedisKeyGenerator.queueRetry(paceId));
			redissonClient.getKeys().deleteByPattern("queue:pass:" + paceId + ":*");
			// 재고 예약 키 정리
			redissonClient.getKeys().deleteByPattern("stock:reservation:" + paceId + ":*");
			// 활성 페이스 해제
			redissonClient.getSet(RedisKeyGenerator.queueActivePaces(), StringCodec.INSTANCE)
				.remove(String.valueOf(paceId));
		}

		log.info("[ENTRY][RESET] 신청 초기화 eventId={}, deletedEntries={}, resetPaces={}",
			eventId, deleted, paces.size());

		return EntryResetResponse.of(eventId, deleted, paces.size());
	}
}
