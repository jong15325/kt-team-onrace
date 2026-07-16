import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

// 주문 목록 조회 (?tab=pending|completed). 인증 필요(게이트웨이가 X-User-Id 주입).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') ?? 'completed';
    const auth = await serverAuthHeader();

    const response = await mainServerClient.get('/orders', {
      params: { tab },
      headers: { ...auth },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
