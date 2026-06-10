import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * 주문 생성(PENDING) — 진짜 orderNumber 발급. 서버가 expectedFinalAmount·prepareToken 재검증.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = await serverAuthHeader();

    const response = await mainServerClient.post(`/orders/checkout`, body, {
      headers: { ...auth },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
