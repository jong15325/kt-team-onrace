/**
 * 코스 정보 인터페이스
 */
export interface Course {
  id: number;
  name: string;
}

/**
 * 마라톤 이벤트 상세 인터페이스
 
 상태
  - 접수 예정: READY
  - 신청중: IN_PROGRESS
  - 마감 임박: CLOSING_SOON
  - 신청 마감: END
  - 추첨 완료: DRAW_COMPLETED

 타입
  - 마라톤: 'MARATHON',
  - 플레이 런: 'PLAY_RUN',
  - 체험단: 'EXPERIENCE',
  - 러닝 클래스: 'CLASS',
  - 기타: 'ETC',
  App 타입
  - LOTTERY: 응모
  - FIRST_COME: 선착
 */

export interface Event {
  id: number;
  title: string;
  // 백엔드 EventType 과 일치
  type: 'MARATHON' | 'RUNNING' | 'TREASURE_HUNT' | 'COPS_AND_ROBBERS';
  appType: 'LOTTERY' | 'FIRST_COME';
  status: 'IN_PROGRESS' | 'CLOSING_SOON' | 'READY' | 'END' | 'DRAW_COMPLETED';
  eventAt: string; // ISO 8601
  appStartAt: string; // ISO 8601
  appEndAt: string; // ISO 8601
  region: string;
  venue: string;
  courses: Course[];
  thumbnailImg: {
    id: number;
    url: string;
  };
  minPrice: number;
  maxPrice: number;
  discountRate: number;
  resultAt: string; // ISO 8601
  delivery: {
    schedule: string;
    feePolicy: string;
  };
}

/**
 * API의 'data' 필드에 들어갈 페이징 구조
 */
export interface EventList {
  content: Event[];
  nextCursor: string | null; // 백엔드 CursorResponse.nextCursor (string)
  hasNext: boolean;
}

/**
 * 이벤트 목록 검색 쿼리 (백엔드 EventSearchRequest 와 정합)
 */
export interface EventSearchQuery {
  type?: string; // EventType
  appType?: string; // EventAppType
  status?: string; // EventStatus
  region?: string; // EventRegion
  keyword?: string;
  minDistance?: number; // meters
  maxDistance?: number; // meters
  eventStartDate?: string; // yyyy-MM-dd
  eventEndDate?: string; // yyyy-MM-dd
  cursor?: string;
  size?: number;
}
