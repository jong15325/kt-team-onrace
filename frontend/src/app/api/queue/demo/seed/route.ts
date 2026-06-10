import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { queueServerClient, serverAuthHeader } from '@/utils/backend';

/**
 * [데모] 대기열 테스트 사용자 주입 BFF.
 * 혼자 신청 시 대기열이 비어 즉시 통과되므로, 가짜 대기자를 주입해
 * 실제 대기→통과 과정을 시연한다. (게이트웨이 queue-route 경유)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = await serverAuthHeader();

    const response = await queueServerClient.post(`/demo/seed`, body, {
      headers: { ...auth },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
