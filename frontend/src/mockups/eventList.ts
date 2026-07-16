import { EventList } from '@/features/event/types';

export const EVENT_LIST: EventList = {
  content: [
    {
      id: 6,
      title: '서울 마라톤 2026',
      type: 'MARATHON',
      appType: 'LOTTERY',
      status: 'CLOSING_SOON',
      eventAt: '2026-04-16T09:00:00',
      appStartAt: '2026-02-01T00:00:00',
      appEndAt: '2026-02-28T23:59:59',
      region: 'SEOUL',
      venue: '서울특별시 송파구 올림픽로',
      courses: [
        {
          id: 1,
          name: '풀코스',
        },
        {
          id: 2,
          name: '하프코스',
        },
        {
          id: 3,
          name: '10km',
        },
      ],
      thumbnailImg: {
        id: 1,
        url: '/image/thumbnail/event.png',
      },

      discountRate: 0,
      minPrice: 20000,
      maxPrice: 50000,

      resultAt: '2026-04-01T10:00:00',
      delivery: {
        schedule:
          '본 상품은 일괄배송 상품으로 2026년 4월 1일부터 순차 배송됩니다.',
        feePolicy: '3만 원 이상 무료배송',
      },
    },

    {
      id: 2,
      title: '부산 바다 러닝 페스티벌',
      type: 'RUNNING',
      appType: 'FIRST_COME',
      status: 'IN_PROGRESS',
      eventAt: '2026-05-16T09:00:00',
      appStartAt: '2026-03-01T00:00:00',
      appEndAt: '2026-03-28T23:59:59',
      region: 'BUSAN',
      venue: '부산',
      courses: [
        {
          id: 1,
          name: '하프코스',
        },
        {
          id: 2,
          name: '10km',
        },
        {
          id: 3,
          name: '5km',
        },
      ],
      thumbnailImg: {
        id: 1,
        url: '/image/thumbnail/busan.png',
      },
      minPrice: 20000,
      maxPrice: 50000,

      discountRate: 20,
      resultAt: '2026-05-01T10:00:00',
      delivery: {
        schedule:
          '본 상품은 일괄배송 상품으로 2026년 4월 1일부터 순차 배송됩니다.',
        feePolicy: '3만 원 이상 무료배송',
      },
    },
    {
      id: 1,
      title: '서울 마라톤 2026',
      type: 'MARATHON',
      appType: 'LOTTERY',
      status: 'READY',
      eventAt: '2026-06-15T09:00:00',
      appStartAt: '2026-02-01T00:00:00',
      appEndAt: '2026-02-28T23:59:59',
      region: 'SEOUL',
      venue: '서울특별시 송파구 올림픽로',
      courses: [
        {
          id: 1,
          name: '풀코스',
        },
        {
          id: 2,
          name: '하프코스',
        },
        {
          id: 3,
          name: '10km',
        },
      ],
      thumbnailImg: {
        id: 1,
        url: '/image/thumbnail/marathon.png',
      },
      minPrice: 20000,
      maxPrice: 50000,

      // 빠진 정보
      discountRate: 20,
      resultAt: '2026-04-01T10:00:00',
      delivery: {
        schedule:
          '본 상품은 일괄배송 상품으로 2026년 4월 1일부터 순차 배송됩니다.',
        feePolicy: '3만 원 이상 무료배송',
      },
    },

    {
      id: 3,
      title: '런데이 8주 완성! 30분 달리기 첫 도전기',
      type: 'TREASURE_HUNT',
      appType: 'FIRST_COME',
      status: 'READY',
      eventAt: '2026-06-15T09:00:00',
      appStartAt: '2026-04-01T00:00:00',
      appEndAt: '2026-04-28T23:59:59',
      region: 'SEOUL',
      venue: '서울',
      courses: [
        {
          id: 1,
          name: '풀코스',
        },
        {
          id: 2,
          name: '하프코스',
        },
      ],
      thumbnailImg: {
        id: 1,
        url: '/image/thumbnail/experience.png',
      },

      minPrice: 20000,
      maxPrice: 50000,

      discountRate: 0,
      resultAt: '2026-06-01T10:00:00',
      delivery: {
        schedule:
          '본 상품은 일괄배송 상품으로 2026년 4월 1일부터 순차 배송됩니다.',
        feePolicy: '3만 원 이상 무료배송',
      },
    },

    {
      id: 5,
      title: '대구 컬러런',
      type: 'COPS_AND_ROBBERS',
      appType: 'LOTTERY',
      status: 'DRAW_COMPLETED',
      eventAt: '2026-02-18T09:00:00',
      appStartAt: '2026-01-01T00:00:00',
      appEndAt: '2026-01-28T23:59:59',
      region: 'DAEGU',
      venue: '대구',
      courses: [
        {
          id: 1,
          name: '10km',
        },
        {
          id: 2,
          name: '5km',
        },
      ],
      thumbnailImg: {
        id: 1,
        url: '/image/thumbnail/class.png',
      },

      minPrice: 20000,
      maxPrice: 50000,

      discountRate: 0,
      resultAt: '2026-03-01T10:00:00',
      delivery: {
        schedule:
          '본 상품은 일괄배송 상품으로 2026년 4월 1일부터 순차 배송됩니다.',
        feePolicy: '3만 원 이상 무료배송',
      },
    },
    {
      id: 4,
      title: '제주 올레길 마라톤',
      type: 'RUNNING',
      appType: 'FIRST_COME',
      status: 'END',
      eventAt: '2026-03-17T09:00:00',
      appStartAt: '2026-04-01T00:00:00',
      appEndAt: '2026-04-28T23:59:59',
      region: 'JEJU',

      venue: '제주',
      courses: [
        {
          id: 1,
          name: '풀코스',
        },
        {
          id: 2,
          name: '하프코스',
        },
      ],
      thumbnailImg: {
        id: 1,
        url: '/image/thumbnail/class2.png',
      },
      minPrice: 20000,
      maxPrice: 50000,

      discountRate: 0,
      resultAt: '2026-06-01T10:00:00',
      delivery: {
        schedule:
          '본 상품은 일괄배송 상품으로 2026년 4월 1일부터 순차 배송됩니다.',
        feePolicy: '3만 원 이상 무료배송',
      },
    },
  ],
  nextCursor: null,
  hasNext: false,
};
