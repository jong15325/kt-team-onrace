import { ApiResponse } from '@/types/api';
import {
  OrderCheck,
  OrderCheckInfo,
  PaymentConfirm,
  CheckoutInfoResponse,
  CheckoutResponse,
  PaymentConfirmResponse,
  OrderListResponse,
  OrderDetail,
} from '../types';

export interface IOrderService {
  // 주문 내역 (Phase 6)
  getOrder(tab: string): Promise<ApiResponse<OrderListResponse>>;
  getOrderDetails(orderNumber: string): Promise<ApiResponse<OrderDetail>>;
  postOrderConfirm(id: string): Promise<ApiResponse<void>>;
  // 결제 플로우 (Phase 5)
  postOrderCheckoutInfo(
    data: OrderCheckInfo,
  ): Promise<ApiResponse<CheckoutInfoResponse>>;
  postOrderCheckout(data: OrderCheck): Promise<ApiResponse<CheckoutResponse>>;
  postPaymentConfirm(
    data: PaymentConfirm,
  ): Promise<ApiResponse<PaymentConfirmResponse>>;
}
