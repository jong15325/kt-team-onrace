package com.kt.onrace.domain.entry.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.common.logging.annotation.ServiceLog;
import com.kt.onrace.domain.entry.entity.Entry;
import com.kt.onrace.domain.entry.repository.EntryRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EntryCleanupService {

	private final EntryRepository entryRepository;

	/**
	 * 선점(reservation) TTL 만료 시 호출.
	 * RESERVED(미결제) 상태의 신청이면 삭제하고 true 반환 → 호출부가 재고를 복원한다.
	 * (RESERVED 가 아니면 결제 완료/취소 등으로 이미 정리된 것이므로 아무것도 하지 않음)
	 */
	@ServiceLog
	public boolean cleanupExpiredEntry(Long userId, Long paceId) {
		return entryRepository.findByUserIdAndEventPaceId(userId, paceId)
			.filter(Entry::isReserved)
			.map(entry -> {
				entryRepository.delete(entry);
				return true;
			})
			.orElse(false);
	}
}
