package com.kt.onrace.queue.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kt.onrace.common.logging.annotation.ApiLog;
import com.kt.onrace.common.response.ApiResponse;
import com.kt.onrace.queue.dto.QueueEnterRequest;
import com.kt.onrace.queue.dto.QueueEnterResponse;
import com.kt.onrace.queue.dto.QueueSeedRequest;
import com.kt.onrace.queue.dto.QueueSeedResponse;
import com.kt.onrace.queue.dto.QueueStatusResponse;
import com.kt.onrace.queue.service.QueueService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/queue")
public class QueueController {

	private final QueueService queueService;

	@ApiLog
	@PostMapping("/enter")
	public ApiResponse<QueueEnterResponse> enter(
		@RequestHeader("X-User-Id") Long userId,
		@Valid @RequestBody QueueEnterRequest request
	) {
		return ApiResponse.success(queueService.enter(userId, request.paceId()));
	}

	@GetMapping("/status")
	public ApiResponse<QueueStatusResponse> getStatus(
		@RequestHeader("X-User-Id") Long userId,
		@RequestParam Long paceId
	) {
		return ApiResponse.success(queueService.getStatus(userId, paceId));
	}

	@ApiLog
	@DeleteMapping("/leave")
	public ApiResponse<Void> leave(
		@RequestHeader("X-User-Id") Long userId,
		@RequestParam Long paceId
	) {
		queueService.leave(userId, paceId);
		return ApiResponse.success();
	}

	/**
	 * [데모] 테스트 사용자(가짜 대기자) 주입 — 대기열 부하 시연용.
	 * 로그인 사용자만 호출 가능(X-User-Id 필수).
	 */
	@ApiLog
	@PostMapping("/demo/seed")
	public ApiResponse<QueueSeedResponse> seedTestUsers(
		@RequestHeader("X-User-Id") Long userId,
		@Valid @RequestBody QueueSeedRequest request
	) {
		return ApiResponse.success(queueService.seedTestUsers(request.paceId(), request.count()));
	}
}
