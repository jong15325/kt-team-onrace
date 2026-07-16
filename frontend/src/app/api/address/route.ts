import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

export async function GET() {
  try {
    const authHeader = await serverAuthHeader();
    const response = await mainServerClient.get('/address', {
      headers: authHeader,
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authHeader = await serverAuthHeader();
    const response = await mainServerClient.post('/address', body, {
      headers: authHeader,
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
