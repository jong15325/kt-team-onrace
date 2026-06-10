import { NextResponse } from 'next/server';
import { handleApiError } from '@/utils/api';
import { mainServerClient, serverAuthHeader } from '@/utils/backend';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = await serverAuthHeader();
    const response = await mainServerClient.get(`/address/${id}`, {
      headers: authHeader,
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const authHeader = await serverAuthHeader();
    const response = await mainServerClient.put(`/address/${id}`, body, {
      headers: authHeader,
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = await serverAuthHeader();
    const response = await mainServerClient.delete(`/address/${id}`, {
      headers: authHeader,
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return handleApiError(error);
  }
}
