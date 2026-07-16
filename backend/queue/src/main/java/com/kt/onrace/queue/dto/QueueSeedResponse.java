package com.kt.onrace.queue.dto;

import lombok.Builder;

/**
 * [데모] 테스트 사용자 주입 결과.
 * - seeded: 실제 주입된 가짜 대기자 수(상한 클램프 반영)
 * - waiting: 주입 후 해당 페이스 대기열의 총 대기 인원
 */
@Builder
public record QueueSeedResponse(
	Long paceId,
	int seeded,
	long waiting
) {
	public static QueueSeedResponse of(Long paceId, int seeded, long waiting) {
		return QueueSeedResponse.builder()
			.paceId(paceId)
			.seeded(seeded)
			.waiting(waiting)
			.build();
	}
}
