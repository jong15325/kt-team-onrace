/** 결제 준비/주문/확정 응답 타입 (백엔드 DTO 정합) */

export interface OrderRequestInfo {
  eventId: number;
  eventName: string;
  eventAt: string;
  venue: string;
  thumbnailUrl: string;
  courseName: string;
  paceName: string;
  coursePrice: number;
}

export interface CheckoutPackage {
  id: number;
  itemType: string;
  name: string;
  price: number;
  description: string;
  options: string[];
}

export interface PaymentDetail {
  itemTotalAmount: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
}

export interface ShippingAddressInfo {
  hasAddress: boolean;
  addressId: number | null;
  receiverName: string | null;
  phone: string | null;
  zipcode: string | null;
  address1: string | null;
  address2: string | null;
  memo: string | null;
  isDefault: boolean;
}

/** POST /orders/checkout-info 응답 */
export interface CheckoutInfoResponse {
  prepareToken: string;
  orderRequestInfo: OrderRequestInfo;
  packages: CheckoutPackage[];
  paymentDetail: PaymentDetail;
  shippingAddress: ShippingAddressInfo;
}

/** POST /orders/checkout 응답 */
export interface CheckoutResponse {
  orderNumber: string;
  orderName: string;
  amount: number;
}

/** POST /payments/confirm 응답 */
export interface PaymentConfirmResponse {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  method: string;
  status: string;
}
