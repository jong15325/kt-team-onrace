/** next/navigation useRouter 의 일부(push/replace)만 사용 */
export interface NavRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
}

/**
 * 신청/대기열 플로우 공통 에러 처리.
 * 사용자가 정리한 STEP 10-A/B 에러표 + 게이트웨이 필터(403/429)를 반영한다.
 *
 * 게이트웨이 필터 에러는 BFF(handleApiError)에서 error 필드를 code로 승격하므로
 * code 로 'QUEUE_REQUIRED' / 'CHALLENGE_REQUIRED' 를 구분할 수 있고,
 * 혹시 누락돼도 HTTP status(403/429)로 보조 판별한다.
 */

export interface EntryErrorInfo {
  code: string;
  status: number;
  message: string;
}

/** axios 에러 또는 BFF 표준 에러에서 코드/상태/메시지 추출 */
export function parseEntryError(error: any): EntryErrorInfo {
  const status: number = error?.response?.status ?? error?.status ?? 0;
  const data = error?.response?.data ?? {};
  let code: string = data?.code ?? data?.error ?? 'UNKNOWN_ERROR';

  // code 가 비어 있고 게이트웨이 상태코드만 온 경우 보조 판별
  if (code === 'UNKNOWN_ERROR') {
    if (status === 429) code = 'QUEUE_REQUIRED';
    else if (status === 403) code = 'CHALLENGE_REQUIRED';
  }

  const message: string =
    data?.message || '에러가 발생했습니다, 다시 시도해주세요';

  return { code, status, message };
}

const TO_LIST = new Set(['EVT_001', 'ENT_011']);
const TO_DETAIL = new Set([
  'ENT_006', // 이미 신청한 이벤트 → 상세로(상세에서 신청완료/결제하기 상태로 표시)
  'ENT_010', // 이미 선점 → 상세로
  'ENT_012',
  'ENT_013',
  'EVT_003',
  'EVT_004',
  'QUE_003',
  'CHALLENGE_REQUIRED',
  'QUEUE_REQUIRED',
]);
const TO_LOGIN = new Set(['MBR_001']);

export type EntryErrorAction =
  | 'list'
  | 'detail'
  | 'login'
  | 'notice'
  | 'retry-pace';

/** 코드 → 처리 액션 결정 */
export function resolveEntryErrorAction(code: string): EntryErrorAction {
  if (TO_LIST.has(code)) return 'list';
  if (TO_DETAIL.has(code)) return 'detail';
  if (TO_LOGIN.has(code)) return 'login';
  if (code === 'ENT_002' || code === 'ENT_003') return 'retry-pace';
  return 'notice';
}

/**
 * 에러를 처리한다.
 * @param onNotice 안내 메시지를 화면에 표시하는 콜백(인라인/토스트). 미지정 시 alert.
 * @returns 결정된 액션
 */
export function handleEntryError(
  error: any,
  opts: {
    router: NavRouter;
    eventId: string;
    onNotice?: (message: string) => void;
  },
): EntryErrorAction {
  const { router, eventId, onNotice } = opts;
  const { code, message } = parseEntryError(error);
  const action = resolveEntryErrorAction(code);
  const notify = onNotice ?? ((m: string) => alert(m));

  switch (action) {
    case 'list':
      notify(message);
      router.push('/event');
      break;
    case 'detail':
      notify(message);
      router.push(`/ticketing/${eventId}`);
      break;
    case 'login':
      notify(message);
      router.push('/login');
      break;
    case 'retry-pace':
    case 'notice':
    default:
      notify(message);
      break;
  }
  return action;
}
