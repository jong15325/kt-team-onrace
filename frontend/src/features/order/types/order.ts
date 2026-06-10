export interface PaymentConfirm {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

/** GET /orders 목록 항목 (OrderSummaryDto) */
export interface OrderSummary {
  eventId: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  createdAt: string;
  finalAmount: number;
  eventTitle: string;
  thumbnailUrl: string | null;
  courseName: string | null;
  paceName: string | null;
}

/** GET /orders 응답 (OrderListResponseDto) */
export interface OrderListResponse {
  orders: OrderSummary[];
}

export interface OrderDetailPackage {
  eventPackageId: number;
  name: string;
  price: number;
}

/** GET /orders/{orderNumber} 응답 (OrderDetailResponseDto) */
export interface OrderDetail {
  eventId: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  createdAt: string;
  itemTotalAmount: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
  eventTitle: string;
  thumbnailUrl: string | null;
  courseName: string | null;
  paceName: string | null;
  recipientName: string | null;
  addressLabel: string | null;
  recipientPhone: string | null;
  zipCode: string | null;
  address: string | null;
  detailAddress: string | null;
  deliveryMemo: string | null;
  packages: OrderDetailPackage[];
}
