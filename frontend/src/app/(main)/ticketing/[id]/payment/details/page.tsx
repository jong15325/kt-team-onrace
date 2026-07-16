'use client';

import React, { Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { formatKoreanDate } from '@/features/ticketing/utils/date';
import { orderService } from '@/features/order/services';
import { myPageService } from '@/features/mypage/services';
import { OrderDetail } from '@/features/order/types';
import { AccountInfo } from '@/features/mypage/types';

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  CANCELLED: '결제 취소',
  EXPIRED: '만료됨',
  FAILED: '결제 실패',
};

// 공통 섹션 (좌측 제목 | 우측 내용)
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row border-b border-gray-100 py-10 last:border-0">
      <div className="w-full md:w-1/5 mb-4 md:mb-0 flex items-center gap-2 self-start">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      </div>
      <div className="w-full md:w-4/5">{children}</div>
    </div>
  );
}

function OrderDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 진입점에 따라 orderNumber 가 직접 오거나(?orderNumber), eventId(path)로 완료 주문을 찾아 조회
  const orderNumberParam =
    searchParams.get('orderNumber') ?? searchParams.get('orderId');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);

        let orderNo: string | null = orderNumberParam;

        // orderNumber 가 없으면 eventId 로 완료(또는 대기) 주문을 자동 조회
        if (!orderNo) {
          const eventIdNum = Number(params.id);
          const completed = await orderService.getOrder('completed');
          let found = completed.success
            ? completed.data.orders.find((o) => o.eventId === eventIdNum)
            : undefined;

          if (!found) {
            const pending = await orderService.getOrder('pending');
            found = pending.success
              ? pending.data.orders.find((o) => o.eventId === eventIdNum)
              : undefined;
          }

          orderNo = found?.orderNumber ?? null;
        }

        if (!orderNo) {
          if (active) setError(true);
          return;
        }

        const [detailRes, accountRes] = await Promise.all([
          orderService.getOrderDetails(orderNo),
          myPageService.getAccountInfo().catch(() => null),
        ]);

        if (!active) return;

        if (!detailRes.success) {
          setError(true);
          return;
        }

        setDetail(detailRes.data);
        if (accountRes?.success) setAccount(accountRes.data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [params.id, orderNumberParam]);

  if (loading) {
    return <div className="p-20 text-center">결제 상세를 불러오는 중...</div>;
  }

  if (error || !detail) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-font-medium">결제 상세 내역을 불러오지 못했습니다.</p>
        <Button
          rounded="full"
          onClick={() => router.push(`/ticketing/${params.id}`)}
        >
          상세로 돌아가기
        </Button>
      </div>
    );
  }

  const fullAddress = [detail.address, detail.detailAddress]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="bg-white max-w-7xl mx-auto px-30 py-4">
      <header className="mb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          결제 상세내역
        </h1>
        <div className="my-2 h-[2px] bg-black"></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* 왼쪽 영역 */}
        <div className="lg:col-span-8">
          {/* 주문 현황 */}
          <FormSection title="주문현황">
            <div className="flex-1 space-y-2">
              <div className="flex">
                <span className="w-28 text-gray-600">주문번호</span>
                <span className="flex-1">{detail.orderNumber}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-gray-600">주문일시</span>
                <span className="flex-1">
                  {formatKoreanDate(detail.createdAt, true)}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-28 text-gray-600">주문상태</span>
                <span className="flex-1 font-semibold">
                  {ORDER_STATUS_LABEL[detail.orderStatus] ?? detail.orderStatus}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-28 text-gray-600">배송현황</span>
                <span className="flex-1"> - </span>
                <Button variant="outline" size="fit" disabled>
                  배송조회
                </Button>
              </div>
            </div>
          </FormSection>

          {/* 주문 상품 */}
          <FormSection title="주문 상품">
            <div className="flex flex-col gap-4">
              <div className="flex gap-6">
                <div className="w-30 h-30 flex-shrink-0">
                  <img
                    src={detail.thumbnailUrl ?? ''}
                    alt={detail.eventTitle}
                    className="w-full h-full object-cover rounded-sm bg-gray-100"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black">
                    {detail.eventTitle}
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="fit"
                  onClick={() => router.push(`/ticketing/${detail.eventId}`)}
                >
                  상세보기
                </Button>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex">
                  <span className="w-28 text-gray-600">코스</span>
                  <span className="flex-1">{detail.courseName ?? '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-600">페이스</span>
                  <span className="flex-1">{detail.paceName ?? '-'}</span>
                </div>
                <div className="flex text-base">
                  <span className="w-28 text-gray-600 flex items-start">
                    기본 옵션1
                  </span>
                  <div className="flex-1">
                    <span>기념 티셔츠</span>
                    <span className="text-gray-600"> | </span>
                    <span className="font-semibold">무료</span>
                  </div>
                </div>
                <div className="flex text-base">
                  <span className="w-28 text-gray-600 flex items-center">
                    기본 옵션2
                  </span>
                  <div className="flex-1">
                    <span>완주 메달</span>
                    <span className="text-gray-600"> | </span>
                    <span className="text-gray-600">완주자에 한해 현장 증정</span>
                  </div>
                </div>
                {detail.packages.length > 0 && (
                  <div className="flex text-base font-medium">
                    <span className="w-28 text-gray-600 flex items-start">
                      선택 옵션
                    </span>
                    <div className="flex-1 flex flex-col gap-2">
                      {detail.packages.map((pkg) => (
                        <div key={pkg.eventPackageId}>
                          <span>{pkg.name}</span>
                          <span className="text-gray-600"> | </span>
                          <span className="font-semibold">
                            {pkg.price.toLocaleString()}원
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* 참가자 정보 (계정 정보 재사용) */}
          <FormSection title="참가자 정보">
            <div className="flex-1 space-y-2">
              <div className="flex text-base">
                <span className="w-28 text-gray-600">이름</span>
                <span className="flex-1">{account?.name ?? '-'}</span>
              </div>
              <div className="flex items-center">
                <span className="w-28 text-gray-600">휴대폰번호</span>
                <span className="flex-1">{account?.phoneNumber ?? '-'}</span>
              </div>
              <div className="flex items-center">
                <span className="w-28 text-gray-600">이메일</span>
                <span className="flex-1">{account?.email ?? '-'}</span>
              </div>
            </div>
          </FormSection>

          {/* 배송지 정보 */}
          <FormSection title="배송지 정보">
            <div className="space-y-1">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-bold text-gray-900">
                  {detail.addressLabel ?? '배송지'}
                </span>
              </div>
              <div className="text-base font-semibold">
                {fullAddress || '-'}
                {detail.zipCode ? ` (${detail.zipCode})` : ''}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">
                  {detail.recipientName ?? '-'}
                  {detail.recipientPhone ? ` - ${detail.recipientPhone}` : ''}
                </span>
              </div>
              {detail.deliveryMemo && (
                <div className="pt-3 flex items-center gap-3">
                  <p className="text-base text-gray-500">배송요청사항</p>
                  <span className="text-sm font-semibold">
                    {detail.deliveryMemo}
                  </span>
                </div>
              )}
            </div>
          </FormSection>

          {/* 결제 수단 */}
          <FormSection title="결제 수단">
            <span className="text-lg font-semibold">토스결제</span>
          </FormSection>
        </div>

        {/* 오른쪽 영역: 결제 금액 */}
        <div className="lg:col-span-4">
          <h2 className="text-xl font-bold mb-4">최종 결제금액</h2>
          <div className="sticky top-12 p-6 border border-gray-200 rounded-sm">
            <div className="flex justify-between items-center mb-2">
              <span>총 상품 금액</span>
              <span className="font-medium text-gray-900">
                {detail.itemTotalAmount.toLocaleString()}원
              </span>
            </div>
            <div className="space-y-2 pl-4 mb-2">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>상품 금액</span>
                <span>{detail.itemTotalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>상품 할인 금액</span>
                <span>-{detail.discountAmount.toLocaleString()}원</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span>배송비</span>
              <span>
                {detail.shippingFee === 0
                  ? '무료'
                  : detail.shippingFee.toLocaleString() + '원'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-bold">최종 결제 금액</span>
              <span className="text-xl font-bold">
                {detail.finalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentDetailsPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailContent />
    </Suspense>
  );
}
