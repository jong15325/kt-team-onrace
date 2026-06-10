'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import { formatKoreanDate } from '@/features/ticketing/utils/date';
import { useRouter } from 'next/navigation';
import { myPageService } from '../services';
import { orderService } from '@/features/order/services';

/**
 * 결제내역 = 결제 대기 + 결제 완료
 * - 결제 대기: 신청(entry) 중 결제 가능하지만 미결제인 상태
 *   (선착순=RESERVED → '신청 가능' 라벨 / 응모=WON → '당첨' 라벨). order 가 아직 없음.
 * - 결제 완료: 결제까지 끝난 주문(PAID order).
 * → "결제 대기"는 order 이전 개념이므로 orderStatus 로 판단하지 않고 entry 로 판단한다.
 */

type PaymentRowKind = 'PENDING' | 'PAID';

interface PaymentRow {
  key: string;
  kind: PaymentRowKind;
  eventId: number;
  orderNumber?: string;
  title: string;
  thumbnail: string;
  courseName: string;
  paceName: string;
  date: string;
  amount?: number;
}

const STATUS_FILTERS = [
  { id: 'ALL', label: '전체' },
  { id: 'PENDING', label: '결제 대기' },
  { id: 'PAID', label: '결제 완료' },
];

const KIND_LABEL: Record<PaymentRowKind, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
};

export const PaymentHistoryPage = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchData = async () => {
      try {
        const [entriesRes, completedRes] = await Promise.all([
          myPageService.getEntriesHistory(),
          orderService.getOrder('completed'),
        ]);

        // 결제 대기: 선착순 '신청 가능'(RESERVED) / 응모 '당첨'(WON)
        const pendingRows: PaymentRow[] = (
          entriesRes.success ? entriesRes.data : []
        )
          .filter(
            (e) =>
              (e.appType === 'FIRST_COME' && e.entryStatus === '신청 가능') ||
              (e.appType === 'LOTTERY' && e.entryStatus === '당첨'),
          )
          .map((e) => ({
            key: `entry-${e.id}`,
            kind: 'PENDING' as const,
            eventId: e.eventId,
            title: e.title,
            thumbnail: e.thumbnail,
            courseName: e.course,
            paceName: e.pace,
            date: e.date,
          }));

        // 결제 완료: PAID order
        const paidRows: PaymentRow[] = (
          completedRes.success ? completedRes.data.orders : []
        ).map((o) => ({
          key: `order-${o.orderNumber}`,
          kind: 'PAID' as const,
          eventId: o.eventId,
          orderNumber: o.orderNumber,
          title: o.eventTitle,
          thumbnail: o.thumbnailUrl ?? '',
          courseName: o.courseName ?? '-',
          paceName: o.paceName ?? '-',
          date: o.createdAt,
          amount: o.finalAmount,
        }));

        const merged = [...pendingRows, ...paidRows].sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setRows(merged);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    };

    fetchData();
  }, [mounted]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.kind === 'PENDING').length,
    [rows],
  );
  const paidCount = useMemo(
    () => rows.filter((r) => r.kind === 'PAID').length,
    [rows],
  );

  const filteredList = rows.filter((r) =>
    statusFilter === 'ALL' ? true : r.kind === statusFilter,
  );

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(startIndex, startIndex + itemsPerPage);

  const goRow = (row: PaymentRow) => {
    if (row.kind === 'PAID' && row.orderNumber) {
      // 결제 완료 → 주문 상세
      router.push(
        `/ticketing/${row.eventId}/payment/details?orderNumber=${row.orderNumber}`,
      );
    } else {
      // 결제 대기 → 이벤트 상세(결제하기 흐름 재사용)
      router.push(`/ticketing/${row.eventId}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-screen">
      <h1 className="text-xl font-bold mb-2 text-gray-800">결제 내역</h1>

      {/* 상단 요약 (실데이터 기반) */}
      <div className="flex mb-10 border border-cta-outline rounded-sm">
        <div className="flex-1 bg-white p-6 flex justify-around items-center">
          <div className="flex flex-col items-center flex-1">
            <span
              className={cn(
                'text-xl border-b mb-1',
                pendingCount === 0
                  ? 'text-font-disabled border-font-disabled'
                  : 'text-font-medium border-font-medium',
              )}
            >
              {pendingCount}
            </span>
            <span className="text-base font-medium">결제 대기</span>
          </div>
          <LuChevronRight className="text-gray-400" size={16} />
          <div className="flex flex-col items-center flex-1">
            <span
              className={cn(
                'text-xl border-b mb-1',
                paidCount === 0
                  ? 'text-font-disabled border-font-disabled'
                  : 'text-font-medium border-font-medium',
              )}
            >
              {paidCount}
            </span>
            <span className="text-base font-medium">결제 완료</span>
          </div>
        </div>
      </div>

      {/* 상태 필터 */}
      <div className="flex flex-wrap gap-1 mb-2">
        {STATUS_FILTERS.map((type) => (
          <Button
            key={type.id}
            variant="outline"
            size="fit"
            rounded="full"
            onClick={() => {
              setStatusFilter(type.id);
              setCurrentPage(1);
            }}
            className={cn(
              'border',
              statusFilter === type.id
                ? 'border-2 text-black border-black'
                : 'border text-font-low border-cta-outline',
            )}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* 결제 리스트 */}
      <div className="bg-white rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100 border-t border-b border-gray-300 font-medium text-sm text-font-medium text-center">
                <th className="py-4">주문번호/일자</th>
                <th className="py-4">주문상품</th>
                <th className="py-4">주문상태</th>
                <th className="py-4">결제금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.length > 0 ? (
                currentItems.map((row) => (
                  <tr
                    key={row.key}
                    className="transition-colors hover:bg-gray-50 cursor-pointer"
                    onClick={() => goRow(row)}
                  >
                    <td className="px-6 py-6 text-center">
                      <div className="text-sm text-font-medium mb-2">
                        <span className="border-b border-font-medium">
                          {row.orderNumber ?? '결제 전'}
                        </span>
                      </div>
                      <div className="text-sm text-black">
                        {formatKoreanDate(row.date)}
                      </div>
                    </td>

                    <td className="px-6 py-6">
                      <div className="flex gap-4 items-start">
                        <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-sm bg-gray-200">
                          <img
                            src={row.thumbnail}
                            alt={'이벤트'}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex flex-col flex-1 min-w-0 py-0.5">
                          <h2 className="font-bold text-black text-lg truncate">
                            {row.title}
                          </h2>
                          <div className="mt-auto flex items-center text-gray-500 text-sm">
                            <span>{row.courseName}</span>
                            <span className="mx-1 shrink-0">·</span>
                            <span>{row.paceName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-6 text-center text-sm">
                      <span
                        className={cn(
                          'font-medium',
                          row.kind === 'PENDING'
                            ? 'text-font-error'
                            : 'text-black',
                        )}
                      >
                        {KIND_LABEL[row.kind]}
                      </span>
                    </td>

                    <td className="px-6 py-6 font-semibold text-center text-base">
                      {row.amount != null
                        ? `${row.amount.toLocaleString('ko-KR')}원`
                        : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-20 text-center text-gray-500 text-sm"
                  >
                    결제 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-8 border-t border-gray-100">
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <LuChevronLeft />
            </Button>

            {(() => {
              const pageGroupSize = 10;
              const currentGroup = Math.floor((currentPage - 1) / pageGroupSize);
              const startPage = currentGroup * pageGroupSize + 1;
              const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);

              return Array.from(
                { length: endPage - startPage + 1 },
                (_, i) => startPage + i,
              ).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'primary1' : 'ghost'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ));
            })()}

            <Button
              variant="ghost"
              size="iconSm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              <LuChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
