import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

export async function GET() {
  try {
    // 세션 토큰을 게이트웨이로 전달 → 게이트웨이가 X-User-Id 주입
    const authHeader = await serverAuthHeader();

    const response = await mainServerClient.get('/mypage/account', {
      headers: authHeader,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
