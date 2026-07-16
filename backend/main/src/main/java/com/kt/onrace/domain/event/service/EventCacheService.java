package com.kt.onrace.domain.event.service;

import java.time.Duration;

import org.springframework.stereotype.Service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.kt.onrace.common.exception.BusinessErrorCode;
import com.kt.onrace.domain.event.entity.Event;
import com.kt.onrace.domain.event.entity.EventCourse;
import com.kt.onrace.domain.event.entity.EventPace;
import com.kt.onrace.domain.event.repository.EventCourseRepository;
import com.kt.onrace.domain.event.repository.EventPaceRepository;
import com.kt.onrace.domain.event.repository.EventRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class EventCacheService {

	private final EventRepository eventRepository;
	private final EventCourseRepository eventCourseRepository;
	private final EventPaceRepository eventPaceRepository;

	private final Cache<Long, Event> eventCache;
	private final Cache<String, EventCourse> courseCache;
	private final Cache<String, EventPace> paceCache;

	public EventCacheService(EventRepository eventRepository,
		EventCourseRepository eventCourseRepository,
		EventPaceRepository eventPaceRepository) {
		this.eventRepository = eventRepository;
		this.eventCourseRepository = eventCourseRepository;
		this.eventPaceRepository = eventPaceRepository;

		this.eventCache = Caffeine.newBuilder()
			.maximumSize(200)
			.expireAfterWrite(Duration.ofSeconds(30))
			.build();

		this.courseCache = Caffeine.newBuilder()
			.maximumSize(200)
			.expireAfterWrite(Duration.ofSeconds(30))
			.build();

		this.paceCache = Caffeine.newBuilder()
			.maximumSize(200)
			.expireAfterWrite(Duration.ofSeconds(30))
			.build();
	}

	public Event getEvent(Long eventId) {
		return eventCache.get(eventId, id ->
			eventRepository.findByIdAndIsViewTrueAndIsDeletedFalseOrThrow(id, BusinessErrorCode.EVENT_NOT_FOUND));
	}

	public EventCourse getCourse(Long courseId, Long eventId) {
		String key = eventId + ":" + courseId;
		return courseCache.get(key, k ->
			eventCourseRepository.findByIdAndEventIdOrThrow(courseId, eventId,
				BusinessErrorCode.ENTRY_COURSE_NOT_FOUND));
	}

	public EventPace getPace(Long paceId, Long courseId) {
		String key = courseId + ":" + paceId;
		return paceCache.get(key, k ->
			eventPaceRepository.findByIdAndEventCourseIdOrThrow(paceId, courseId,
				BusinessErrorCode.ENTRY_PACE_NOT_FOUND));
	}
}
