export type QueueStatusValue = 'WAITING' | 'PASS';

/**
 * 대기열 상태 (백엔드 QueueStatusResponse 와 정합)
 * - status: WAITING(대기중) | PASS(통과)
 * - position: 대기중일 때의 순번 (PASS면 null)
 * - passToken: 통과 시 발급되는 토큰 (WAITING이면 null)
 * - retryAfterMs: 폴링 지터가 적용된 다음 조회 대기시간(ms)
 * - totalWaiting/expectedWaitTime: UI 표시 보조용(선택)
 */
export interface QueueStatus {
  paceId: number;
  status: QueueStatusValue;
  position: number | null;
  passToken: string | null;
  retryAfterMs?: number | null;
  // 예상 대기시간(ms) — 백엔드 계산값(대기중일 때만)
  estimatedWaitMs?: number | null;
  totalWaiting?: number;
  expectedWaitTime?: number;
}
