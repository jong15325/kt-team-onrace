import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

// 마이페이지 신청 내역: 세션 토큰을 게이트웨이로 전달 → 게이트웨이가 X-User-Id 주입
export async function GET() {
  try {
    const authHeader = await serverAuthHeader();

    const response = await mainServerClient.get('/entries/my', {
      headers: authHeader,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
