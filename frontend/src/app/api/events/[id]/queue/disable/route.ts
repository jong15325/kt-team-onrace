import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * 이벤트 대기열 비활성화 (포트폴리오 데모용 관리 토글).
 * 게이트웨이 public-route(/main/**) 경유로 main 서비스 호출.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await serverAuthHeader();

    const response = await mainServerClient.post(
      `/events/${id}/queue/disable`,
      undefined,
      { headers: { ...auth } },
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
