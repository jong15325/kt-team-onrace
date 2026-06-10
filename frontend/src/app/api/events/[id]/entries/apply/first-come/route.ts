import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 인증(Authorization) + 봇 통과 토큰(Bot-Clear-Token) + 대기열 토큰(X-Queue-Token) 전달
    const auth = await serverAuthHeader();
    const botToken = request.headers.get('Bot-Clear-Token');
    const queueToken = request.headers.get('X-Queue-Token');

    const response = await mainServerClient.post(
      `/events/${id}/entries/apply/first-come`,
      body,
      {
        headers: {
          ...auth,
          ...(botToken ? { 'Bot-Clear-Token': botToken } : {}),
          ...(queueToken ? { 'X-Queue-Token': queueToken } : {}),
        },
      },
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
