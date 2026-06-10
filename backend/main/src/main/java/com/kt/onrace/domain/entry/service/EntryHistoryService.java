package com.kt.onrace.domain.entry.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.common.logging.annotation.ServiceLog;
import com.kt.onrace.domain.entry.dto.EntryHistoryResponse;
import com.kt.onrace.domain.entry.repository.EntryRepository;
import com.kt.onrace.domain.event.entity.Event;
import com.kt.onrace.domain.event.entity.EventImage;
import com.kt.onrace.domain.event.entity.EventImageType;

import lombok.RequiredArgsConstructor;

/**
 * 마이페이지 "내 신청 내역" 조회 서비스.
 * Entry 도메인 조회(읽기 전용)만 담당한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EntryHistoryService {

	private final EntryRepository entryRepository;

	@ServiceLog
	public List<EntryHistoryResponse> getMyEntries(Long userId) {
		return entryRepository.findMyEntries(userId).stream()
			.map(entry -> EntryHistoryResponse.from(entry, extractThumbnailUrl(entry.getEvent())))
			.toList();
	}

	// 이벤트 썸네일 추출(THUMBNAIL 타입 중 sort 우선) — OrderService 와 동일 규칙
	private String extractThumbnailUrl(Event event) {
		return event.getImages().stream()
			.filter(image -> image.getType() == EventImageType.THUMBNAIL)
			.sorted(Comparator.comparingInt(EventImage::getSort))
			.map(EventImage::getUrl)
			.findFirst()
			.orElse(null);
	}
}
