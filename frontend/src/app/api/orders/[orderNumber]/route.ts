import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

// 주문 상세 조회. 인증 필요(서버가 X-User-Id 로 본인 주문만 반환).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const { orderNumber } = await params;
    const auth = await serverAuthHeader();

    const response = await mainServerClient.get(`/orders/${orderNumber}`, {
      headers: { ...auth },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
