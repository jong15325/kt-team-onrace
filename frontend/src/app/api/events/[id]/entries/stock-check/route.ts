import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * 재고 확인 BFF (STEP 4).
 * - 인증 필요(Authorization) + 봇 통과 토큰(Bot-Clear-Token) 전달.
 * - 게이트웨이 QueueStatusHeaderFilter가 응답에 X-Queue-Enabled 헤더를 추가하므로,
 *   이를 읽어 data.queueEnabled 로 합쳐 클라이언트에 전달한다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const queryData = Object.fromEntries(searchParams.entries());

    const auth = await serverAuthHeader();
    const botToken = request.headers.get('Bot-Clear-Token');

    const response = await mainServerClient.get(
      `/events/${id}/entries/stock-check`,
      {
        params: queryData,
        headers: {
          ...auth,
          ...(botToken ? { 'Bot-Clear-Token': botToken } : {}),
        },
      },
    );

    // 게이트웨이가 추가한 대기열 활성화 여부 헤더를 응답 데이터에 병합
    const queueEnabled =
      String(response.headers['x-queue-enabled'] ?? '').toLowerCase() === 'true';

    const payload = response.data;
    if (payload && typeof payload === 'object' && payload.data) {
      payload.data = { ...payload.data, queueEnabled };
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    return handleApiError(error);
  }
}
