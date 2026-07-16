package com.kt.onrace.domain.loadtest.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kt.onrace.common.logging.annotation.ApiLog;
import com.kt.onrace.common.response.ApiResponse;
import com.kt.onrace.domain.loadtest.dto.LoadTestConfirmRequest;
import com.kt.onrace.domain.loadtest.dto.LoadTestSetupRequest;
import com.kt.onrace.domain.loadtest.dto.LoadTestSetupResponse;
import com.kt.onrace.domain.loadtest.dto.LoadTestStockSummaryResponse;
import com.kt.onrace.domain.loadtest.service.LoadTestService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * 부하테스트 데이터 셋업 API
 */
@ApiLog
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/load-test")
public class LoadTestController {

	private final LoadTestService loadTestService;

	/**
	 * 부하테스트 전체 데이터 셋업
	 * - 유저 3만명 (멱등)
	 * - 이벤트 3개 + 코스 + 페이스 + 재고 + 판매정보 (삭제 후 재등록)
	 * - Redis flushDB + 재고 초기화 + 대기열 활성화
	 */
	@PostMapping("/setup")
	public ApiResponse<LoadTestSetupResponse> setup(
		@RequestBody @Valid LoadTestSetupRequest request
	) {
		return ApiResponse.success(loadTestService.setup(request));
	}

	/**
	 * 테스트 전용 예약 확정 (Toss 결제 우회)
	 * JDBC Atomic UPDATE로 RESERVED → APPLIED 상태 전환 + 재고 확정 처리
	 */
	@PostMapping("/confirm-reservation")
	public ApiResponse<Void> confirmReservation(
		@RequestHeader("X-User-Id") Long userId,
		@RequestBody @Valid LoadTestConfirmRequest request
	) {
		loadTestService.confirmReservation(userId, request.paceId());
		return ApiResponse.success(null);
	}

	/**
	 * 재고 검증 리포트 (DB vs Redis 비교)
	 * teardown 단계에서 호출하여 오버셀링/데이터 정합성 검증
	 */
	@GetMapping("/stock-summary")
	public ApiResponse<LoadTestStockSummaryResponse> getStockSummary(
		@RequestParam Long eventId
	) {
		return ApiResponse.success(loadTestService.getStockSummary(eventId));
	}
}
