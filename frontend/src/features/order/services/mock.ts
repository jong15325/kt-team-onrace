import { wrapMockResponse } from '@/utils/api';
import { IOrderService } from './interface';

export const orderMock: IOrderService = {
  getOrder: async () => wrapMockResponse({ orders: [] }),
  getOrderDetails: async (orderNumber) =>
    wrapMockResponse({
      eventId: 1,
      orderNumber: orderNumber ?? 'ORD-MOCK-0001',
      orderStatus: 'PAID',
      createdAt: new Date().toISOString(),
      itemTotalAmount: 70000,
      shippingFee: 3000,
      discountAmount: 0,
      finalAmount: 73000,
      eventTitle: '목 이벤트',
      thumbnailUrl: '',
      courseName: '풀코스',
      paceName: '자유 페이스',
      recipientName: '김유저',
      addressLabel: '집',
      recipientPhone: '010-1234-5678',
      zipCode: '12345',
      address: '서울시 강남구 테헤란로 123',
      detailAddress: '101동 101호',
      deliveryMemo: '문 앞에 두고 가주세요',
      packages: [],
    }),
  postOrderConfirm: async () => wrapMockResponse(),
  postOrderCheckoutInfo: async (data) =>
    wrapMockResponse({
      prepareToken: 'MOCK_PREPARE_TOKEN',
      orderRequestInfo: {
        eventId: data.eventId,
        eventName: '목 이벤트',
        eventAt: new Date().toISOString(),
        venue: '서울 시민운동장',
        thumbnailUrl: '',
        courseName: '풀코스',
        paceName: '자유 페이스',
        coursePrice: 70000,
      },
      packages: [],
      paymentDetail: {
        itemTotalAmount: 70000,
        shippingFee: 3000,
        discountAmount: 0,
        finalAmount: 73000,
      },
      shippingAddress: {
        hasAddress: false,
        addressId: null,
        receiverName: null,
        phone: null,
        zipcode: null,
        address1: null,
        address2: null,
        memo: null,
        isDefault: false,
      },
    }),
  postOrderCheckout: async () =>
    wrapMockResponse({
      orderNumber: 'ORD-MOCK-0001',
      orderName: '목 주문',
      amount: 73000,
    }),
  postPaymentConfirm: async (data) =>
    wrapMockResponse({
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      totalAmount: data.amount,
      method: '카드',
      status: 'DONE',
    }),
};
