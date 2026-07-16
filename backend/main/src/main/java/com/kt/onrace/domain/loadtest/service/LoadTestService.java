package com.kt.onrace.domain.loadtest.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.redisson.api.RedissonClient;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.domain.entry.service.EntryService;
import com.kt.onrace.domain.event.entity.EventAppType;
import com.kt.onrace.domain.event.service.EventService;
import com.kt.onrace.domain.event.service.EventStockInitializer;
import com.kt.onrace.domain.loadtest.dto.LoadTestSetupRequest;
import com.kt.onrace.domain.loadtest.dto.LoadTestSetupResponse;
import com.kt.onrace.domain.loadtest.dto.LoadTestStockSummaryResponse;
import com.kt.onrace.domain.loadtest.dto.LoadTestStockSummaryResponse.PaceDetail;
import com.kt.onrace.domain.loadtest.dto.LoadTestSetupResponse.PaceMapEntry;
import com.kt.onrace.domain.loadtest.dto.LoadTestSetupResponse.PaceRef;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 부하테스트 데이터 자동 셋업 서비스
 * 모든 ID는 auto_increment — 환경에 무관하게 동작
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoadTestService {

	private final JdbcTemplate jdbcTemplate;
	private final RedissonClient redissonClient;
	private final EventStockInitializer eventStockInitializer;
	private final EventService eventService;
	private final EntryService entryService;
	private static final int TOTAL_USERS = 30000;
	private static final int TOTAL_PACES = 15; // 코스 3개 x 페이스 5개
	private static final String BCRYPT_HASH = "$2a$10$HWNLFZOjTELM0EaGC14xCeXLBC4RhgmlctVcED4/8MCM8KQ9y4xQS";
	private static final String TEST_EVENT_PREFIX = "k6 부하테스트";
	private static final String SCENARIO_LOTTERY = "LOTTERY";
	private static final String SCENARIO_FC_NO_QUEUE = "FIRST_COME_NO_QUEUE";
	private static final String SCENARIO_FC_WITH_QUEUE = "FIRST_COME_WITH_QUEUE";

	// ================================================================
	// 전체 셋업 (단일 API)
	// ================================================================

	@Transactional
	public LoadTestSetupResponse setup(LoadTestSetupRequest request) {
		int totalUsers = request.totalUsers();
		int competitionRatio = request.competitionRatio();
		int hotPaceCount = request.hotPaceCount();
		double hotStockRatio = request.hotStockRatio();

		// HOT 페이스 인덱스 선정 (고정 지정 또는 랜덤) — 재고 계산 전에 결정
		Set<Integer> hotIndices;
		if (request.hotCourseIndex() != null && request.hotPaceIndex() != null) {
			int globalIndex = request.hotCourseIndex() * 5 + request.hotPaceIndex();
			hotIndices = Set.of(globalIndex);
			hotPaceCount = 1; // 고정 지정 시 1개로 오버라이드
			log.debug("[LoadTest] HOT 페이스 고정 지정 — courseIndex={}, paceIndex={}, globalIndex={}",
				request.hotCourseIndex(), request.hotPaceIndex(), globalIndex);
		} else {
			hotIndices = pickRandomHotIndices(hotPaceCount);
		}
		log.debug("[LoadTest] HOT 페이스 인덱스: {}", hotIndices);

		// 재고 산정 (직접 지정 시 해당 값 사용, 미지정 시 자동 계산)
		int totalStock = request.totalStock() != null
			? request.totalStock()
			: Math.max(TOTAL_PACES, totalUsers / competitionRatio);
		int hotTotalStock = (int)(totalStock * hotStockRatio);
		int otherTotalStock = totalStock - hotTotalStock;
		int hotStockEach = Math.max(1, hotTotalStock / hotPaceCount);
		int hotRemainder = hotTotalStock - hotStockEach * hotPaceCount;          // 정수 나눗셈 나머지 보정
		int otherPaceCount = TOTAL_PACES - hotPaceCount;
		int otherStockEach = otherPaceCount > 0 ? Math.max(1, otherTotalStock / otherPaceCount) : 0;
		int otherRemainder = otherPaceCount > 0 ? otherTotalStock - otherStockEach * otherPaceCount : 0;  // 나머지 보정

		log.debug("[LoadTest] 셋업 시작 — totalUsers={}, competitionRatio={}, hotPaceCount={}, hotStockRatio={}",
			totalUsers, competitionRatio, hotPaceCount, hotStockRatio);
		log.debug("[LoadTest] 재고 산정 — totalStock={}, hotStockEach={} x {}개, otherStockEach={} x {}개",
			totalStock, hotStockEach, hotPaceCount, otherStockEach, otherPaceCount);

		// 1. 유저 셋업 (멱등)
		boolean userSkipped = setupUsers();

		// 2. 이전 테스트 entry 삭제 (k6 테스트 유저 기준)
		cleanupEntries();

		// 3. 이벤트 데이터 삭제 (타이틀 기반 조회)
		cleanupEventData();

		// 4. 이벤트 생성 → auto ID 반환 → 코스/페이스/재고/판매정보 연쇄 등록
		//    scenarioType이 지정되면 해당 이벤트만, null이면 전체 3개 생성
		String type = request.scenarioType();
		Map<String, Long> eventIds = new LinkedHashMap<>();
		Map<String, PaceMapEntry> paceMap = new LinkedHashMap<>();

		// 응모
		if (type == null || SCENARIO_LOTTERY.equals(type)) {
			long lotteryId = insertEvent("k6 부하테스트 - 응모신청", "LOTTERY", false, "'2026-12-31 23:59:59'");
			eventIds.put(SCENARIO_LOTTERY, lotteryId);
			paceMap.put(String.valueOf(lotteryId),
				setupCoursesAndPaces(lotteryId, hotIndices, hotStockEach, hotRemainder, otherStockEach, otherRemainder));
			insertSalesInfo(lotteryId, "2026-서울-0001");
		}

		// 선착순 대기열X
		if (type == null || SCENARIO_FC_NO_QUEUE.equals(type)) {
			long fcNoQueueId = insertEvent("k6 부하테스트 - 선착순(대기열X)", "FIRST_COME", false, "NULL");
			eventIds.put(SCENARIO_FC_NO_QUEUE, fcNoQueueId);
			paceMap.put(String.valueOf(fcNoQueueId),
				setupCoursesAndPaces(fcNoQueueId, hotIndices, hotStockEach, hotRemainder, otherStockEach, otherRemainder));
			insertSalesInfo(fcNoQueueId, "2026-서울-0002");
		}

		// 선착순 대기열O
		if (type == null || SCENARIO_FC_WITH_QUEUE.equals(type)) {
			long fcWithQueueId = insertEvent("k6 부하테스트 - 선착순(대기열O)", "FIRST_COME", true, "NULL");
			eventIds.put(SCENARIO_FC_WITH_QUEUE, fcWithQueueId);
			paceMap.put(String.valueOf(fcWithQueueId),
				setupCoursesAndPaces(fcWithQueueId, hotIndices, hotStockEach, hotRemainder, otherStockEach, otherRemainder));
			insertSalesInfo(fcWithQueueId, "2026-서울-0003");
		}

		int actualTotalStock = totalStock * eventIds.size();

		// 5. Redis flushDB → 재고 초기화 → 대기열 활성화 (해당 이벤트만)
		flushRedis();
		for (Long id : eventIds.values()) {
			eventStockInitializer.initializeEventStock(id);
		}
		if (eventIds.containsKey(SCENARIO_FC_WITH_QUEUE)) {
			eventService.enableQueue(eventIds.get(SCENARIO_FC_WITH_QUEUE));
		}

		// 6. 사전정보 저장 (preSaveRatio가 지정된 경우)
		int preSaveCount = 0;
		if (request.preSaveRatio() != null && request.preSaveRatio() > 0) {
			preSaveCount = batchPreSave(request.preSaveRatio(), totalUsers, eventIds, paceMap);
		}

		log.debug("[LoadTest] 셋업 완료 — eventIds={}, totalStock={}, preSaveCount={}", eventIds, actualTotalStock, preSaveCount);

		return LoadTestSetupResponse.builder()
			.userCount(TOTAL_USERS)
			.userSkipped(userSkipped)
			.totalStock(actualTotalStock)
			.redisInitialized(true)
			.eventIds(eventIds)
			.paceMap(paceMap)
			.preSaveCount(preSaveCount)
			.build();
	}

	// ================================================================
	// 테스트 전용 예약 확정 (Toss 결제 우회 — 프로덕션 코드 직접 호출)
	// ================================================================

	public void confirmReservation(Long userId, Long paceId) {
		entryService.confirmReservation(userId, paceId, EventAppType.FIRST_COME);
	}

	// ================================================================
	// 재고 검증 리포트 (DB vs Redis 비교)
	// ================================================================

	@Transactional(readOnly = true)
	public LoadTestStockSummaryResponse getStockSummary(Long eventId) {
		// 1. DB: 페이스별 재고 조회
		List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
			SELECT ep.id AS pace_id, ep.name AS pace_name, ec.name AS course_name,
			       es.total_stock, es.confirmed_stock
			FROM event_pace ep
			JOIN event_course ec ON ep.course_id = ec.id
			JOIN event_stock es ON es.event_pace_id = ep.id
			WHERE ec.event_id = ?
			ORDER BY ec.id, ep.id
			""", eventId);

		int dbTotalStock = 0;
		int dbConfirmedStock = 0;
		long redisRemainingTotal = 0;
		long redisConfirmedTotal = 0;
		boolean allMatch = true;
		boolean overselling = false;

		List<PaceDetail> paceDetails = new ArrayList<>();

		for (Map<String, Object> row : rows) {
			long paceId = ((Number)row.get("pace_id")).longValue();
			int dbTotal = ((Number)row.get("total_stock")).intValue();
			int dbConfirmed = ((Number)row.get("confirmed_stock")).intValue();

			long redisRemaining = redissonClient.getAtomicLong("stock:temp:pace:" + paceId).get();
			long redisConfirmed = redissonClient.getAtomicLong("stock:confirm:pace:" + paceId).get();

			boolean match = dbConfirmed == (int)redisConfirmed;
			if (!match) allMatch = false;
			if (dbConfirmed > dbTotal) overselling = true;

			dbTotalStock += dbTotal;
			dbConfirmedStock += dbConfirmed;
			redisRemainingTotal += redisRemaining;
			redisConfirmedTotal += redisConfirmed;

			paceDetails.add(PaceDetail.builder()
				.paceId(paceId)
				.courseName((String)row.get("course_name"))
				.paceName((String)row.get("pace_name"))
				.dbTotal(dbTotal)
				.dbConfirmed(dbConfirmed)
				.redisRemaining(redisRemaining)
				.redisConfirmed(redisConfirmed)
				.match(match)
				.build());
		}

		// 2. Entry 상태별 카운트
		Map<String, Integer> entryCounts = new LinkedHashMap<>();
		jdbcTemplate.queryForList(
			"SELECT status, COUNT(*) AS cnt FROM entry WHERE event_id = ? GROUP BY status",
			eventId
		).forEach(r -> entryCounts.put(
			(String)r.get("status"),
			((Number)r.get("cnt")).intValue()
		));

		return LoadTestStockSummaryResponse.builder()
			.eventId(eventId)
			.dbTotalStock(dbTotalStock)
			.dbConfirmedStock(dbConfirmedStock)
			.redisRemainingStock(redisRemainingTotal)
			.redisConfirmedStock(redisConfirmedTotal)
			.entryReservedCount(entryCounts.getOrDefault("RESERVED", 0))
			.entryAppliedCount(entryCounts.getOrDefault("APPLIED", 0))
			.entryPreSavedCount(entryCounts.getOrDefault("PRE_SAVED", 0))
			.overselling(overselling)
			.dbRedisMatch(allMatch)
			.paceDetails(paceDetails)
			.build();
	}

	// ================================================================
	// 랜덤 HOT 페이스 인덱스 선정
	// ================================================================

	private Set<Integer> pickRandomHotIndices(int hotPaceCount) {
		List<Integer> allIndices = IntStream.range(0, TOTAL_PACES)
			.boxed()
			.collect(Collectors.toCollection(ArrayList::new));
		Collections.shuffle(allIndices, ThreadLocalRandom.current());
		return new HashSet<>(allIndices.subList(0, hotPaceCount));
	}

	// ================================================================
	// 유저 셋업 (멱등)
	// ================================================================

	private boolean setupUsers() {
		Integer existing = jdbcTemplate.queryForObject(
			"SELECT COUNT(*) FROM user WHERE email LIKE 'k6user%@test.com'",
			Integer.class
		);

		if (existing != null && existing >= TOTAL_USERS) {
			log.debug("[LoadTest] 유저 이미 존재 ({}명), 스킵", existing);
			return true;
		}

		log.debug("[LoadTest] 유저 등록 시작 (기존 {}명 → {}명)", existing, TOTAL_USERS);

		// 기존 부분 데이터 정리
		jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0");
		try {
			jdbcTemplate.update(
				"DELETE FROM term_user WHERE user_id IN (SELECT id FROM user WHERE email LIKE 'k6user%@test.com')");
			jdbcTemplate.update(
				"DELETE FROM members WHERE id IN (SELECT id FROM user WHERE email LIKE 'k6user%@test.com')");
			jdbcTemplate.update("DELETE FROM user WHERE email LIKE 'k6user%@test.com'");
		} finally {
			jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1");
		}

		// CTE 재귀 깊이 설정
		jdbcTemplate.execute("SET SESSION cte_max_recursion_depth = 31000");

		// 유저 생성 (auto_increment ID)
		jdbcTemplate.update("""
			INSERT INTO user (email, name, password, phone_number, gender, birthdate,
			  auth_provider, role, status, verification_status, marketing_consent, is_deleted,
			  created_at, updated_at)
			WITH RECURSIVE seq AS (
			  SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < ?
			)
			SELECT
			  CONCAT('k6user', LPAD(n, 5, '0'), '@test.com'),
			  CONCAT('K6User', LPAD(n, 5, '0')),
			  ?,
			  CONCAT('010', LPAD(n, 8, '0')),
			  IF(MOD(n, 2) = 0, 'MALE', 'FEMALE'),
			  DATE_ADD('1990-01-01', INTERVAL MOD(n, 3650) DAY),
			  'LOCAL', 'USER', 'ACTIVE', 'VERIFIED', 0, 0,
			  NOW(), NOW()
			FROM seq
			""", TOTAL_USERS, BCRYPT_HASH);

		// Members 생성 (user.id 조회 후 등록)
		jdbcTemplate.update("""
			INSERT INTO members (id, is_deleted, created_at, updated_at)
			SELECT id, false, NOW(), NOW()
			FROM user WHERE email LIKE 'k6user%@test.com'
			""");

		// 필수 약관 동의
		jdbcTemplate.update("""
			INSERT INTO term_user (user_id, term_version_id, agreed, agreed_at, created_at, updated_at)
			SELECT u.id, tv.id, 1, NOW(), NOW(), NOW()
			FROM user u
			JOIN term_version tv ON tv.active = 1
			JOIN term_master tm ON tv.term_master_id = tm.id AND tm.required = 1
			WHERE u.email LIKE 'k6user%@test.com'
			""");

		log.debug("[LoadTest] 유저 등록 완료 ({}명)", TOTAL_USERS);
		return false;
	}

	// ================================================================
	// Entry 삭제 (k6 테스트 유저 기준 — 모든 이벤트 대상)
	// ================================================================

	private void cleanupEntries() {
		int deleted = jdbcTemplate.update("""
			DELETE FROM entry
			WHERE user_id IN (SELECT id FROM user WHERE email LIKE 'k6user%@test.com')
			""");
		log.debug("[LoadTest] 이전 테스트 entry 삭제 — {}건", deleted);
	}

	// ================================================================
	// 이벤트 데이터 정리 (타이틀 기반 조회)
	// ================================================================

	private void cleanupEventData() {
		List<Long> eventIds = jdbcTemplate.queryForList(
			"SELECT id FROM event WHERE title LIKE ?", Long.class, TEST_EVENT_PREFIX + "%"
		);

		if (eventIds.isEmpty()) {
			log.debug("[LoadTest] 기존 테스트 이벤트 없음, 정리 스킵");
			return;
		}

		String ids = eventIds.stream().map(String::valueOf).collect(Collectors.joining(","));
		log.debug("[LoadTest] 기존 테스트 이벤트 정리: {}", ids);

		jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0");
		try {
			// entry 삭제
			jdbcTemplate.update("DELETE FROM entry WHERE event_id IN (" + ids + ")");

			// event_stock 삭제 (pace → course → event 조인)
			jdbcTemplate.update("""
				DELETE es FROM event_stock es
				INNER JOIN event_pace ep ON es.event_pace_id = ep.id
				INNER JOIN event_course ec ON ep.course_id = ec.id
				WHERE ec.event_id IN (%s)
				""".formatted(ids));

			// event_pace 삭제
			jdbcTemplate.update("""
				DELETE ep FROM event_pace ep
				INNER JOIN event_course ec ON ep.course_id = ec.id
				WHERE ec.event_id IN (%s)
				""".formatted(ids));

			// 나머지 삭제
			jdbcTemplate.update("DELETE FROM event_sales_info WHERE event_id IN (" + ids + ")");
			jdbcTemplate.update("DELETE FROM event_course WHERE event_id IN (" + ids + ")");
			jdbcTemplate.update("DELETE FROM event WHERE id IN (" + ids + ")");
		} finally {
			jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1");
		}

		log.debug("[LoadTest] 이벤트 데이터 정리 완료");
	}

	// ================================================================
	// 이벤트 생성 (auto ID → LAST_INSERT_ID 반환)
	// ================================================================

	private long insertEvent(String title, String appType, boolean isQueue, String lotteryAnnouncedAt) {
		jdbcTemplate.update("""
			INSERT INTO event (title, type, app_type, event_at, app_start_at, app_end_at,
			  region, venue, lottery_announced_at, notice, is_view, is_deleted, sold_out, is_queue,
			  created_at, updated_at) VALUES
			(?, 'MARATHON', ?,
			  '2026-06-01 08:00:00', '2026-01-01 00:00:00', '2026-12-31 23:59:59',
			  'SEOUL', 'k6 테스트 전용', %s,
			  ?, true, false, false, ?, NOW(), NOW())
			""".formatted(lotteryAnnouncedAt),
			title, appType, "k6 부하테스트용 이벤트", isQueue);

		return jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
	}

	// ================================================================
	// 코스 + 페이스 + 재고 연쇄 등록, paceMap 구축
	// ================================================================

	private PaceMapEntry setupCoursesAndPaces(long eventId, Set<Integer> hotIndices,
		int hotStockEach, int hotRemainder, int otherStockEach, int otherRemainder) {
		// 코스 3개 등록 (풀코스, 하프코스, 10km 순서)
		insertCourses(eventId);
		List<Long> courseIds = jdbcTemplate.queryForList(
			"SELECT id FROM event_course WHERE event_id = ? ORDER BY id", Long.class, eventId);

		String[] courseTypes = {"풀코스", "하프코스", "10km"};
		List<PaceRef> hotPaces = new ArrayList<>();
		List<PaceRef> otherPaces = new ArrayList<>();

		int globalPaceIndex = 0;
		int hotAssigned = 0;    // 나머지 분배 추적용
		int otherAssigned = 0;

		for (int i = 0; i < courseIds.size(); i++) {
			long courseId = courseIds.get(i);

			// 페이스 5개 등록 (capacity = 재고와 동일하게 설정)
			insertPaces(courseId, courseTypes[i]);
			List<Long> paceIds = jdbcTemplate.queryForList(
				"SELECT id FROM event_pace WHERE course_id = ? ORDER BY id", Long.class, courseId);

			// 재고 등록 + paceMap 구축
			for (int j = 0; j < paceIds.size(); j++) {
				long paceId = paceIds.get(j);
				boolean isHot = hotIndices.contains(globalPaceIndex);
				int stock;
				if (isHot) {
					stock = hotStockEach + (hotAssigned < hotRemainder ? 1 : 0);
					hotAssigned++;
				} else {
					stock = otherStockEach + (otherAssigned < otherRemainder ? 1 : 0);
					otherAssigned++;
				}

				insertStock(paceId, stock);
				updatePaceCapacity(paceId, stock);

				PaceRef ref = PaceRef.builder()
					.courseId(courseId)
					.paceId(paceId)
					.stock(stock)
					.build();

				if (isHot) {
					hotPaces.add(ref);
				} else {
					otherPaces.add(ref);
				}

				globalPaceIndex++;
			}
		}

		return PaceMapEntry.builder().hot(hotPaces).others(otherPaces).build();
	}

	private void insertCourses(long eventId) {
		jdbcTemplate.update("""
			INSERT INTO event_course (event_id, name, map_url, distance_meter, price, altitude, course_route, time_limit, water_source, created_at, updated_at) VALUES
			(?, '풀코스', NULL, 42195, 70000, 50, 'k6-test-route', 360, 5, NOW(), NOW()),
			(?, '하프코스', NULL, 21097, 50000, 30, 'k6-test-route', 240, 3, NOW(), NOW()),
			(?, '10km', NULL, 10000, 35000, 20, 'k6-test-route', 120, 2, NOW(), NOW())
			""", eventId, eventId, eventId);
	}

	private void insertPaces(long courseId, String courseType) {
		switch (courseType) {
			case "풀코스" -> jdbcTemplate.update("""
				INSERT INTO event_pace (course_id, name, hour, minutes, capacity, created_at, updated_at) VALUES
				(?, '3분 페이스', 2, 7, 0, NOW(), NOW()),
				(?, '4분 페이스', 2, 49, 0, NOW(), NOW()),
				(?, '5분 페이스', 3, 31, 0, NOW(), NOW()),
				(?, '6분 페이스', 4, 13, 0, NOW(), NOW()),
				(?, '7분 페이스', 4, 55, 0, NOW(), NOW())
				""", courseId, courseId, courseId, courseId, courseId);
			case "하프코스" -> jdbcTemplate.update("""
				INSERT INTO event_pace (course_id, name, hour, minutes, capacity, created_at, updated_at) VALUES
				(?, '3분 페이스', 1, 3, 0, NOW(), NOW()),
				(?, '4분 페이스', 1, 24, 0, NOW(), NOW()),
				(?, '5분 페이스', 1, 45, 0, NOW(), NOW()),
				(?, '6분 페이스', 2, 7, 0, NOW(), NOW()),
				(?, '7분 페이스', 2, 28, 0, NOW(), NOW())
				""", courseId, courseId, courseId, courseId, courseId);
			case "10km" -> jdbcTemplate.update("""
				INSERT INTO event_pace (course_id, name, hour, minutes, capacity, created_at, updated_at) VALUES
				(?, '3분 페이스', 0, 30, 0, NOW(), NOW()),
				(?, '4분 페이스', 0, 40, 0, NOW(), NOW()),
				(?, '5분 페이스', 0, 50, 0, NOW(), NOW()),
				(?, '6분 페이스', 1, 0, 0, NOW(), NOW()),
				(?, '7분 페이스', 1, 10, 0, NOW(), NOW())
				""", courseId, courseId, courseId, courseId, courseId);
			default -> throw new IllegalArgumentException("알 수 없는 코스 타입: " + courseType);
		}
	}

	private void insertStock(long paceId, int stock) {
		jdbcTemplate.update(
			"INSERT INTO event_stock (event_pace_id, total_stock, confirmed_stock, version, created_at, updated_at) VALUES (?, ?, 0, 0, NOW(), NOW())",
			paceId, stock);
	}

	private void updatePaceCapacity(long paceId, int capacity) {
		jdbcTemplate.update("UPDATE event_pace SET capacity = ? WHERE id = ?", capacity, paceId);
	}

	// ================================================================
	// 판매정보 등록
	// ================================================================

	private void insertSalesInfo(long eventId, String ecommerceNo) {
		jdbcTemplate.update("""
			INSERT INTO event_sales_info (
			  event_id, is_refundable, is_transferable, is_ecommerce_mediator,
			  refund_start_at, refund_end_at, non_refundable_at,
			  cancellation_fee, refund_policy, weather_refund,
			  delivery_target, delivery_method, delivery_start_at, delivery_end_at,
			  delivery_fee, delivery_area, delivery_info, address_change_period,
			  delivery_compensation, seller_name, business_no, ecommerce_no,
			  customer_service, seller_address, created_at, updated_at
			) VALUES
			(?, 1, 0, 0,
			 '2026-04-01 00:00:00', '2026-06-30 23:59:59', '2026-07-01 00:00:00',
			 '무료', '대회 7일 전까지 전액 환불', '우천 시 대회 취소 및 전액 환불',
			 '참가자 본인', '택배', '2026-06-01 00:00:00', '2026-06-30 00:00:00',
			 '무료', '전국', '레이스킷 배송', '2026-05-15 00:00:00',
			 '미배송 시 전액 환불', 'KT 온레이스', '000-00-00000', ?,
			 '1588-0000', '서울특별시 중구 테스트로 1', NOW(), NOW())
			""", eventId, ecommerceNo);
	}

	// ================================================================
	// 사전정보 저장 일괄 INSERT (PRE_SAVED 상태)
	// ================================================================

	private int batchPreSave(double preSaveRatio, int totalUsers,
		Map<String, Long> eventIds, Map<String, PaceMapEntry> paceMap) {
		int preSaveCount = (int)(totalUsers * preSaveRatio);
		if (preSaveCount == 0) return 0;

		// k6user 유저 ID 조회 (preSaveCount명)
		List<Long> userIds = jdbcTemplate.queryForList(
			"SELECT id FROM user WHERE email LIKE 'k6user%@test.com' ORDER BY id LIMIT ?",
			Long.class, preSaveCount);

		if (userIds.isEmpty()) {
			log.warn("[LoadTest] 사전정보 저장 대상 유저 없음");
			return 0;
		}

		int totalInserted = 0;

		for (Map.Entry<String, Long> eventEntry : eventIds.entrySet()) {
			long eventId = eventEntry.getValue();
			PaceMapEntry paceMapEntry = paceMap.get(String.valueOf(eventId));

			// hot + others 합쳐서 전체 페이스 목록
			List<PaceRef> allPaces = new ArrayList<>();
			allPaces.addAll(paceMapEntry.hot());
			allPaces.addAll(paceMapEntry.others());

			// 배치 INSERT (1000건씩)
			int batchSize = 1000;
			for (int i = 0; i < userIds.size(); i += batchSize) {
				int end = Math.min(i + batchSize, userIds.size());
				StringBuilder sb = new StringBuilder();
				sb.append("INSERT INTO entry (user_id, event_id, course_id, pace_id, status, created_at, updated_at) VALUES ");

				for (int j = i; j < end; j++) {
					PaceRef pace = allPaces.get(j % allPaces.size());
					if (j > i) sb.append(",");
					sb.append(String.format("(%d, %d, %d, %d, 'PRE_SAVED', NOW(), NOW())",
						userIds.get(j), eventId, pace.courseId(), pace.paceId()));
				}

				jdbcTemplate.update(sb.toString());
				totalInserted += (end - i);
			}
		}

		log.debug("[LoadTest] 사전정보 저장 완료 — {}건 ({}명 x {}이벤트)",
			totalInserted, userIds.size(), eventIds.size());
		return totalInserted;
	}

	// ================================================================
	// Redis
	// ================================================================

	private void flushRedis() {
		log.debug("[LoadTest] Redis flushDB 실행");
		redissonClient.getKeys().flushdb();
	}
}
