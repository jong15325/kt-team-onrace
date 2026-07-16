import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { queueServerClient, serverAuthHeader } from '@/utils/backend';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 인증(Authorization) + 봇 통과 토큰(Bot-Clear-Token) 전달
    const auth = await serverAuthHeader();
    const botToken = request.headers.get('Bot-Clear-Token');

    // 게이트웨이 queue-route(/queue/**, StripPrefix 없음)로 직행
    const response = await queueServerClient.post(`/enter`, body, {
      headers: {
        ...auth,
        ...(botToken ? { 'Bot-Clear-Token': botToken } : {}),
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
