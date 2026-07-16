import { apiClient } from '@/lib/apiClient';
import { IOrderService } from './interface';

export const orderApi: IOrderService = {
  getOrder: async (tab) => {
    const response = await apiClient.get('/orders', { params: { tab } });
    return response.data;
  },
  getOrderDetails: async (orderNumber) => {
    const response = await apiClient.get(`/orders/${orderNumber}`);
    return response.data;
  },
  postOrderConfirm: async (id) => {
    const response = await apiClient.post(`/orders/${id}/confirm`);
    return response.data;
  },
  postOrderCheckout: async (data) => {
    const response = await apiClient.post(`/orders/checkout`, data);
    return response.data;
  },
  postOrderCheckoutInfo: async (data) => {
    const response = await apiClient.post(`/orders/checkout-info`, data);
    return response.data;
  },
  postPaymentConfirm: async (data) => {
    const response = await apiClient.post(`/payments/confirm`, data);
    return response.data;
  },
};
