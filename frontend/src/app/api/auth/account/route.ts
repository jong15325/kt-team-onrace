import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { accountServerClient, serverAuthHeader } from '@/utils/backend';

export async function DELETE(request: Request) {
  try {
    // 비밀번호 재확인 바디(WithdrawRequest). 바디가 없으면 빈 객체.
    const body = await request.json().catch(() => ({}));
    const authHeader = await serverAuthHeader();

    const response = await accountServerClient.delete('/account', {
      headers: authHeader,
      data: body,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
