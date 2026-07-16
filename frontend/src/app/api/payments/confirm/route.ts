import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * 결제 확정 — 백엔드 경유(서버-투-서버 Toss confirm).
 * 백엔드가 Toss confirm + Order PAID + Entry APPLIED + 재고 확정까지 처리한다.
 * (프론트가 Toss를 직접 confirm하면 DB 미반영 + 시크릿 노출 → 반드시 백엔드 경유)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = await serverAuthHeader();

    const response = await mainServerClient.post(`/payments/confirm`, body, {
      headers: { ...auth },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
