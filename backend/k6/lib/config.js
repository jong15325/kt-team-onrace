// ========================================================
// k6 부하테스트 공통 설정
// 모든 값은 환경변수(-e)로 오버라이드 가능
// ========================================================

// === 서버 설정 ===
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:30000';

// === 시나리오별 이벤트 ID (setup-load-test-events.sql 기준) ===
export const EVENT_IDS = {
  LOTTERY:                parseInt(__ENV.EVENT_LOTTERY || '11'),
  FIRST_COME_NO_QUEUE:   parseInt(__ENV.EVENT_FC_NO_QUEUE || '12'),
  FIRST_COME_WITH_QUEUE: parseInt(__ENV.EVENT_FC_WITH_QUEUE || '13'),
};

// === 유저 설정 (최대 30,000명) ===
export const VU_COUNT      = parseInt(__ENV.VU_COUNT || '100');
export const USER_PASSWORD = __ENV.USER_PASSWORD || 'Test1234!@';

// === 로그인 설정 ===
export const LOGIN_TIMEOUT    = __ENV.LOGIN_TIMEOUT || '120s';
export const LOGIN_BATCH_SIZE = parseInt(__ENV.LOGIN_BATCH_SIZE || '2');  // Auth 서비스가 로그인당 DB 커넥션 2개 사용 (login + loginHistory)

// === 페이스 배분 (70% HOT, 30% 기타) ===
export const HOT_PACE_RATIO = parseFloat(__ENV.HOT_PACE_RATIO || '0.7');

// === Setup 타임아웃 (데이터 셋업 + 로그인) ===
export const SETUP_TIMEOUT_SEC = parseInt(__ENV.SETUP_TIMEOUT_SEC || '600');

// === 부하 패턴 (ramping-vus) ===
export const RAMP_UP_SEC   = parseInt(__ENV.RAMP_UP_SEC || '10');
export const HOLD_SEC      = parseInt(__ENV.HOLD_SEC || '120');
export const RAMP_DOWN_SEC = parseInt(__ENV.RAMP_DOWN_SEC || '5');

// === 재고 설정 ===
export const TOTAL_STOCK       = __ENV.TOTAL_STOCK ? parseInt(__ENV.TOTAL_STOCK) : null;  // 직접 지정 (null이면 자동 계산)
export const COMPETITION_RATIO = parseInt(__ENV.COMPETITION_RATIO || '3');     // 경쟁률 (3:1) — TOTAL_STOCK 미지정 시 사용
export const HOT_PACE_COUNT    = parseInt(__ENV.HOT_PACE_COUNT || '1');        // 인기 페이스 수 (랜덤 선정)
export const HOT_STOCK_RATIO   = parseFloat(__ENV.HOT_STOCK_RATIO || '0.4');  // 인기 페이스 재고 비율 (40%)

// === 인기 페이스 고정 지정 (두 값 모두 지정 시 해당 코스-페이스 1개를 hot으로 고정) ===
export const HOT_COURSE_INDEX = __ENV.HOT_COURSE_INDEX != null ? parseInt(__ENV.HOT_COURSE_INDEX) : null;  // 0=풀코스, 1=하프��스, 2=10km
export const HOT_PACE_INDEX   = __ENV.HOT_PACE_INDEX != null ? parseInt(__ENV.HOT_PACE_INDEX) : null;      // 0=3분, 1=4분, 2=5분, 3=6분, 4=7분

// === 사전정보 저장 비율 ===
export const PRE_SAVE_RATIO = __ENV.PRE_SAVE_RATIO != null ? parseFloat(__ENV.PRE_SAVE_RATIO) : null;  // null이면 건너뜀, 0.7이면 70%

// === Queue 폴링 설정 ===
export const QUEUE_POLL_INTERVAL_SEC = parseInt(__ENV.QUEUE_POLL_SEC || '2');
export const QUEUE_MAX_POLL_COUNT    = parseInt(__ENV.QUEUE_MAX_POLL || '300');

// === 결제 이탈 + 2웨이브 설정 ===
export const PAYMENT_DROPOUT_RATIO = parseFloat(__ENV.PAYMENT_DROPOUT_RATIO || '0.3');  // 30% 이탈
export const RETRY_MAX_ROUNDS      = parseInt(__ENV.RETRY_MAX_ROUNDS || '5');            // 매진 시 최대 재시도 횟수
export const RETRY_WAIT_SEC        = parseInt(__ENV.RETRY_WAIT_SEC || '65');             // Wave2 TTL 만료 대기 (TTL 60초 + 여유 5초)
export const RETRY_DELAY_SEC       = parseInt(__ENV.RETRY_DELAY_SEC || '5');             // 매진 재시도 간격 (라운드 간 대기)

// === Wave 2 추가 인원 (이탈자 재고 재선점) ===
export const EXTRA_VU_COUNT = __ENV.EXTRA_VU_COUNT != null
  ? parseInt(__ENV.EXTRA_VU_COUNT)
  : Math.ceil(VU_COUNT * PAYMENT_DROPOUT_RATIO);  // 미지정 시 이탈률 기반 자동 계산

// === 용량(Breakpoint) 테스트 설정 ===
export const BP_START_VUS        = parseInt(__ENV.BP_START_VUS || '500');           // 시작 VU 수
export const BP_STEP_VUS         = parseInt(__ENV.BP_STEP_VUS || '500');            // 단계별 VU 증분
export const BP_MAX_VUS          = parseInt(__ENV.BP_MAX_VUS || '5000');            // 최대 VU 수
export const BP_STEP_DURATION_SEC = parseInt(__ENV.BP_STEP_DURATION_SEC || '60');   // 단계 유지 시간 (초)
export const BP_RAMP_SEC         = parseInt(__ENV.BP_RAMP_SEC || '10');             // 단계 간 ramp 시간 (초)
export const BP_ERROR_THRESHOLD  = parseFloat(__ENV.BP_ERROR_THRESHOLD || '0.05'); // 에러율 중단 임계값 (5%)
export const BP_P95_THRESHOLD_MS = parseInt(__ENV.BP_P95_THRESHOLD_MS || '5000');  // p95 응답시간 중단 임계값 (ms)
export const BP_SCENARIO_FLOW    = __ENV.BP_SCENARIO_FLOW || 'LOTTERY';            // LOTTERY / FIRST_COME / FIRST_COME_QUEUE
export const BP_LOGIN_POOL       = parseInt(__ENV.BP_LOGIN_POOL || '30000');       // 로그인 유저 풀 (BP_MAX_VUS와 분리, 쓰기 부하 유지용)

// === 성공 지표 기준값 ===
export const TARGET_AVG_RESPONSE_MS = parseInt(__ENV.TARGET_AVG_RESPONSE_MS || '1500');    // 평균 응답시간 목표 (ms)
export const TARGET_ERROR_RATE      = parseFloat(__ENV.TARGET_ERROR_RATE || '0.01');       // 에러율 목표 (1%)
export const TARGET_SUCCESS_RATE    = parseFloat(__ENV.TARGET_SUCCESS_RATE || '0.99');     // 성공률 목표 (99%)
