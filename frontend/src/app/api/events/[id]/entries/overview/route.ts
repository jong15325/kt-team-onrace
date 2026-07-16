import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * 참여 정보 확인 (hasEntry/entry.status/courses/rateInfo).
 * 인증은 선택 — 로그인 시 serverAuthHeader로 토큰 전달 → 게이트웨이가 X-User-Id 주입 → hasEntry 정확.
 * 비로그인 시 hasEntry=false.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await serverAuthHeader();

    const response = await mainServerClient.get(
      `/events/${id}/entries/overview`,
      { headers: { ...auth } },
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
