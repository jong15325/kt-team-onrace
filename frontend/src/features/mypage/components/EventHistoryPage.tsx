'use client';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatKoreanDate } from '@/features/ticketing/utils/date';
import {
  getAppTypeLabel,
  getStatusConfig,
  getStatusLabel,
} from '@/types/constants';
import { cn } from '@/lib/utils';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { myPageService } from '../services';
import { EntriesHistory } from '../types';

export const EventHistoryPage = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchType, setSearchType] = useState<string>('ALL');
  const [eventHistory, setEventHistory] = useState<EntriesHistory[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 컴포넌트가 마운트된 후에만 렌더링을 허용
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!mounted) return;

      try {
        const response = await myPageService.getEntriesHistory();
        setEventHistory(response.data);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    };

    fetchData();
  }, [mounted]);

  // 필터링 로직
  const filteredList = eventHistory.filter((event) =>
    searchType === 'ALL' ? true : event.appType === searchType,
  );

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const appType = [
    { id: 'ALL', label: '전체' },
    { id: 'LOTTERY', label: '응모' },
    { id: 'FIRST_COME', label: '선착순' },
  ];

  const displayStatusLabel = (status: string) => {
    let displayLabel = '';

    switch (status) {
      case 'READY':
        const dateStr = '2026-03-15T09:00:00';
        const date = new Date(dateStr);

        const formattedDate = new Intl.DateTimeFormat('ko-KR', {
          month: 'long', // "3월"
          day: 'numeric', // "15일"
          hour: 'numeric', // "9시"
          minute: 'numeric',
          hour12: false, // 24시간 형식
        }).format(date);

        displayLabel = `${formattedDate} ${getStatusLabel(status)}`;
        break;
      case 'CLOSING_SOON':
        displayLabel = `내일 ${getStatusLabel(status)}`;
        break;
      case 'DRAW_COMPLETED':
        displayLabel = getStatusLabel('END');
        break;
      default:
        displayLabel = getStatusLabel(status);
    }

    return displayLabel;
  };

  return (
    <div className="max-w-6xl mx-auto min-h-screen">
      <h1 className="text-xl font-bold mb-2 text-gray-800">신청 내역</h1>

      <div className="flex flex-wrap gap-1 mb-2">
        {appType.map((type) => (
          <Button
            key={type.id}
            variant="outline"
            size="fit"
            rounded="full"
            onClick={() => {
              setSearchType(type.id);
              setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
            }}
            className={cn(
              'border',
              // searchType !== type.id && 'border-gray-400',

              searchType === type.id
                ? 'border-2 text-black border-black'
                : 'border text-font-low border-cta-outline',
            )}
          >
            {type.label}
          </Button>
        ))}
      </div>

      <div className="bg-white rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-gray-100 border-t border-b border-gray-300">
                <th className="w-[17%] px-4 py-4 text-sm font-semibold text-gray-600 text-center">
                  신청일
                </th>
                <th className="w-[45%] px-6 py-4 text-sm font-semibold text-gray-600 text-left">
                  신청한 이벤트
                </th>
                <th className="w-[17%] px-4 py-4 text-sm font-semibold text-gray-600 text-center">
                  모집 일정
                </th>
                <th className="w-[25%] px-4 py-4 text-sm font-semibold text-gray-600 text-center">
                  신청상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((event, index) => {
                // 미당첨, 당첨 취소 여부 확인
                const isDisabled = [
                  '미당첨',
                  '당첨 취소',
                  '신청 불가',
                ].includes(event.entryStatus);

                return (
                  <tr
                    key={`${event.id}-${index}`}
                    className={cn(
                      'transition-colors',
                      isDisabled ? 'bg-white opacity-50' : '',
                    )}
                  >
                    <td className="px-6 py-6 text-center">
                      <div className="text-sm text-black">
                        {formatKoreanDate(event.date)}
                      </div>
                    </td>

                    <td className="px-6 py-6">
                      <div
                        className={cn(
                          'flex gap-4 items-start',
                          !isDisabled && 'cursor-pointer',
                        )}
                        onClick={() => {
                          if (!isDisabled) {
                            router.push(`/ticketing/${event.eventId}`);
                          }
                        }}
                      >
                        <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-sm bg-gray-200">
                          <img
                            src={event.thumbnail}
                            alt={'이벤트'}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>

                        <div className="flex flex-col flex-1 min-w-0 py-0.5">
                          <div className="flex gap-1 mb-1">
                            <div
                              className={cn(
                                'inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold bg-gray-100 text-gray-500',
                                getStatusConfig(event.status),
                              )}
                            >
                              {displayStatusLabel(event.status)}
                            </div>
                            <div className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold bg-gray-100 text-gray-500">
                              {getAppTypeLabel(event.appType)}
                            </div>
                          </div>

                          <h2 className="font-semibold text-black text-lg truncate mb-1">
                            {event.title}
                          </h2>
                          <div className="flex items-center text-font-medium text-sm min-w-0 mb-1">
                            <span className="truncate shrink-0 max-w-[100px] sm:max-w-[150px]">
                              {formatKoreanDate(event.eventAt)}
                            </span>
                            <span className="mx-1 shrink-0">·</span>
                            <span className="truncate text-gray-500">
                              {event.venue}
                            </span>
                          </div>
                          <div className="mt-auto flex justify-between items-end">
                            <div className="flex items-center text-gray-500 text-sm">
                              <span>{event.pace}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-6 text-center text-sm">
                      <p>{formatKoreanDate(event.appStartAt)}</p>
                      <p>~</p>
                      <p>{formatKoreanDate(event.appEndAt)}</p>
                    </td>

                    <td className="px-6 text-center">
                      <p className="text-base font-semibold pb-1">
                        {event.entryStatus}
                      </p>

                      {/* 조건별 렌더링 유지 */}
                      {(event.entryStatus === '응모 완료' ||
                        event.entryStatus === '발표 대기') && (
                        <p className="text-xs text-font-medium pb-1">
                          당첨 발표일: {formatKoreanDate(event.resultAt)}
                        </p>
                      )}

                      {event.entryStatus === '당첨' && (
                        <div>
                          <p className="text-xs text-font-error pb-1">
                            2026.02.28 (토) 23:59까지
                            <br />
                            결제를 완료해주세요
                          </p>
                          <Button
                            variant="primary1"
                            rounded="sm"
                            size="fit"
                            onClick={() => {
                              router.push(`/ticketing/${event.eventId}/payment`);
                            }}
                          >
                            결제하기
                          </Button>
                        </div>
                      )}

                      {event.entryStatus === '당첨 취소' && (
                        <p className="text-xs text-black pb-1">
                          시간 내 결제를 완료하지 않아
                          <br />
                          당첨이 취소되었습니다.
                        </p>
                      )}

                      {event.entryStatus === '신청 대기' && (
                        <Button
                          variant="outline"
                          rounded="sm"
                          size="fit"
                          onClick={() => {
                            router.push(`/ticketing/${event.eventId}`);
                          }}
                        >
                          사전정보 수정
                        </Button>
                      )}

                      {event.entryStatus === '신청 가능' && (
                        <div>
                          <p className="text-xs text-font-error pb-1">
                            선착순으로 마감되니
                            <br />
                            빠르게 결제를 진행해주세요
                          </p>
                          <Button
                            variant="primary1"
                            rounded="sm"
                            size="fit"
                            onClick={() => {
                              router.push(`/ticketing/${event.eventId}`);
                            }}
                          >
                            신청하기
                          </Button>
                        </div>
                      )}

                      {event.entryStatus === '신청 완료' && (
                        <Button
                          variant="outline"
                          rounded="sm"
                          size="fit"
                          onClick={() => {
                            router.push(
                              `/ticketing/${event.eventId}/payment/details`,
                            );
                          }}
                        >
                          결제 내역 보기
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 컨트롤 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-8 border-t border-gray-100">
            {/* [이전] 버튼: 현재 그룹의 첫 페이지보다 하나 앞으로 이동 */}
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <LuChevronLeft />
            </Button>

            {/* 숫자 버튼 로직: 10개 단위 그룹화 */}
            {(() => {
              const pageGroupSize = 10; // 한 번에 보여줄 페이지 수
              // 현재 페이지가 속한 그룹의 시작 번호 계산 (1, 11, 21...)
              const currentGroup = Math.floor(
                (currentPage - 1) / pageGroupSize,
              );
              const startPage = currentGroup * pageGroupSize + 1;
              // 끝 번호 계산 (10, 20, 30... 단, totalPages를 넘지 않음)
              const endPage = Math.min(
                startPage + pageGroupSize - 1,
                totalPages,
              );

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

            {/* [다음] 버튼: 현재 그룹의 마지막 페이지보다 하나 뒤로 이동 */}
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
