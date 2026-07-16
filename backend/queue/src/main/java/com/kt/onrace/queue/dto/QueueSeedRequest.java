package com.kt.onrace.queue.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * [데모] 대기열 부하 시연용 테스트 사용자 주입 요청.
 * 혼자 신청 시 대기열이 비어 즉시 통과되므로, 가짜 대기자를 앞줄에 채워
 * 실제 대기→통과 과정을 시연한다.
 */
public record QueueSeedRequest(
	@NotNull(message = "페이스 ID는 필수입니다.")
	@Min(value = 1, message = "페이스 ID는 1 이상이어야 합니다.")
	Long paceId,

	@NotNull(message = "주입 인원은 필수입니다.")
	@Min(value = 1, message = "주입 인원은 1 이상이어야 합니다.")
	Integer count
) {
}
