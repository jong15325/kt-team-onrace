import { EventDetails } from '@/features/event/types';

export const EVENT_DETAILS: EventDetails = {
  id: 1,
  lotteryAnnouncedAt: '2026-03-15T10:00:00',
  notice: '참가자 유의사항...',
  courses: [
    {
      id: 1,
      name: '풀코스',
      mapImg: '/image/course.png',
      distanceMeter: 42195,
      price: 50000,
      courseCapacity: 500,
      paces: [
        { id: 1, name: '4시간 페이스', hour: 4, minutes: 0, capacity: 100 },
      ],
      timeLimit: 90,
      waterSource: 3,
      altitude: 1500,
      courseRoute:
        '지역명 → 지역명 → 지역명(급수처) → 지역명 → 지역명 → 지역명(급수처) → 지역명 → 지역명 → 지역명(급수처) → 지역명',
    },
    {
      id: 2,
      name: '하프코스',
      mapImg: '/image/course.png',
      distanceMeter: 21100,
      price: 40000,
      courseCapacity: 500,
      paces: [
        { id: 1, name: '4시간 페이스', hour: 4, minutes: 0, capacity: 100 },
      ],
      timeLimit: 90,
      waterSource: 3,
      altitude: 1500,
      courseRoute:
        '지역명 → 지역명 → 지역명(급수처) → 지역명 → 지역명 → 지역명(급수처) → 지역명 → 지역명 → 지역명(급수처) → 지역명',
    },
    {
      id: 3,
      name: '10km',
      mapImg: '/image/course.png',
      distanceMeter: 10000,
      price: 30000,
      courseCapacity: 500,
      paces: [
        { id: 1, name: '4시간 페이스', hour: 4, minutes: 0, capacity: 100 },
      ],
      timeLimit: 90,
      waterSource: 3,
      altitude: 1500,
      courseRoute:
        '지역명 → 지역명 → 지역명(급수처) → 지역명 → 지역명 → 지역명(급수처) → 지역명 → 지역명 → 지역명(급수처) → 지역명',
    },
  ],
  packages: [
    { id: 1, name: '기본 패키지', price: 0, description: '기본 참가 키트' },
  ],
  thumbnailImg: [
    { id: 1, type: 'THUMBNAIL', url: '/image/thumbnail/busan.png', sort: 1 },
    { id: 2, type: 'THUMBNAIL', url: '/image/thumbnail/busan.png', sort: 1 },
    { id: 3, type: 'THUMBNAIL', url: '/image/thumbnail/busan.png', sort: 1 },
  ],
  detailImg: [
    { id: 3, type: 'DETAIL', url: '/image/busanDetail.png', sort: 1 },
  ],
  delivery: {
    schedule: '본 상품은 일괄배송 상품으로 2026년 4월 1일부터 순차 배송됩니다.',
    feePolicy: '3만 원 이상 무료배송',
  },
};
