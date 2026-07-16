export interface PaymentHistory {
  id: string;
  eventId: number;
  title: string;
  thumbnail: string;
  appType: 'LOTTERY' | 'FIRST_COME';
  status: 'IN_PROGRESS' | 'CLOSING_SOON' | 'READY' | 'END' | 'DRAW_COMPLETED';
  orderStatus:
    | '입금대기'
    | '결제완료'
    | '상품준비중'
    | '배송중'
    | '배송완료'
    | '구매확정'
    | '결제취소'
    | '교환접수'
    | '교환완료'
    | '환불접수'
    | '환불완료';
  date: string;
  eventAt: string;
  venue: string;
  course: string;
  pace: string;
  price: number;
}
