package com.kt.onrace.domain.entry.dto;

import lombok.Builder;

/**
 * [데모/관리] 이벤트 신청 초기화 결과.
 * - deletedEntries: 삭제된 신청(Entry) 수
 * - resetPaces: 재고 재초기화 및 대기열 정리된 페이스 수
 */
@Builder
public record EntryResetResponse(
	Long eventId,
	long deletedEntries,
	int resetPaces
) {
	public static EntryResetResponse of(Long eventId, long deletedEntries, int resetPaces) {
		return EntryResetResponse.builder()
			.eventId(eventId)
			.deletedEntries(deletedEntries)
			.resetPaces(resetPaces)
			.build();
	}
}
