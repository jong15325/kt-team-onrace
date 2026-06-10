package com.kt.onrace.domain.entry.listener;

import org.redisson.api.RPatternTopic;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.kt.onrace.domain.entry.service.EntryCleanupService;
import com.kt.onrace.domain.event.service.EventStockService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Redis keyspace notification을 구독하여 reservation TTL 만료 시 재고를 복원한다.
 * 전제 조건: Redis 서버에 notify-keyspace-events Ex 설정 필요
 *
 * 만료 흐름:
 *   reservation:{paceId}:{userId} 키 TTL 만료
 *   → __keyevent@*__:expired 채널로 알림
 *   → 이 리스너가 수신
 *   → RESERVED(미결제) 신청이면 Entry 삭제 + Redis 재고 복원
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EntryExpListener {

	private static final String RESERVATION_PREFIX = "stock:reservation:";
	private static final String EXPIRATION_PATTERN = "__keyevent@*__:expired";

	private final RedissonClient redissonClient;
	private final EventStockService eventStockService;
	private final EntryCleanupService entryCleanupService;

	@EventListener(ApplicationReadyEvent.class)
	public void subscribe() {
		RPatternTopic topic = redissonClient.getPatternTopic(EXPIRATION_PATTERN, StringCodec.INSTANCE);

		topic.addListener(String.class, (pattern, channel, expiredKey) -> {
			if (!expiredKey.startsWith(RESERVATION_PREFIX)) {
				return;
			}

			try {
				// reservation:{paceId}:{userId} 파싱
				String[] parts = expiredKey.substring(RESERVATION_PREFIX.length()).split(":");
				Long paceId = Long.parseLong(parts[0]);
				Long userId = Long.parseLong(parts[1]);

				boolean cleaned = entryCleanupService.cleanupExpiredEntry(userId, paceId);
				if (cleaned) {
					eventStockService.restoreStock(paceId);    // RESERVED였을 때만
				}
			} catch (Exception e) {
				log.error("예약 만료 처리 실패 - expiredKey: {}", expiredKey, e);
			}
		});
	}
}
