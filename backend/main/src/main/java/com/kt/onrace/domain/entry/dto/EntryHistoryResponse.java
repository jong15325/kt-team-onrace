package com.kt.onrace.domain.entry.dto;

import java.time.LocalDateTime;

import com.kt.onrace.domain.entry.entity.Entry;
import com.kt.onrace.domain.entry.entity.EntryStatus;
import com.kt.onrace.domain.event.entity.Event;
import com.kt.onrace.domain.event.entity.EventAppType;
import com.kt.onrace.domain.event.entity.EventStatus;

import lombok.Builder;

/**
 * 마이페이지 "내 신청 내역" 단건 응답.
 * 표시용 신청상태 문자열은 프론트에서 계산하므로 원시 enum/필드만 반환한다.
 */
@Builder
public record EntryHistoryResponse(
	Long entryId,
	Long eventId,
	String title,
	String thumbnailUrl,
	EventAppType appType,
	EventStatus eventStatus,
	EntryStatus entryStatus,
	LocalDateTime createdAt,
	LocalDateTime eventAt,
	LocalDateTime appStartAt,
	LocalDateTime appEndAt,
	LocalDateTime resultAt,
	String venue,
	String courseName,
	String paceName
) {

	public static EntryHistoryResponse from(Entry entry, String thumbnailUrl) {
		Event event = entry.getEvent();

		return EntryHistoryResponse.builder()
			.entryId(entry.getId())
			.eventId(event.getId())
			.title(event.getTitle())
			.thumbnailUrl(thumbnailUrl)
			.appType(event.getAppType())
			.eventStatus(event.getStatus())
			.entryStatus(entry.getStatus())
			.createdAt(entry.getCreatedAt())
			.eventAt(event.getEventAt())
			.appStartAt(event.getAppStartAt())
			.appEndAt(event.getAppEndAt())
			.resultAt(event.getLotteryAnnouncedAt())
			.venue(event.getVenue())
			.courseName(entry.getEventCourse().getName())
			.paceName(entry.getEventPace().getName())
			.build();
	}
}
