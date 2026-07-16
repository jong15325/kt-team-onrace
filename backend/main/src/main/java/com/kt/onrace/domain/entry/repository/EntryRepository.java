package com.kt.onrace.domain.entry.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kt.onrace.common.exception.BusinessException;
import com.kt.onrace.common.exception.ErrorCode;
import com.kt.onrace.domain.entry.entity.Entry;

public interface EntryRepository extends JpaRepository<Entry, Long>, EntryRepositoryCustom {

	default Entry findByIdOrThrow(Long id, ErrorCode errorCode) {
		return findById(id).orElseThrow(() -> new BusinessException(errorCode));
	}

	default Entry findByUserIdAndEventIdOrThrow(Long userId, Long eventId, ErrorCode errorCode) {
		return findByUserIdAndEventId(userId, eventId).orElseThrow(() -> new BusinessException(errorCode));
	}

	default Entry findByUserIdAndEventPaceIdOrThrow(Long userId, Long eventPaceId, ErrorCode errorCode) {
		return findByUserIdAndEventPaceId(userId, eventPaceId).orElseThrow(() -> new BusinessException(errorCode));
	}

	Optional<Entry> findByUserIdAndEventId(Long userId, Long eventId);

	void deleteByUserIdAndEventId(Long userId, Long eventId);

	// [데모/관리] 이벤트의 모든 신청 삭제 → 삭제 건수 반환
	long deleteByEventId(Long eventId);

	Optional<Entry> findByUserIdAndEventPaceId(Long userId, Long eventPaceId);
}
