package com.kt.onrace.domain.event.controller;

import java.util.Set;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kt.onrace.common.logging.annotation.ApiLog;
import com.kt.onrace.common.response.ApiResponse;
import com.kt.onrace.common.response.CursorResponse;
import com.kt.onrace.domain.event.dto.EventDetailResponse;
import com.kt.onrace.domain.event.dto.EventInfoResponse;
import com.kt.onrace.domain.event.dto.EventListResponse;
import com.kt.onrace.domain.event.dto.EventSearchRequest;
import com.kt.onrace.domain.event.dto.EventSalesInfoResponse;
import com.kt.onrace.domain.event.service.EventService;
import com.kt.onrace.domain.event.service.EventStockInitializer;
import com.kt.onrace.domain.entry.dto.EntryResetResponse;
import com.kt.onrace.domain.entry.service.EntryResetService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/events")
public class EventController {

	private final EventService eventService;
	private final EventStockInitializer eventStockInitializer;
	private final EntryResetService entryResetService;

	@ApiLog
	@GetMapping
	public ApiResponse<CursorResponse<EventListResponse>> getEvents(
		@Valid EventSearchRequest request
	) {
		return ApiResponse.success(eventService.getEvents(request));
	}

	@ApiLog
	@GetMapping("/{eventId}")
	public ApiResponse<EventDetailResponse> getEventDetail(
		@PathVariable Long eventId
	) {
		return ApiResponse.success(eventService.getEventDetail(eventId));
	}

	@ApiLog
	@GetMapping("/{eventId}/info")
	public ApiResponse<EventInfoResponse> getEventInfo(
		@PathVariable Long eventId
	) {
		return ApiResponse.success(eventService.getEventInfo(eventId));
	}

	@ApiLog
	@GetMapping("/{eventId}/sales-info")
	public ApiResponse<EventSalesInfoResponse> getEventSalesInfo(
		@PathVariable Long eventId
	) {
		return ApiResponse.success(eventService.getEventSalesInfo(eventId));
	}

	@ApiLog
	@PostMapping("/{eventId}/stock/init")
	public ApiResponse<Void> initializeEventStock(
		@PathVariable Long eventId
	) {
		eventStockInitializer.initializeEventStock(eventId);
		return ApiResponse.success();
	}

	// [데모/관리] 신청 전체 초기화(신청+재고+대기열)
	@ApiLog
	@PostMapping("/{eventId}/reset")
	public ApiResponse<EntryResetResponse> resetEvent(
		@PathVariable Long eventId
	) {
		return ApiResponse.success(entryResetService.resetEvent(eventId));
	}

	@ApiLog
	@PostMapping("/{eventId}/queue/enable")
	public ApiResponse<Void> enableQueue(
		@PathVariable Long eventId
	) {
		eventService.enableQueue(eventId);
		return ApiResponse.success();
	}

	@ApiLog
	@PostMapping("/{eventId}/queue/disable")
	public ApiResponse<Void> disableQueue(
		@PathVariable Long eventId
	) {
		eventService.disableQueue(eventId);
		return ApiResponse.success();
	}

	@GetMapping("/queue-enabled")
	public ApiResponse<Set<Long>> getQueueEnabledEventIds() {
		return ApiResponse.success(eventService.getQueueEnabledEventIds());
	}
}
