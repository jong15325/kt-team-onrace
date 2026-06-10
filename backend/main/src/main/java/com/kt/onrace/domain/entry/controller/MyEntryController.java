package com.kt.onrace.domain.entry.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kt.onrace.common.logging.annotation.ApiLog;
import com.kt.onrace.common.response.ApiResponse;
import com.kt.onrace.domain.entry.dto.EntryHistoryResponse;
import com.kt.onrace.domain.entry.service.EntryHistoryService;

import lombok.RequiredArgsConstructor;

/**
 * 마이페이지 신청 내역(사용자 단위) 조회 컨트롤러.
 * 이벤트 스코프인 EntryController 와 분리한다.
 */
@ApiLog
@RestController
@RequiredArgsConstructor
@RequestMapping("/entries")
public class MyEntryController {

	private final EntryHistoryService entryHistoryService;

	@GetMapping("/my")
	public ApiResponse<List<EntryHistoryResponse>> getMyEntries(
		@RequestHeader("X-User-Id") Long userId
	) {
		return ApiResponse.success(entryHistoryService.getMyEntries(userId));
	}
}
