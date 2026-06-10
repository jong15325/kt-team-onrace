import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * [데모/관리] 이벤트 신청 전체 초기화 (신청+재고+대기열).
 * 파괴적 동작 — 포트폴리오 데모용.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await serverAuthHeader();

    const response = await mainServerClient.post(
      `/events/${id}/reset`,
      undefined,
      { headers: { ...auth } },
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
