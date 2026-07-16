'use client';

import React, { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radioGroup';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams, useRouter } from 'next/navigation';
import { Label } from '@/components/shadcn/label';
import {
  loadTossPayments,
  TossPaymentsPayment,
} from '@tosspayments/tosspayments-sdk';
import { MdAccessTime, MdImage } from 'react-icons/md';
import { DeliveryFeeTooltip } from '@/features/ticketing/components/DeliveryFeeTooltip';
import { useEventStore } from '@/features/event/store/useEventStore';
import { MultiProductSelect } from '@/features/order/components';
import { orderService } from '@/features/order/services';
import { addressService } from '@/features/address/services';
import { CheckoutInfoResponse } from '@/features/order/types';
import { Address } from '@/features/address/types';
import { formatKoreanDate } from '@/features/ticketing/utils/date';

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';

// 공통 섹션 (좌측 제목 | 우측 내용) — 컴포넌트 밖에 정의해 리렌더 시 remount 방지
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row border-b border-gray-100 py-8 last:border-0">
      <div className="w-full md:w-1/5 mb-4 md:mb-0 flex items-center gap-2 self-start">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      </div>
      <div className="w-full md:w-4/5">{children}</div>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { event, courseId, paceId, selectedBasicOption, setSelectedBasicOption } =
    useEventStore();

  const [isError, setIsError] = useState(false);
  const [info, setInfo] = useState<CheckoutInfoResponse | null>(null);
  const [infoError, setInfoError] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [deliveryMemo, setDeliveryMemo] = useState('');
  const [agree, setAgree] = useState({
    terms: false,
    privacy: false,
    refund: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const [payment, setPayment] = useState<TossPaymentsPayment | null>(null);

  // 결제 준비 정보 + 저장된 배송지 조회
  useEffect(() => {
    if (!event?.id || courseId == null || paceId == null) return;
    let active = true;

    orderService
      .postOrderCheckoutInfo({
        eventId: event.id,
        eventCourseId: courseId,
        eventPaceId: paceId,
      })
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          setInfoError(true);
          return;
        }
        setInfo(res.data);
        if (res.data.shippingAddress.hasAddress) {
          setSelectedAddressId(res.data.shippingAddress.addressId);
        }
      })
      .catch(() => {
        if (active) setInfoError(true);
      });

    addressService
      .getAddress()
      .then((res) => {
        if (!active || !res.success) return;
        // 백엔드 /address 는 data 에 배열을 직접 반환(flat). mock 은 {data:[]} 형태 → 둘 다 대응
        const raw = res.data as unknown as Address[] | { data?: Address[] };
        const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setAddresses(list);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [event?.id, courseId, paceId]);

  // Toss SDK 초기화 (clientKey 미설정 시 결제창 비활성 — 주문 생성까지는 동작)
  useEffect(() => {
    if (!clientKey) return;
    let active = true;
    (async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        const instance = tossPayments.payment({ customerKey: 'ANONYMOUS' });
        if (active) setPayment(instance);
      } catch (e) {
        console.error('Toss SDK 초기화 실패:', e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ---- 파생 값 (모두 서버계산 기반) ----
  const reqInfo = info?.orderRequestInfo;
  const detail = info?.paymentDetail;
  const packageOptions = (info?.packages ?? []).map((p) => ({
    value: String(p.id),
    label: p.name,
    price: p.price,
  }));
  const packagesPrice = selectedPackageIds.reduce((sum, id) => {
    const p = info?.packages.find((x) => String(x.id) === id);
    return sum + (p ? Number(p.price) : 0);
  }, 0);
  const itemTotal = detail?.itemTotalAmount ?? 0;
  const shippingFee = detail?.shippingFee ?? 0;
  const discountAmount = detail?.discountAmount ?? 0;
  // 최종금액 = 서버 base finalAmount + 선택 패키지 합계 (백엔드가 checkout에서 재검증)
  const finalAmount = (detail?.finalAmount ?? 0) + packagesPrice;

  const allAgreed = agree.terms && agree.privacy && agree.refund;
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  async function handlePayment() {
    if (!info || !event?.id || courseId == null || paceId == null) return;
    if (selectedAddressId == null) {
      alert('배송지를 선택해주세요.');
      return;
    }
    if (!allAgreed) {
      alert('필수 약관에 동의해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      // 1) 주문 생성 → 진짜 orderNumber 발급 (서버가 금액/토큰 재검증)
      const res = await orderService.postOrderCheckout({
        prepareToken: info.prepareToken,
        eventId: event.id,
        eventCourseId: courseId,
        eventPaceId: paceId,
        selectedPackageIds: selectedPackageIds.map(Number),
        expectedFinalAmount: finalAmount,
        addressId: selectedAddressId,
        deliveryMemo,
      });
      if (!res.success) return;

      const { orderNumber, orderName, amount } = res.data;

      // 2) Toss 결제창 (clientKey 미설정 시 안내 — 주문은 생성됨)
      if (!payment) {
        alert(
          `주문이 생성되었습니다 (주문번호: ${orderNumber}).\nToss 클라이언트 키 설정 후 결제가 가능합니다.`,
        );
        return;
      }

      const baseOptions = {
        amount: { currency: 'KRW' as const, value: amount },
        orderId: orderNumber, // ★ 백엔드 orderNumber 사용
        orderName: orderName ?? reqInfo?.eventName ?? '결제 상품',
        successUrl: `${window.location.origin}/ticketing/${params.id}/payment/completed`,
        failUrl: `${window.location.origin}/ticketing/${params.id}/fail`,
      };

      // 결제수단 토스페이로 통일 (간편결제 TOSSPAY)
      await payment.requestPayment({
        method: 'CARD',
        ...baseOptions,
        card: { flowMode: 'DIRECT', easyPay: 'TOSSPAY' },
      });
    } catch (error: any) {
      console.error('결제 요청 실패:', error);
      // 선점 만료(ENT_014): 결제 불가 → 다시 신청하도록 상세로 안내
      const code = error?.response?.data?.code;
      if (code === 'ENT_014') {
        alert('예약이 만료되었습니다. 다시 신청해주세요.');
        router.push(`/ticketing/${params.id}`);
        return;
      }
      alert('결제 진행 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!event) {
    return <div className="p-10 text-center">대회를 찾을 수 없습니다.</div>;
  }

  if (infoError) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-font-medium">
          결제 정보를 불러오지 못했습니다. 예약이 만료되었거나 신청 상태가
          아닐 수 있습니다.
        </p>
        <Button rounded="full" onClick={() => router.push(`/ticketing/${params.id}`)}>
          상세로 돌아가기
        </Button>
      </div>
    );
  }

  if (!info) {
    return <div className="p-20 text-center">결제 정보를 불러오는 중...</div>;
  }

  return (
    <div className="bg-white max-w-7xl mx-auto px-30">
      <div className="w-full bg-black text-white p-3 mb-2">
        <div className="flex items-center text-sm text-font-accent">
          <MdAccessTime className="mr-1" />
          <span className="px-2 text-base text-white">
            예약 시간 내 결제를 완료하지 않으면 자동 취소됩니다
          </span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto py-4">
        <header className="text-black">
          <h2 className="text-3xl font-bold">주문/결제</h2>
          <div className="my-2 h-[2px] bg-black"></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* 왼쪽: 입력 폼 */}
          <div className="lg:col-span-8">
            {/* 주문 상품 */}
            <FormSection title="주문상품">
              <div className="flex flex-col gap-4">
                <div className="flex gap-6">
                  <div className="w-30 h-30 flex-shrink-0">
                    {!reqInfo?.thumbnailUrl || isError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <MdImage size={100} />
                      </div>
                    ) : (
                      <img
                        src={reqInfo.thumbnailUrl}
                        alt={reqInfo.eventName}
                        className="w-full h-full object-cover rounded-sm"
                        onError={() => setIsError(true)}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {reqInfo?.eventName ?? event.title}
                    </h3>
                    <div className="flex flex-col text-sm">
                      <span className="flex items-center py-1 rounded text-sm text-gray-500 font-semibold">
                        <span>
                          {formatKoreanDate(reqInfo?.eventAt ?? '', true)}
                        </span>
                        <span className="px-1">•</span>
                        <span>{reqInfo?.venue}</span>
                      </span>
                      <div className="flex items-center">
                        <span className="text-base mr-1 text-black">
                          {(reqInfo?.coursePrice ?? 0).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex">
                    <span className="w-28 text-base text-font-medium font-medium">
                      코스
                    </span>
                    <span className="flex-1">{reqInfo?.courseName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-base text-font-medium font-medium">
                      페이스
                    </span>
                    <span className="flex-1">{reqInfo?.paceName}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-28 flex items-center text-base text-font-medium font-medium">
                      기본 옵션1
                    </span>
                    <div className="w-full rounded-sm px-4 pb-0">
                      <span className="text-medium">기념 티셔츠</span>
                      <Select
                        value={selectedBasicOption}
                        onValueChange={setSelectedBasicOption}
                      >
                        <SelectTrigger variant="default" selectSize="sm">
                          <SelectValue placeholder="사이즈를 선택해주세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="option1">S(90~95)</SelectItem>
                          <SelectItem value="option2">M(95~100)</SelectItem>
                          <SelectItem value="option3">L(100~105)</SelectItem>
                          <SelectItem value="option4">XL(105~120)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="w-28 flex items-center text-base text-font-medium font-medium">
                      기본 옵션2
                    </span>
                    <div className="w-full rounded-sm px-4 pb-0 text-medium">
                      완주 메달 (완주자에 한해 현장 증정됩니다.)
                    </div>
                  </div>

                  {packageOptions.length > 0 && (
                    <div className="flex items-start">
                      <span className="w-28 flex items-center text-base text-font-medium font-medium">
                        선택 옵션
                      </span>
                      <div className="w-full rounded-sm px-4 pb-0">
                        <MultiProductSelect
                          options={packageOptions}
                          selectSize="sm"
                          variant="default"
                          selectedIds={selectedPackageIds}
                          onSelectionChange={setSelectedPackageIds}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </FormSection>

            {/* 배송지 */}
            <FormSection title="배송지 정보">
              {addresses.length === 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-base text-font-medium">
                    등록된 배송지가 없습니다.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    rounded="sm"
                    onClick={() => router.push('/mypage')}
                  >
                    배송지 등록
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="max-w-md">
                    <Select
                      value={
                        selectedAddressId != null ? String(selectedAddressId) : ''
                      }
                      onValueChange={(v) => setSelectedAddressId(Number(v))}
                    >
                      <SelectTrigger variant="default">
                        <SelectValue placeholder="배송지를 선택해주세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.label} {a.isDefault ? '(기본)' : ''} · {a.address1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAddress && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-black">
                          {selectedAddress.label}
                        </span>
                        {selectedAddress.isDefault && (
                          <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 font-bold rounded-sm">
                            기본배송지
                          </span>
                        )}
                      </div>
                      <div className="text-base font-medium">
                        {selectedAddress.address1} {selectedAddress.address2}
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        {selectedAddress.receiverName} -{' '}
                        {selectedAddress.phone}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <p className="text-base text-font-medium font-medium">
                      배송요청사항
                    </p>
                    <div className="flex-1 max-w-xs">
                      <Select value={deliveryMemo} onValueChange={setDeliveryMemo}>
                        <SelectTrigger variant="default" selectSize="sm">
                          <SelectValue placeholder="배송 요청사항을 선택해주세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="문 앞에 놓아주세요">
                            문 앞에 놓아주세요
                          </SelectItem>
                          <SelectItem value="경비실에 맡겨주세요">
                            경비실에 맡겨주세요
                          </SelectItem>
                          <SelectItem value="배송 전 연락주세요">
                            배송 전 연락주세요
                          </SelectItem>
                          <SelectItem value="직접 수령">직접 수령</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </FormSection>

            {/* 결제 수단 — 토스결제 단일 */}
            <FormSection title="결제 수단">
              <RadioGroup value="TOSS" className="gap-2">
                <label
                  htmlFor="TOSS"
                  className="flex items-center text-base font-medium"
                >
                  <RadioGroupItem className="mr-2" value="TOSS" id="TOSS" />
                  <span>토스결제</span>
                </label>
              </RadioGroup>
            </FormSection>
          </div>

          {/* 오른쪽: 결제 금액 카드 */}
          <div className="lg:col-span-4">
            <h2 className="text-xl font-bold pt-6 pb-4">최종 결제금액</h2>
            <div className="sticky top-12 p-6 border border-gray-200 rounded-sm">
              <div className="flex justify-between items-center mb-2 text-lg font-medium">
                <span>총 상품 금액</span>
                <span>{(itemTotal + packagesPrice).toLocaleString()}원</span>
              </div>
              <div className="space-y-2 pl-4 mb-2">
                <div className="flex justify-between items-center text-base text-font-medium">
                  <span>상품 금액</span>
                  <span>{itemTotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center text-base text-font-medium">
                  <span>상품 할인 금액</span>
                  <span>-{discountAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center text-base text-font-medium">
                  <span>추가 옵션</span>
                  <span>{packagesPrice.toLocaleString()}원</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4 text-lg">
                <div className="flex items-center text-lg font-medium">
                  <span className="mr-1">배송비</span>
                  <DeliveryFeeTooltip />
                </div>
                <span>
                  {shippingFee === 0
                    ? '무료'
                    : shippingFee.toLocaleString() + '원'}
                </span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">최종 결제 금액</span>
                <span className="text-xl font-bold">
                  {finalAmount.toLocaleString()}원
                </span>
              </div>

              <div className="h-[1px] bg-gray-200 my-6 w-full" />

              {/* 필수 약관 동의 */}
              <div className="px-1 pb-2 space-y-2">
                {[
                  { key: 'terms', label: '(필수) 결제 대행 서비스 이용약관' },
                  { key: 'privacy', label: '(필수) 개인정보 처리 및 수집' },
                  { key: 'refund', label: '(필수) 예매 취소 및 환불 정책 동의' },
                ].map((t) => (
                  <div key={t.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={t.key}
                      variant="primary"
                      checked={agree[t.key as keyof typeof agree]}
                      onCheckedChange={() =>
                        setAgree((prev) => ({
                          ...prev,
                          [t.key]: !prev[t.key as keyof typeof agree],
                        }))
                      }
                    />
                    <Label
                      htmlFor={t.key}
                      className="text-sm text-gray-600 cursor-pointer"
                    >
                      {t.label}
                    </Label>
                  </div>
                ))}
              </div>

              <Button
                rounded="full"
                onClick={handlePayment}
                disabled={!info || !allAgreed || submitting}
              >
                {submitting
                  ? '처리 중…'
                  : `${finalAmount.toLocaleString()}원 토스페이로 결제하기`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
