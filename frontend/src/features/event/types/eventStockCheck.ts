export type EntryStockStatus = 'AVAILABLE' | 'TEMP_SOLD_OUT' | 'SOLD_OUT';

/**
 * 재고 확인 응답 (백엔드 EntryStockCheckResponse + BFF가 병합한 queueEnabled)
 * - stockStatus: AVAILABLE(가능) | TEMP_SOLD_OUT(일시품절) | SOLD_OUT(매진)
 * - remainingStock: 남은 재고
 * - queueEnabled: 게이트웨이 X-Queue-Enabled 헤더(대기열 활성화 이벤트 여부)
 */
export interface EventStockCheck {
  stockStatus: EntryStockStatus;
  remainingStock: number;
  queueEnabled: boolean;
}
