import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { accountServerClient, serverAuthHeader } from '@/utils/backend';

export async function POST() {
  try {
    // NextAuth 세션의 액세스 토큰을 게이트웨이로 전달 → 게이트웨이가 X-User-Id 주입
    const authHeader = await serverAuthHeader();

    const response = await accountServerClient.post('/logout', null, {
      headers: authHeader,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
