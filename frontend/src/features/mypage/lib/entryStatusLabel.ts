import { EntriesHistory, EntryHistoryItem } from '../types';

/**
 * 백엔드 원시 enum(entryStatus/appType/eventStatus) → 화면 표시 신청상태 문자열.
 * EventHistoryPage 의 렌더 분기 문자열과 1:1로 정합한다.
 */
export function resolveEntryStatusLabel(item: EntryHistoryItem): string {
  const { appType, entryStatus, eventStatus } = item;

  // 사전정보 저장(READY 단계) — 응모/선착순 공통
  if (entryStatus === 'PRE_SAVED') return '신청 대기';

  if (appType === 'LOTTERY') {
    switch (entryStatus) {
      case 'APPLIED':
        // 추첨 발표 전이면 응모 완료(발표 대기)
        return eventStatus === 'DRAW_COMPLETED' ? '발표 대기' : '응모 완료';
      case 'WON':
        return '당첨';
      case 'LOST':
        return '미당첨';
      default:
        return '응모 완료';
    }
  }

  // FIRST_COME(선착순)
  switch (entryStatus) {
    case 'RESERVED':
      return '신청 가능'; // 선점(미결제) → 결제 유도
    case 'APPLIED':
      return '신청 완료';
    default:
      return '신청 완료';
  }
}

/** 백엔드 신청내역 항목 → 화면용 EntriesHistory 매핑 */
export function mapEntryHistoryItem(item: EntryHistoryItem): EntriesHistory {
  return {
    id: item.entryId,
    eventId: item.eventId,
    thumbnail: item.thumbnailUrl ?? '',
    title: item.title,
    appType: item.appType,
    status: item.eventStatus,
    entryStatus: resolveEntryStatusLabel(item),
    date: item.createdAt,
    eventAt: item.eventAt,
    appStartAt: item.appStartAt,
    appEndAt: item.appEndAt,
    resultAt: item.resultAt ?? '',
    venue: item.venue,
    course: item.courseName,
    pace: item.paceName,
  };
}
