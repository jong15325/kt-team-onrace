'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HiCheckCircle } from 'react-icons/hi2';
import { useEffect, useRef, useState } from 'react';
import { orderService } from '@/features/order/services';
import { PaymentConfirmResponse } from '@/features/order/types';

export default function PaymentCompletedPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [data, setData] = useState<PaymentConfirmResponse>();
  const confirmedRef = useRef(false);

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  // 백엔드(/api/payments/confirm) 경유 결제 확정 — Order PAID + Entry APPLIED + 재고확정
  useEffect(() => {
    if (!paymentKey || !orderId || !amount) return;
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    orderService
      .postPaymentConfirm({
        paymentKey,
        orderId,
        amount: Number(amount),
      })
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setIsConfirmed(true);
        } else {
          router.replace(`/ticketing/${params.id}/fail`);
        }
      })
      .catch(() => {
        router.replace(`/ticketing/${params.id}/fail`);
      });
  }, [paymentKey, orderId, amount, params.id, router]);

  if (!isConfirmed || !data) {
    return (
      <div className="flex items-center justify-center p-20">
        <p>결제 승인 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-white p-4">
      <div className="text-green-500">
        <HiCheckCircle size={80} />
      </div>
      <div className="text-3xl text-center p-4">
        결제가 <br />
        정상적으로 완료되었습니다
      </div>
      <div className="max-w-md w-full space-y-6 p-4 rounded-sm border border-gray-300 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-xl text-black font-semibold">주문정보</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-base text-font-medium">주문번호</span>
          <span className="text-base font-medium">{data.orderId}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-base text-font-medium">결제수단</span>
          <span className="text-base font-medium">{data.method}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-base text-font-medium">결제상태</span>
          <span className="text-base font-medium">{data.status}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-base text-font-medium">결제 금액</span>
          <span className="text-base font-medium">
            {Number(data.totalAmount).toLocaleString()}원
          </span>
        </div>
      </div>

      <div className="max-w-md w-full flex gap-2 items-center justify-center">
        <Button
          variant="secondary"
          rounded="full"
          size="lg"
          onClick={() => router.push('/')}
        >
          홈으로 이동하기
        </Button>
        <Button
          variant="primary1"
          rounded="full"
          size="lg"
          onClick={() => router.push('/mypage')}
        >
          주문 내역 보기
        </Button>
      </div>
    </div>
  );
}
