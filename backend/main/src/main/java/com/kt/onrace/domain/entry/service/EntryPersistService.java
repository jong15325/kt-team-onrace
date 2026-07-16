package com.kt.onrace.domain.entry.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.common.exception.BusinessErrorCode;
import com.kt.onrace.common.util.Preconditions;
import com.kt.onrace.domain.entry.entity.Entry;
import com.kt.onrace.domain.entry.entity.EntryStatus;
import com.kt.onrace.domain.entry.repository.EntryRepository;
import com.kt.onrace.domain.event.entity.Event;
import com.kt.onrace.domain.event.entity.EventCourse;
import com.kt.onrace.domain.event.entity.EventPace;

import lombok.RequiredArgsConstructor;

// Entry 영속화 전용 서비스
// DB 쓰기 작업만 분리
@Service
@RequiredArgsConstructor
public class EntryPersistService {

	private final EntryRepository entryRepository;

	@Transactional
	public Entry applyLotteryEntry(Long userId, Event event, EventCourse course, EventPace pace) {
		Entry entry = findOrCreateEntry(userId, event);
		entry.apply(course, pace);
		return entryRepository.save(entry);
	}

	@Transactional
	public Entry reserveFirstComeEntry(Long userId, Event event, EventCourse course, EventPace pace) {
		Entry entry = findOrCreateEntry(userId, event);
		entry.reserve(course, pace);
		return entryRepository.save(entry);
	}

	private Entry findOrCreateEntry(Long userId, Event event) {
		return entryRepository.findByUserIdAndEventId(userId, event.getId())
			.map(e -> {
				Preconditions.validate(e.getStatus() != EntryStatus.APPLIED,
					BusinessErrorCode.ENTRY_ALREADY_APPLIED);
				Preconditions.validate(
					e.getStatus() == EntryStatus.RESERVED || e.getStatus() == EntryStatus.PRE_SAVED,
					BusinessErrorCode.ENTRY_CANNOT_APPLY);
				return e;
			})
			.orElseGet(() -> Entry.builder()
				.userId(userId)
				.event(event)
				.build());
	}
}
