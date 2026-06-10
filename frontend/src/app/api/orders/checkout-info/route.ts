import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * 결제 준비 정보 조회 (prepareToken + 서버계산 금액 + 패키지 + 기본 배송지).
 * 인증 필요(serverAuthHeader → 게이트웨이가 X-User-Id 주입).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = await serverAuthHeader();

    const response = await mainServerClient.post(`/orders/checkout-info`, body, {
      headers: { ...auth },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
