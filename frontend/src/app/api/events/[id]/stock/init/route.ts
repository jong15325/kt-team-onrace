import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * 이벤트 재고 초기화 (eventId만 필요, 바디 없음).
 * 백엔드가 DB 재고를 읽어 Redis 카운터를 초기화한다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await serverAuthHeader();

    const response = await mainServerClient.post(
      `/events/${id}/stock/init`,
      undefined,
      { headers: { ...auth } },
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
