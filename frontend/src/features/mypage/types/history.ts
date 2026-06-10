export interface EntriesHistory {
  id: number;
  eventId: number;

  thumbnail: string;
  title: string;
  appType: 'LOTTERY' | 'FIRST_COME';
  status: 'IN_PROGRESS' | 'CLOSING_SOON' | 'READY' | 'END' | 'DRAW_COMPLETED';
  entryStatus: string;
  date: string;
  eventAt: string;
  appStartAt: string;
  appEndAt: string;
  resultAt: string;
  venue: string;
  course: string;
  pace: string;
}

// 백엔드 GET /entries/my 응답(원시 enum/필드). 표시 문자열은 프론트에서 계산.
export interface EntryHistoryItem {
  entryId: number;
  eventId: number;
  title: string;
  thumbnailUrl: string | null;
  appType: 'LOTTERY' | 'FIRST_COME';
  eventStatus: 'IN_PROGRESS' | 'CLOSING_SOON' | 'READY' | 'END' | 'DRAW_COMPLETED';
  entryStatus: 'PRE_SAVED' | 'RESERVED' | 'APPLIED' | 'WON' | 'LOST';
  createdAt: string;
  eventAt: string;
  appStartAt: string;
  appEndAt: string;
  resultAt: string | null;
  venue: string;
  courseName: string;
  paceName: string;
}

export interface WaitingEntriesHistory {
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
  items: any[];
}

export interface OrderHistory {
  id: string;
  eventId: number;
  title: string;

  thumbnail: string;
  appType: 'LOTTERY' | 'FIRST_COME';
  status: 'IN_PROGRESS' | 'CLOSING_SOON' | 'READY' | 'END' | 'DRAW_COMPLETED';
  orderStatus: string;
  date: string;
  eventAt: string;
  venue: string;
  course: string;
  pace: string;
  price: number;
}

export interface HistoryOverview {
  entries: {
    page: number;
    size: number;
    totalCount: number;
    hasNext: boolean;
    items: EntriesHistory[];
  };
  waitingEntries: WaitingEntriesHistory;
  orders: {
    page: number;
    size: number;
    totalCount: number;
    hasNext: boolean;
    items: OrderHistory[];
  };
  address: {
    hasAddress: boolean;
    defaultAddress: {
      receiverName: string;
      label: string;
      address: string;
      phone: string;
    };
  };
}

export interface OrderDetailInfo {
  orderStatusInfo: {
    orderName: 'ORD-20260317-0001'; // orderName -> OrderId
    orderedAt: '2026-03-17T10:00:00';
    status: '결제 대기';
    shipmentStatus: null;
  };
  orderItemInfo: {
    eventId: 101;
    thumbnailImg: string; // thumbnailUrl -> thumbnailImg
    title: '서울 마라톤 대회 2026'; // eventTitle -> title
    course: '풀코스'; // courseName -> course
    pace: '6:00/km'; // paceName -> pace
    price: number;
    discountRate: number;
    shippingFee: 3000;

    packages: {
      default: [
        {
          eventPackageId: 1;
          name: '기념 티셔츠'; // 옵션 어떻게 저장되는지 확인 필요
          price: 0;
        },
      ];
      optional: [
        {
          eventPackageId: 2;
          name: '스포츠타월';
          price: 5000;
        },
      ];
    };
  };

  participantInfo: {
    name: '김유저';
    birthDate: '';
    phoneNumber: '01012345678';
    email: '';
  };

  deliveryInfo: {
    label: '집'; // addressLabel -> label
    zipCode: '12345';
    address1: '서울시 강남구'; // address -> address1
    address2: '101동'; // detailAddress -> address2
    recipientName: '김유저';
    recipientPhone: '01012345678';
    memo: '';
    isDefault: boolean;
  };

  paymentMethodInfo: {
    method: 'card'; // ...
    depositorName: '김유저';
    // 추가 정보는 확인 필요...
  };
}
