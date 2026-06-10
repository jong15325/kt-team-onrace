package com.kt.onrace.domain.entry.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.common.exception.BusinessErrorCode;
import com.kt.onrace.common.exception.BusinessException;
import com.kt.onrace.common.logging.annotation.ServiceLog;
import com.kt.onrace.common.util.Preconditions;
import com.kt.onrace.domain.entry.dto.EntryStockCheckResponse;
import com.kt.onrace.domain.entry.config.EntryProperties;
import com.kt.onrace.domain.entry.dto.EntryApplyResponse;
import com.kt.onrace.domain.entry.dto.EntryCountResult;
import com.kt.onrace.domain.entry.dto.EntryCoursePaceRequest;
import com.kt.onrace.domain.entry.dto.EntryOverviewResponse;
import com.kt.onrace.domain.entry.dto.EntryPreSaveResponse;
import com.kt.onrace.domain.entry.dto.EntryRateResponse;
import com.kt.onrace.domain.entry.entity.Entry;
import com.kt.onrace.domain.entry.entity.EntryStatus;
import com.kt.onrace.domain.entry.repository.EntryRepository;
import com.kt.onrace.domain.event.entity.Event;
import com.kt.onrace.domain.event.entity.EventAppType;
import com.kt.onrace.domain.event.entity.EventCourse;
import com.kt.onrace.domain.event.entity.EventPace;
import com.kt.onrace.domain.event.entity.EventStatus;
import com.kt.onrace.domain.event.event.StockConfirmEvent;
import com.kt.onrace.domain.event.repository.EventCourseRepository;
import com.kt.onrace.domain.event.repository.EventPaceRepository;
import com.kt.onrace.domain.event.repository.EventRepository;
import com.kt.onrace.domain.event.repository.EventStockRepository;
import com.kt.onrace.domain.event.service.EventCacheService;
import com.kt.onrace.domain.event.service.EventStockService;
import com.kt.onrace.domain.member.repository.MemberRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EntryService {

	private final EntryProperties entryProperties;
	private final EventRepository eventRepository;
	private final EventCourseRepository eventCourseRepository;
	private final EntryRepository entryRepository;
	private final EventPaceRepository eventPaceRepository;
	private final MemberRepository memberRepository;
	private final EventStockService eventStockService;
	private final EventStockRepository eventStockRepository;
	private final EntryMetrics entryMetrics;
	private final EventCacheService eventCacheService;
	private final EntryPersistService entryPersistService;
	private final ApplicationEventPublisher eventPublisher;

	@ServiceLog(slowMs = 2000)
	@Transactional
	public EntryPreSaveResponse savePreSave(Long userId, Long eventId, EntryCoursePaceRequest request) {
		memberRepository.findByIdAndIsDeletedFalseOrThrow(userId, BusinessErrorCode.MEMBER_NOT_FOUND);

		Event event = eventRepository.findByIdAndIsViewTrueAndIsDeletedFalseOrThrow(eventId,
				BusinessErrorCode.EVENT_NOT_FOUND);

		Preconditions.validate(event.getStatus() == EventStatus.READY, BusinessErrorCode.EVENT_NOT_IN_STANDBY);

		EventCourse course = eventCourseRepository.findByIdAndEventIdOrThrow(request.courseId(), eventId,
				BusinessErrorCode.ENTRY_COURSE_NOT_FOUND);

		EventPace pace = eventPaceRepository.findByIdAndEventCourseIdOrThrow(request.paceId(), request.courseId(),
				BusinessErrorCode.ENTRY_PACE_NOT_FOUND);

		Entry entry = entryRepository.findByUserIdAndEventId(userId, eventId)
				.map(e -> {
					Preconditions.validate(e.getStatus() == EntryStatus.PRE_SAVED,
							BusinessErrorCode.ENTRY_EVENT_NOT_IN_STANDBY);
					e.updatePreSave(course, pace);
					return e;
				})
				.orElseGet(() -> Entry.builder()
						.userId(userId)
						.event(event)
						.eventCourse(course)
						.eventPace(pace)
						.status(EntryStatus.PRE_SAVED)
						.build());

		entryRepository.save(entry);

		log.info("[ENTRY] 사전정보 저장 userId={}, eventId={}, courseId={}, paceId={}", userId, eventId, request.courseId(), request.paceId());

		return EntryPreSaveResponse.from(entry);
	}

	@ServiceLog(slowMs = 2000)
	public EntryOverviewResponse getEntryOverview(Long userId, Long eventId) {
		Event event = eventRepository.findEventWithCoursesAndPacesOrThrow(eventId, BusinessErrorCode.EVENT_NOT_FOUND);

		List<EntryOverviewResponse.CourseOptionDto> courses = event.getCourses().stream()
				.map(EntryOverviewResponse.CourseOptionDto::from)
				.toList();

		// 비로그인 사용자일 경우(코스/페이스 목록만 반환)
		if (userId == null) {
			return EntryOverviewResponse.builder()
					.hasEntry(false)
					.entry(null)
					.courses(courses)
					.rateInfo(null)
					.build();
		}

		// 로그인 사용자(사전정보 조회 포함임)
		return entryRepository.findByUserIdAndEventId(userId, eventId)
				.map(entry -> {
					EntryCountResult counts = entryRepository
							.countTotalAndAppliedByPaceId(entry.getEventPace().getId());

					return EntryOverviewResponse.builder()
							.hasEntry(true)
							.entry(EntryOverviewResponse.EntryDto.from(entry))
							.courses(courses)
							.rateInfo(EntryOverviewResponse.RateInfoDto.of(
									counts.totalCount(), counts.appliedCount(),
									entry.getEventPace().getCapacity(), entry.getEventCourse().getPrice()))
							.build();
				})
				.orElseGet(() -> EntryOverviewResponse.builder()
						.hasEntry(false)
						.entry(null)
						.courses(courses)
						.rateInfo(null)
						.build());
	}

	@ServiceLog(slowMs = 2000)
	public EntryRateResponse getEntryRate(Long eventId, Long courseId, Long paceId) {
		EventPace pace = eventPaceRepository.findWithCourseOrThrow(
				paceId, courseId, eventId, BusinessErrorCode.ENTRY_PACE_NOT_FOUND);

		EntryCountResult counts = entryRepository.countTotalAndAppliedByPaceId(paceId);

		return EntryRateResponse.of(counts.totalCount(), counts.appliedCount(), pace.getCapacity(),
				pace.getEventCourse().getPrice());
	}

	@ServiceLog(slowMs = 2000)
	@Transactional
	public Long deletePreSave(Long userId, Long eventId) {
		memberRepository.findByIdAndIsDeletedFalseOrThrow(userId, BusinessErrorCode.MEMBER_NOT_FOUND);

		Entry entry = entryRepository.findByUserIdAndEventIdOrThrow(userId, eventId, BusinessErrorCode.ENTRY_NOT_FOUND);

		Preconditions.validate(entry.getStatus() == EntryStatus.PRE_SAVED,
				BusinessErrorCode.ENTRY_EVENT_NOT_IN_STANDBY);

		entryRepository.deleteByUserIdAndEventId(userId, eventId);

		log.info("[ENTRY] 사전정보 삭제 userId={}, eventId={}, entryId={}", userId, eventId, entry.getId());

		return entry.getId();
	}

	@ServiceLog(slowMs = 2000)
	@Transactional(propagation = Propagation.NOT_SUPPORTED)
	public EntryApplyResponse apply(Long userId, Long eventId, EntryCoursePaceRequest request,
			Long queuePaceId, EventAppType expectedAppType) {
		if (queuePaceId != null) {
			Preconditions.validate(queuePaceId.equals(request.paceId()), BusinessErrorCode.ENTRY_QUEUE_PACE_MISMATCH);
		}

		Event event = eventCacheService.getEvent(eventId);

		Preconditions.validate(event.getAppType() == expectedAppType, BusinessErrorCode.ENTRY_APP_TYPE_MISMATCH);

		LocalDateTime now = LocalDateTime.now();
		Preconditions.validate(event.getEventAt().isAfter(now), BusinessErrorCode.ENTRY_EVENT_ALREADY_ENDED);
		Preconditions.validate(!now.isBefore(event.getAppStartAt()) && !now.isAfter(event.getAppEndAt()),
				BusinessErrorCode.ENTRY_NOT_IN_PERIOD);

		EventCourse course = eventCacheService.getCourse(request.courseId(), eventId);
		EventPace pace = eventCacheService.getPace(request.paceId(), request.courseId());

		log.info("[ENTRY] 신청 시작 userId={}, eventId={}, appType={}, courseId={}, paceId={}",
			userId, eventId, expectedAppType, request.courseId(), request.paceId());

		return switch (event.getAppType()) {
			case LOTTERY -> applyLottery(userId, event, course, pace);
			case FIRST_COME -> applyFirstCome(userId, event, course, pace);
		};
	}

	private EntryApplyResponse applyLottery(Long userId, Event event, EventCourse course, EventPace pace) {
		Entry entry = entryPersistService.applyLotteryEntry(userId, event, course, pace);
		entryMetrics.recordApply("LOTTERY", "success");

		log.info("[ENTRY] 추첨 신청 완료 userId={}, eventId={}, entryId={}", userId, event.getId(), entry.getId());

		return EntryApplyResponse.from(entry);
	}

	private EntryApplyResponse applyFirstCome(Long userId, Event event, EventCourse course, EventPace pace) {
		// 이미 신청완료(APPLIED)면 재고 차감 전에 차단 → 재고 누수 방지 + 중복 결제 차단
		entryRepository.findByUserIdAndEventId(userId, event.getId())
			.ifPresent(e -> Preconditions.validate(
				e.getStatus() != EntryStatus.APPLIED, BusinessErrorCode.ENTRY_ALREADY_APPLIED));

		long result = eventStockService.tryReserveStock(pace.getId(), userId);

		if (result == -2) {
			// 이미 선점된 사용자 — 활성 예약이면 기존 예약 정보 반환
			long remainingMs = eventStockService.getReservationTtl(pace.getId(), userId);
			if (remainingMs > 0) {
				Entry entry = entryRepository.findByUserIdAndEventId(userId, event.getId())
					.orElseThrow(() -> new BusinessException(BusinessErrorCode.ENTRY_NOT_FOUND));
				return EntryApplyResponse.fromReserved(entry, LocalDateTime.now().plus(Duration.ofMillis(remainingMs)));
			}
			entryMetrics.recordApply("FIRST_COME", "duplicate");
			log.info("[ENTRY] 중복 선점 시도 userId={}, paceId={}", userId, pace.getId());
			throw new BusinessException(BusinessErrorCode.ENTRY_ALREADY_RESERVED);
		}

		if (result == -1) {
			entryMetrics.recordApply("FIRST_COME", "sold_out");
			log.info("[ENTRY] 선착순 매진 userId={}, paceId={}", userId, pace.getId());
			throw new BusinessException(BusinessErrorCode.ENTRY_SOLD_OUT);
		}

		entryMetrics.recordApply("FIRST_COME", "success");
		log.info("[ENTRY] 선착순 선점 성공 userId={}, paceId={}, remaining={}", userId, pace.getId(), result);

		Entry entry = entryPersistService.reserveFirstComeEntry(userId, event, course, pace);
		return EntryApplyResponse.fromReserved(entry, LocalDateTime.now().plusSeconds(entryProperties.getTtlSeconds()));
	}

	@ServiceLog
	public EntryStockCheckResponse checkStock(Long paceId) {
		long available = eventStockService.getTempStock(paceId);

		if(available > 0) {
			EntryStockCheckResponse result = EntryStockCheckResponse.available(available);
			log.debug("[STOCK] 재고 조회 paceId={}, status={}, available={}", paceId, result.stockStatus(), result.remainingStock());
			return result;
		}

		long total = eventStockService.getTotalStock(paceId);
		long confirmed = eventStockService.getConfirmStock(paceId);

		if(confirmed >= total) {
			log.debug("[STOCK] 재고 조회 paceId={}, status=SOLD_OUT, available=0", paceId);
			return EntryStockCheckResponse.soldOut();
		}

		log.debug("[STOCK] 재고 조회 paceId={}, status=TEMP_SOLD_OUT, available=0", paceId);
		return EntryStockCheckResponse.tempSoldOut();
	}

	@ServiceLog(slowMs = 2000)
	@Transactional
	public void confirmReservation(Long userId, Long paceId, EventAppType type) {
		Entry entry = entryRepository.findByUserIdAndEventPaceId(userId, paceId)
				.orElseThrow(() -> new BusinessException(BusinessErrorCode.ENTRY_NOT_FOUND));


		if(type == EventAppType.FIRST_COME) {
			Preconditions.validate(entry.isReserved(), BusinessErrorCode.ENTRY_CANNOT_APPLY);
			Preconditions.validate(eventStockService.hasReservation(paceId, userId),
				BusinessErrorCode.ENTRY_RESERVATION_EXPIRED);

			entry.confirmPayment();
		}

		eventStockRepository.incrementConfirmedStock(paceId);

		entryMetrics.recordConfirm(type.name());
		log.info("[ENTRY] 결제 확정 userId={}, paceId={}, appType={}", userId, paceId, type);

		// TX 커밋 후 Redis 작업 실행 (DB 롤백 시 Redis 불일치 방지)
		if(type == EventAppType.FIRST_COME) {
			eventPublisher.publishEvent(new StockConfirmEvent(paceId, userId));
		}
	}

}
