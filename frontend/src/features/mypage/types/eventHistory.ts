export interface EventHistory {
  id: number;
  eventId: number;
  title: string;
  appType: 'LOTTERY' | 'FIRST_COME';
  status: 'IN_PROGRESS' | 'CLOSING_SOON' | 'READY' | 'END' | 'DRAW_COMPLETED';
  entryStatus:
    | '응모 완료'
    | '발표 대기'
    | '당첨'
    | '미당첨'
    | '당첨 취소'
    | '신청 대기'
    | '신청 가능'
    | '신청 완료'
    | '신청 불가';
  date: string;
  thumbnail: string;
  eventAt: string;
  appStartAt: string;
  appEndAt: string;
  resultAt: string;
  venue: string;
  course: string;
  pace: string;
}
