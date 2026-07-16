package com.kt.onrace.queue.dto;

import lombok.Builder;

@Builder
public record QueueStatusResponse(
	Long paceId,
	String status,
	Long position,
	String passToken,
	Long retryAfterMs, // 인프라 요청사항 - 폴링 지터 적용
	Long estimatedWaitMs // 예상 대기시간(ms) — 대기중일 때만
) {
	public static QueueStatusResponse waiting(Long paceId, Long position, Long retryAfterMs, Long estimatedWaitMs) {
		return QueueStatusResponse.builder()
			.paceId(paceId)
			.status("WAITING")
			.position(position)
			.retryAfterMs(retryAfterMs)
			.estimatedWaitMs(estimatedWaitMs)
			.build();
	}

	public static QueueStatusResponse pass(Long paceId, String passToken) {
		return QueueStatusResponse.builder()
			.paceId(paceId)
			.status("PASS")
			.position(null)
			.passToken(passToken)
			.build();
	}
}
