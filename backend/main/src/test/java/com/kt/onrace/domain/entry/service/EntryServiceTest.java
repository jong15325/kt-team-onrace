package com.kt.onrace.domain.entry.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.kt.onrace.common.exception.BusinessErrorCode;
import com.kt.onrace.common.exception.BusinessException;
import com.kt.onrace.domain.entry.config.EntryProperties;
import com.kt.onrace.domain.entry.dto.EntryApplyResponse;
import com.kt.onrace.domain.entry.dto.EntryCoursePaceRequest;
import com.kt.onrace.domain.entry.dto.EntryStockCheckResponse;
import com.kt.onrace.domain.entry.entity.Entry;
import com.kt.onrace.domain.entry.entity.EntryStatus;
import com.kt.onrace.domain.entry.entity.EntryStockStatus;
import com.kt.onrace.domain.entry.repository.EntryRepository;
import com.kt.onrace.domain.event.entity.Event;
import com.kt.onrace.domain.event.entity.EventAppType;
import com.kt.onrace.domain.event.entity.EventCourse;
import com.kt.onrace.domain.event.entity.EventPace;
import com.kt.onrace.domain.event.entity.EventRegion;
import com.kt.onrace.domain.event.entity.EventType;
import com.kt.onrace.domain.event.event.StockConfirmEvent;
import com.kt.onrace.domain.event.repository.EventCourseRepository;
import com.kt.onrace.domain.event.repository.EventPaceRepository;
import com.kt.onrace.domain.event.repository.EventRepository;
import com.kt.onrace.domain.event.repository.EventStockRepository;
import com.kt.onrace.domain.event.service.EventCacheService;
import com.kt.onrace.domain.event.service.EventStockService;
import com.kt.onrace.domain.member.repository.MemberRepository;

@ExtendWith(MockitoExtension.class)
class EntryServiceTest {

	private static final Long USER_ID = 1L;
	private static final Long EVENT_ID = 7L;
	private static final Long COURSE_ID = 15L;
	private static final Long PACE_ID = 26L;

	@Mock private EntryProperties entryProperties;
	@Mock private EventRepository eventRepository;
	@Mock private EventCourseRepository eventCourseRepository;
	@Mock private EntryRepository entryRepository;
	@Mock private EventPaceRepository eventPaceRepository;
	@Mock private MemberRepository memberRepository;
	@Mock private EventStockService eventStockService;
	@Mock private EventStockRepository eventStockRepository;
	@Mock private EntryMetrics entryMetrics;
	@Mock private EventCacheService eventCacheService;
	@Mock private EntryPersistService entryPersistService;
	@Mock private ApplicationEventPublisher eventPublisher;

	@InjectMocks
	private EntryService entryService;

	@Captor
	private ArgumentCaptor<Entry> entryCaptor;

	// ===== checkStock =====

	@Test
	@DisplayName("임시 재고가 남아있으면 AVAILABLE을 반환한다")
	void checkStock_available() {
		when(eventStockService.getTempStock(PACE_ID)).thenReturn(5L);

		EntryStockCheckResponse response = entryService.checkStock(PACE_ID);

		assertThat(response.stockStatus()).isEqualTo(EntryStockStatus.AVAILABLE);
		assertThat(response.remainingStock()).isEqualTo(5L);
	}

	@Test
	@DisplayName("임시 재고는 없지만 확정 재고가 총 재고 미만이면 TEMP_SOLD_OUT을 반환한다")
	void checkStock_tempSoldOut() {
		when(eventStockService.getTempStock(PACE_ID)).thenReturn(0L);
		when(eventStockService.getTotalStock(PACE_ID)).thenReturn(10L);
		when(eventStockService.getConfirmStock(PACE_ID)).thenReturn(5L);

		EntryStockCheckResponse response = entryService.checkStock(PACE_ID);

		assertThat(response.stockStatus()).isEqualTo(EntryStockStatus.TEMP_SOLD_OUT);
		assertThat(response.remainingStock()).isEqualTo(0L);
	}

	@Test
	@DisplayName("확정 재고가 총 재고 이상이면 SOLD_OUT을 반환한다")
	void checkStock_soldOut() {
		when(eventStockService.getTempStock(PACE_ID)).thenReturn(0L);
		when(eventStockService.getTotalStock(PACE_ID)).thenReturn(10L);
		when(eventStockService.getConfirmStock(PACE_ID)).thenReturn(10L);

		EntryStockCheckResponse response = entryService.checkStock(PACE_ID);

		assertThat(response.stockStatus()).isEqualTo(EntryStockStatus.SOLD_OUT);
		assertThat(response.remainingStock()).isEqualTo(0L);
	}

	// ===== apply =====

	@Test
	@DisplayName("응모(LOTTERY) 신청 시 APPLIED 상태의 엔트리가 생성된다")
	void apply_lotteryCreatesAppliedEntry() {
		Event event = createEvent(EventAppType.LOTTERY);
		setId(event, EVENT_ID);
		EventCourse course = createCourse();
		EventPace pace = createPace(course);
		setId(pace, PACE_ID);

		Entry appliedEntry = Entry.builder()
			.userId(USER_ID).event(event).eventCourse(course).eventPace(pace)
			.status(EntryStatus.APPLIED).build();

		stubCommonApplyDependencies(event, course, pace);
		when(entryPersistService.applyLotteryEntry(USER_ID, event, course, pace)).thenReturn(appliedEntry);

		EntryCoursePaceRequest request = new EntryCoursePaceRequest(COURSE_ID, PACE_ID);
		EntryApplyResponse response = entryService.apply(USER_ID, EVENT_ID, request, null, EventAppType.LOTTERY);

		verify(entryPersistService).applyLotteryEntry(USER_ID, event, course, pace);
		assertThat(response.status()).isEqualTo(EntryStatus.APPLIED.getDescription());
	}

	@Test
	@DisplayName("선착순(FIRST_COME) 신청 성공 시 RESERVED 상태의 엔트리가 생성된다")
	void apply_firstComeCreatesReservedEntry() {
		Event event = createEvent(EventAppType.FIRST_COME);
		setId(event, EVENT_ID);
		EventCourse course = createCourse();
		EventPace pace = createPace(course);
		setId(pace, PACE_ID);

		Entry reservedEntry = Entry.builder()
			.userId(USER_ID).event(event).eventCourse(course).eventPace(pace)
			.status(EntryStatus.RESERVED).build();

		stubCommonApplyDependencies(event, course, pace);
		when(eventStockService.tryReserveStock(PACE_ID, USER_ID)).thenReturn(1L);
		when(entryProperties.getTtlSeconds()).thenReturn(600L);
		when(entryPersistService.reserveFirstComeEntry(USER_ID, event, course, pace)).thenReturn(reservedEntry);

		EntryCoursePaceRequest request = new EntryCoursePaceRequest(COURSE_ID, PACE_ID);
		EntryApplyResponse response = entryService.apply(USER_ID, EVENT_ID, request, null, EventAppType.FIRST_COME);

		verify(entryPersistService).reserveFirstComeEntry(USER_ID, event, course, pace);
		assertThat(response.status()).isEqualTo(EntryStatus.RESERVED.getDescription());
		assertThat(response.reservedUntil()).isNotNull();
	}

	@Test
	@DisplayName("선착순 신청 시 재고 소진이면 ENTRY_SOLD_OUT 예외가 발생한다")
	void apply_firstComeSoldOut() {
		Event event = createEvent(EventAppType.FIRST_COME);
		setId(event, EVENT_ID);
		EventCourse course = createCourse();
		EventPace pace = createPace(course);
		setId(pace, PACE_ID);

		stubCommonApplyDependencies(event, course, pace);
		when(eventStockService.tryReserveStock(PACE_ID, USER_ID)).thenReturn(-1L);

		EntryCoursePaceRequest request = new EntryCoursePaceRequest(COURSE_ID, PACE_ID);

		assertThatThrownBy(() -> entryService.apply(USER_ID, EVENT_ID, request, null, EventAppType.FIRST_COME))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(BusinessErrorCode.ENTRY_SOLD_OUT);
	}

	@Test
	@DisplayName("선착순 신청 시 이미 예약된 사용자면 ENTRY_ALREADY_RESERVED 예외가 발생한다")
	void apply_firstComeAlreadyReserved() {
		Event event = createEvent(EventAppType.FIRST_COME);
		setId(event, EVENT_ID);
		EventCourse course = createCourse();
		EventPace pace = createPace(course);
		setId(pace, PACE_ID);

		stubCommonApplyDependencies(event, course, pace);
		when(eventStockService.tryReserveStock(PACE_ID, USER_ID)).thenReturn(-2L);
		when(eventStockService.getReservationTtl(PACE_ID, USER_ID)).thenReturn(-2L);

		EntryCoursePaceRequest request = new EntryCoursePaceRequest(COURSE_ID, PACE_ID);

		assertThatThrownBy(() -> entryService.apply(USER_ID, EVENT_ID, request, null, EventAppType.FIRST_COME))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(BusinessErrorCode.ENTRY_ALREADY_RESERVED);
	}

	@Test
	@DisplayName("선착순 신청 시 Redis에 활성 예약이 있으면 기존 예약 정보를 반환한다")
	void apply_firstComeReservedWithActiveReservation() {
		Event event = createEvent(EventAppType.FIRST_COME);
		setId(event, EVENT_ID);
		EventCourse course = createCourse();
		EventPace pace = createPace(course);
		setId(pace, PACE_ID);

		Entry existingEntry = Entry.builder()
			.userId(USER_ID)
			.event(event)
			.eventCourse(course)
			.eventPace(pace)
			.status(EntryStatus.RESERVED)
			.build();

		stubCommonApplyDependencies(event, course, pace);
		when(eventStockService.tryReserveStock(PACE_ID, USER_ID)).thenReturn(-2L);
		when(eventStockService.getReservationTtl(PACE_ID, USER_ID)).thenReturn(300_000L);
		when(entryRepository.findByUserIdAndEventId(USER_ID, EVENT_ID))
			.thenReturn(Optional.of(existingEntry));

		EntryCoursePaceRequest request = new EntryCoursePaceRequest(COURSE_ID, PACE_ID);
		EntryApplyResponse response = entryService.apply(USER_ID, EVENT_ID, request, null, EventAppType.FIRST_COME);

		assertThat(response.status()).isEqualTo(EntryStatus.RESERVED.getDescription());
		assertThat(response.reservedUntil()).isNotNull();
		verify(entryPersistService, never()).reserveFirstComeEntry(any(), any(), any(), any());
	}

	@Test
	@DisplayName("선착순 신청 시 Redis 예약 만료 후 재신청에 성공한다")
	void apply_firstComeReservedWithExpiredReservation() {
		Event event = createEvent(EventAppType.FIRST_COME);
		setId(event, EVENT_ID);
		EventCourse course = createCourse();
		EventPace pace = createPace(course);
		setId(pace, PACE_ID);

		Entry reservedEntry = Entry.builder()
			.userId(USER_ID).event(event).eventCourse(course).eventPace(pace)
			.status(EntryStatus.RESERVED).build();

		stubCommonApplyDependencies(event, course, pace);
		when(eventStockService.tryReserveStock(PACE_ID, USER_ID)).thenReturn(1L);
		when(entryProperties.getTtlSeconds()).thenReturn(600L);
		when(entryPersistService.reserveFirstComeEntry(USER_ID, event, course, pace)).thenReturn(reservedEntry);

		EntryCoursePaceRequest request = new EntryCoursePaceRequest(COURSE_ID, PACE_ID);
		EntryApplyResponse response = entryService.apply(USER_ID, EVENT_ID, request, null, EventAppType.FIRST_COME);

		verify(entryPersistService).reserveFirstComeEntry(USER_ID, event, course, pace);
		assertThat(response.status()).isEqualTo(EntryStatus.RESERVED.getDescription());
		assertThat(response.reservedUntil()).isNotNull();
	}

	@Test
	@DisplayName("대기열 토큰의 paceId와 요청 paceId가 불일치하면 예외가 발생한다")
	void apply_queuePaceIdMismatch() {
		EntryCoursePaceRequest request = new EntryCoursePaceRequest(COURSE_ID, PACE_ID);
		Long wrongQueuePaceId = 99L;

		assertThatThrownBy(() -> entryService.apply(USER_ID, EVENT_ID, request, wrongQueuePaceId, EventAppType.FIRST_COME))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(BusinessErrorCode.ENTRY_QUEUE_PACE_MISMATCH);
	}

	// ===== confirmReservation =====

	@Test
	@DisplayName("결제 확정 시 엔트리가 APPLIED로 전환되고 Redis 재고가 갱신된다")
	void confirmReservation_success() {
		Entry entry = Entry.builder()
			.userId(USER_ID)
			.status(EntryStatus.RESERVED)
			.build();

		when(entryRepository.findByUserIdAndEventPaceId(USER_ID, PACE_ID)).thenReturn(Optional.of(entry));
		when(eventStockService.hasReservation(PACE_ID, USER_ID)).thenReturn(true);

		entryService.confirmReservation(USER_ID, PACE_ID, EventAppType.FIRST_COME);

		assertThat(entry.getStatus()).isEqualTo(EntryStatus.APPLIED);
		verify(eventStockRepository).incrementConfirmedStock(PACE_ID);
		verify(entryMetrics).recordConfirm("FIRST_COME");
		verify(eventPublisher).publishEvent(new StockConfirmEvent(PACE_ID, USER_ID));
	}

	@Test
	@DisplayName("결제 확정 시 엔트리가 존재하지 않으면 예외가 발생한다")
	void confirmReservation_notFound() {
		when(entryRepository.findByUserIdAndEventPaceId(USER_ID, PACE_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> entryService.confirmReservation(USER_ID, PACE_ID, EventAppType.FIRST_COME))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(BusinessErrorCode.ENTRY_NOT_FOUND);
	}

	@Test
	@DisplayName("결제 확정 시 엔트리가 RESERVED 상태가 아니면 예외가 발생한다")
	void confirmReservation_notReserved() {
		Entry entry = Entry.builder()
			.userId(USER_ID)
			.status(EntryStatus.APPLIED)
			.build();

		when(entryRepository.findByUserIdAndEventPaceId(USER_ID, PACE_ID)).thenReturn(Optional.of(entry));

		assertThatThrownBy(() -> entryService.confirmReservation(USER_ID, PACE_ID, EventAppType.FIRST_COME))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(BusinessErrorCode.ENTRY_CANNOT_APPLY);
	}

	@Test
	@DisplayName("결제 확정 시 Redis 예약이 만료되었으면 예외가 발생한다")
	void confirmReservation_reservationExpired() {
		Entry entry = Entry.builder()
			.userId(USER_ID)
			.status(EntryStatus.RESERVED)
			.build();

		when(entryRepository.findByUserIdAndEventPaceId(USER_ID, PACE_ID)).thenReturn(Optional.of(entry));
		when(eventStockService.hasReservation(PACE_ID, USER_ID)).thenReturn(false);

		assertThatThrownBy(() -> entryService.confirmReservation(USER_ID, PACE_ID, EventAppType.FIRST_COME))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(BusinessErrorCode.ENTRY_RESERVATION_EXPIRED);
	}

	// ===== helpers =====

	private void stubCommonApplyDependencies(Event event, EventCourse course, EventPace pace) {
		when(eventCacheService.getEvent(EVENT_ID)).thenReturn(event);
		when(eventCacheService.getCourse(COURSE_ID, EVENT_ID)).thenReturn(course);
		when(eventCacheService.getPace(PACE_ID, COURSE_ID)).thenReturn(pace);
	}

	private Event createEvent(EventAppType appType) {
		return Event.builder()
			.title("테스트 이벤트")
			.type(EventType.MARATHON)
			.appType(appType)
			.eventAt(LocalDateTime.now().plusDays(30))
			.appStartAt(LocalDateTime.now().minusDays(1))
			.appEndAt(LocalDateTime.now().plusDays(7))
			.region(EventRegion.SEOUL)
			.venue("테스트 장소")
			.isView(true)
			.soldOut(false)
			.build();
	}

	private EventCourse createCourse() {
		return EventCourse.builder()
			.name("10km 코스")
			.courseRoute("테스트 코스 경로")
			.distanceMeter(10000)
			.timeLimit(120)
			.waterSource(3)
			.altitude(100)
			.price(25000)
			.build();
	}

	private EventPace createPace(EventCourse course) {
		return EventPace.builder()
			.eventCourse(course)
			.name("B그룹")
			.capacity(10)
			.build();
	}

	private void setId(Object target, Long id) {
		try {
			Field field = target.getClass().getSuperclass().getDeclaredField("id");
			field.setAccessible(true);
			field.set(target, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}
