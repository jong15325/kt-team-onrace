package com.kt.onrace.queue.config;

import org.redisson.api.RKeys;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.kt.onrace.common.util.RedisKeyGenerator;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 큐 서비스 시작/종료 시 잔존 대기열 상태(Redis)를 정리한다.
 *
 * 큐 상태는 앱 메모리가 아니라 Redis에 있어, 앱을 재시작해도 이전 상태(대기자·통과 토큰·활성 페이스)가
 * 그대로 남아 스케줄러가 이어서 처리한다. 데모/개발 환경에서 매 기동 시 깨끗한 상태로 시작하기 위해 정리한다.
 *
 * ⚠️ 파괴적 동작: 진행 중인 대기열을 모두 비운다. 다중 인스턴스/롤링 재배포가 있는 실제 운영에서는
 *    살아있는 대기열을 날릴 수 있으므로 반드시 비활성화(queue.clear-on-startup=false) 할 것.
 *    정리 범위는 queue: 네임스페이스로 한정(재고·인증 등 타 도메인 키는 건드리지 않음).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QueueStartupCleaner {

	private final RedissonClient redissonClient;

	@Value("${queue.clear-on-startup:true}")
	private boolean clearOnStartup;

	@EventListener(ApplicationReadyEvent.class)
	public void onStartup() {
		if (!clearOnStartup) {
			log.info("[QUEUE] clear-on-startup=false → 큐 상태 정리 생략");
			return;
		}
		long removed = clearQueueState();
		log.info("[QUEUE] 시작 시 큐 상태 초기화 완료 — 삭제 키 {}개", removed);
	}

	@PreDestroy
	public void onShutdown() {
		if (!clearOnStartup) {
			return;
		}
		try {
			long removed = clearQueueState();
			log.info("[QUEUE] 종료 시 큐 상태 초기화 완료 — 삭제 키 {}개", removed);
		} catch (Exception e) {
			// 종료 단계 best-effort (강제 종료 시 호출 안 될 수 있음)
			log.warn("[QUEUE] 종료 시 큐 상태 정리 실패: {}", e.getMessage());
		}
	}

	/** queue: 네임스페이스(대기/통과/재시도/배치락/활성페이스/데모시퀀스) 정리 */
	private long clearQueueState() {
		RKeys keys = redissonClient.getKeys();
		long removed = 0;
		removed += keys.deleteByPattern("queue:waiting:*");
		removed += keys.deleteByPattern("queue:pass:*");
		removed += keys.deleteByPattern("queue:retry:*");
		removed += keys.deleteByPattern("queue:batch:lock:*");
		removed += keys.delete(
			RedisKeyGenerator.queueActivePaces(),
			"queue:demo:seq");
		return removed;
	}
}
