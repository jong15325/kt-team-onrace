// Design
export const STATES = [
  'Default',
  'Hovered',
  'Pressed',
  'Focused',
  'Disabled',
] as const;

export const SIZES = [
  { label: 'Large', value: 'lg' },
  { label: 'Default', value: 'default' },
  { label: 'Small', value: 'sm' },
] as const;

export type MenuType =
  | 'icon'
  | 'shadow'
  | 'button'
  | 'icon'
  | 'input'
  | 'checkbox'
  | 'radioGroup'
  | 'selectbox'
  | 'modal';
export type ButtonType = 'text' | 'icon' | 'fab';
export type StateType = (typeof STATES)[number];
export type SizeType = (typeof SIZES)[number]['value'];
export type RoundedSize = 'full' | 'none';

// ----------------

// 타입 정의
export type StatusId =
  | 'READY'
  | 'IN_PROGRESS'
  | 'CLOSING_SOON'
  | 'END'
  | 'DRAW_COMPLETED';
export type TypeId = 'LOTTERY' | 'FIRST_COME';
// 백엔드 EventType 과 일치
export type CategoryId =
  | 'ALL'
  | 'MARATHON'
  | 'RUNNING'
  | 'TREASURE_HUNT'
  | 'COPS_AND_ROBBERS';
// 백엔드 EventRegion 과 일치
export type RegionId =
  | 'ALL'
  | 'SEOUL'
  | 'BUSAN'
  | 'DAEGU'
  | 'INCHEON'
  | 'GWANGJU'
  | 'DAEJEON'
  | 'ULSAN'
  | 'SEJONG'
  | 'GYEONGGI'
  | 'GANGWON'
  | 'CHUNGBUK'
  | 'CHUNGNAM'
  | 'JEONBUK'
  | 'JEONNAM'
  | 'GYEONGBUK'
  | 'GYEONGNAM'
  | 'JEJU';

// MAP
const STATUS_MAP: Record<string, string> = {
  READY: '오픈 예정',
  IN_PROGRESS: '모집중',
  CLOSING_SOON: '마감 임박',
  END: '모집 마감',
  DRAW_COMPLETED: '결과',
};

const STATUS_CONFIG_MAP: Record<string, string> = {
  READY: 'bg-yellow-50 text-font-warning',
  IN_PROGRESS: 'bg-blue-50 text-blue-500',
  CLOSING_SOON: 'bg-red-50 text-font-error',
  END: 'bg-gray-300 text-font-disabled',
  DRAW_COMPLETED: 'bg-gray-300 text-font-disabled',
};

const TYPE_MAP: Record<string, string> = {
  ALL: '전체보기',
  MARATHON: '마라톤',
  RUNNING: '러닝',
  TREASURE_HUNT: '보물찾기',
  COPS_AND_ROBBERS: '경찰과 도둑',
};

// 백엔드 EventRegion enum ↔ 한글 라벨 (필터 select 값으로 enum 사용)
const REGION_MAP: Record<string, string> = {
  ALL: '전체',
  SEOUL: '서울',
  BUSAN: '부산',
  DAEGU: '대구',
  INCHEON: '인천',
  GWANGJU: '광주',
  DAEJEON: '대전',
  ULSAN: '울산',
  SEJONG: '세종',
  GYEONGGI: '경기',
  GANGWON: '강원',
  CHUNGBUK: '충북',
  CHUNGNAM: '충남',
  JEONBUK: '전북',
  JEONNAM: '전남',
  GYEONGBUK: '경북',
  GYEONGNAM: '경남',
  JEJU: '제주',
};

const APP_TYPE_MAP: Record<string, string> = {
  LOTTERY: '추첨',
  FIRST_COME: '선착순',
};

const DATE_FILTER_OPTIONS_MAP: Record<string, string> = {
  ALL: '전체',
  IN_ONE_MONTH: '1개월 이내',
  IN_THREE_MONTH: '3개월 이내',
  IN_SIX_MONTH: '6개월 이내',
};

// 상수 데이터
export const STATUS = Object.entries(STATUS_MAP).map(([id, label]) => ({
  id,
  label,
}));

export const TYPE = Object.entries(TYPE_MAP).map(([id, label]) => ({
  id,
  label,
}));

export const REGION = Object.entries(REGION_MAP).map(([id, label]) => ({
  id,
  label,
}));

export const APP_TYPE = Object.entries(APP_TYPE_MAP).map(([id, label]) => ({
  id,
  label,
}));

export const DATE_FILTER_OPTIONS = Object.entries(DATE_FILTER_OPTIONS_MAP).map(
  ([id, label]) => ({
    id,
    label,
  }),
);

// 변환 함수 (Getter)
export const getStatusLabel = (id: string) => STATUS_MAP[id] || '미지정';
export const getStatusConfig = (id: string) => STATUS_CONFIG_MAP[id] || '';
export const getTypeLabel = (id: string) => TYPE_MAP[id] || '미지정';
export const getAppTypeLabel = (id: string) => APP_TYPE_MAP[id] || '미지정';
export const getRegionLabel = (id: string) => REGION_MAP[id] || '미지정';
export const getDateFilterOption = (id: string) =>
  DATE_FILTER_OPTIONS_MAP[id] || '미지정';
