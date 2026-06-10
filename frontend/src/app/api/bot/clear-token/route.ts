import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * 봇 통과 토큰(Bot-Clear-Token) 발급 BFF.
 * 현재 백엔드는 테스트용 더미 토큰을 발급한다(GET /bot/test-token, JWT_SECRET 서명).
 * 추후 AI 봇 판정 서버 연동 지점.
 */
export async function GET() {
  try {
    const auth = await serverAuthHeader();
    const response = await mainServerClient.get(`/bot/test-token`, {
      headers: { ...auth },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
