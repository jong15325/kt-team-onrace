import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import axios from 'axios';

// 서버 측 전용 Axios 인스턴스
const backendClient = axios.create({
  baseURL: process.env.MAIN_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // 경쟁률 조회 (공개) — courseId/paceId 쿼리 전달
    const response = await backendClient.get(`/events/${id}/entries/rate`, {
      params: queryParams,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
