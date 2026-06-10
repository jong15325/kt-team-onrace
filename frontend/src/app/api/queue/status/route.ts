import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { queueServerClient, serverAuthHeader } from '@/utils/backend';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryData = Object.fromEntries(searchParams.entries());

    // 인증(Authorization) + 봇 통과 토큰(Bot-Clear-Token) 전달
    const auth = await serverAuthHeader();
    const botToken = request.headers.get('Bot-Clear-Token');

    const response = await queueServerClient.get(`/status`, {
      params: queryData,
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
