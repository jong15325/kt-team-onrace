'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LuPhone,
  LuMail,
  LuClock,
  LuChevronDown,
  LuMessageCircle,
} from 'react-icons/lu';

interface Faq {
  id: number;
  category: string;
  question: string;
  answer: string;
}

const CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'ENTRY', label: '신청·응모' },
  { id: 'QUEUE', label: '대기열' },
  { id: 'PAYMENT', label: '결제·환불' },
  { id: 'DELIVERY', label: '배송' },
  { id: 'ACCOUNT', label: '계정' },
];

const FAQS: Faq[] = [
  {
    id: 1,
    category: 'ENTRY',
    question: '응모(추첨)와 선착순 신청은 어떻게 다른가요?',
    answer:
      '응모는 신청 기간 동안 접수한 뒤 추첨으로 당첨자를 가리는 방식으로, 당첨된 분에 한해 결제가 진행됩니다. 선착순은 신청과 동시에 재고를 선점하고 제한 시간 내 결제를 완료해야 확정되는 방식입니다.',
  },
  {
    id: 2,
    category: 'ENTRY',
    question: '같은 대회에 중복으로 신청할 수 있나요?',
    answer:
      '하나의 대회(이벤트)당 1건만 신청할 수 있습니다. 이미 신청/응모한 대회는 신청 버튼이 비활성화되며, 미결제 선점 상태라면 "결제하기"로 이어서 진행할 수 있습니다.',
  },
  {
    id: 3,
    category: 'ENTRY',
    question: '응모 결과는 어디서 확인하나요?',
    answer:
      '마이페이지 > 신청내역에서 확인할 수 있습니다. 당첨 시 "당첨"으로 표시되며 결제 기한 내 결제를 완료해야 참가가 확정됩니다. 미당첨 시 "미당첨"으로 표시됩니다.',
  },
  {
    id: 4,
    category: 'QUEUE',
    question: '대기열(대기실)은 무엇인가요?',
    answer:
      '접속이 한꺼번에 몰리는 인기 대회의 선착순 신청 시, 서버 안정성과 공정한 신청을 위해 대기열을 운영합니다. 순번이 되면 자동으로 통과되어 신청 화면으로 이동합니다. 새로고침해도 순번은 유지됩니다.',
  },
  {
    id: 5,
    category: 'QUEUE',
    question: '대기 중에 창을 닫으면 순번이 사라지나요?',
    answer:
      '대기 화면을 벗어나면 대기열에서 이탈 처리될 수 있습니다. 통과될 때까지 대기 화면을 유지해 주세요.',
  },
  {
    id: 6,
    category: 'PAYMENT',
    question: '결제는 어떤 수단으로 할 수 있나요?',
    answer:
      '토스페이먼츠를 통한 토스결제로 진행됩니다. 결제 단계에서 안내되는 절차에 따라 진행해 주세요.',
  },
  {
    id: 7,
    category: 'PAYMENT',
    question: '선착순으로 선점했는데 결제하지 않으면 어떻게 되나요?',
    answer:
      '선점(예약)은 제한 시간이 지나면 자동으로 해제되고 재고가 복구됩니다. 이 경우 다시 신청해 주셔야 하며, 마이페이지 > 결제내역의 "결제 대기" 항목에서 결제를 이어갈 수 있습니다.',
  },
  {
    id: 8,
    category: 'PAYMENT',
    question: '결제 취소·환불은 어떻게 하나요?',
    answer:
      '환불은 대회별 환불 규정에 따라 처리됩니다. 환불 가능 기간과 수수료는 각 대회 상세 페이지의 안내를 확인해 주시고, 자세한 사항은 고객센터로 문의해 주세요.',
  },
  {
    id: 9,
    category: 'DELIVERY',
    question: '기념품(배번호표·티셔츠 등)은 언제 배송되나요?',
    answer:
      '기념품은 대회 일정에 맞춰 일괄 발송됩니다. 발송이 시작되면 배송 조회가 가능하며, 완주 메달 등 일부 품목은 현장에서 수령합니다.',
  },
  {
    id: 10,
    category: 'DELIVERY',
    question: '배송지를 변경하고 싶어요.',
    answer:
      '결제 전이라면 결제 페이지의 배송지 선택에서 변경할 수 있습니다. 결제 후 배송지 변경은 발송 전까지만 가능하니 고객센터로 문의해 주세요.',
  },
  {
    id: 11,
    category: 'ACCOUNT',
    question: '회원정보(연락처·비밀번호)는 어디서 변경하나요?',
    answer:
      '마이페이지 > 회원정보 수정에서 변경할 수 있습니다. 정확한 연락처는 대회 안내 수신을 위해 꼭 최신 상태로 유지해 주세요.',
  },
];

export const CustomerSupport = () => {
  const [category, setCategory] = useState('ALL');
  const [openId, setOpenId] = useState<number | null>(null);

  const filtered = FAQS.filter((f) =>
    category === 'ALL' ? true : f.category === category,
  );

  return (
    <div className="max-w-6xl mx-auto min-h-screen">
      <h1 className="text-xl font-bold mb-6 text-gray-800">고객지원</h1>

      {/* 고객센터 안내 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="border border-cta-outline rounded-sm p-5 flex items-start gap-3">
          <LuPhone className="mt-1 text-font-medium" size={20} />
          <div>
            <p className="text-sm text-gray-500 mb-1">고객센터</p>
            <p className="text-lg font-bold text-gray-900">1588-0000</p>
          </div>
        </div>
        <div className="border border-cta-outline rounded-sm p-5 flex items-start gap-3">
          <LuMail className="mt-1 text-font-medium" size={20} />
          <div>
            <p className="text-sm text-gray-500 mb-1">이메일 문의</p>
            <p className="text-lg font-bold text-gray-900">help@on-race.com</p>
          </div>
        </div>
        <div className="border border-cta-outline rounded-sm p-5 flex items-start gap-3">
          <LuClock className="mt-1 text-font-medium" size={20} />
          <div>
            <p className="text-sm text-gray-500 mb-1">운영시간</p>
            <p className="text-base font-semibold text-gray-900">
              평일 10:00 ~ 18:00
            </p>
            <p className="text-xs text-gray-400">주말·공휴일 휴무</p>
          </div>
        </div>
      </section>

      {/* 자주 묻는 질문 */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">자주 묻는 질문</h2>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-1 mb-4">
          {CATEGORIES.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              size="fit"
              rounded="full"
              onClick={() => {
                setCategory(c.id);
                setOpenId(null);
              }}
              className={cn(
                'border',
                category === c.id
                  ? 'border-2 text-black border-black'
                  : 'border text-font-low border-cta-outline',
              )}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {/* FAQ 리스트 */}
        <div className="border-t border-gray-200">
          {filtered.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-font-high font-bold">Q</span>
                    <span className="text-base font-medium text-gray-900">
                      {faq.question}
                    </span>
                  </span>
                  <LuChevronDown
                    className={cn(
                      'shrink-0 text-gray-400 transition-transform',
                      isOpen && 'rotate-180',
                    )}
                    size={20}
                  />
                </button>
                {isOpen && (
                  <div className="flex gap-3 pb-5 pr-8">
                    <span className="text-font-medium font-bold">A</span>
                    <p className="text-sm leading-relaxed text-gray-600">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-500">
              해당 카테고리의 질문이 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* 1:1 문의 안내 */}
      <section className="mt-10 rounded-sm bg-secondary p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LuMessageCircle className="text-font-medium" size={24} />
          <div>
            <p className="text-base font-bold text-gray-900">
              원하는 답변을 찾지 못하셨나요?
            </p>
            <p className="text-sm text-gray-500">
              이메일로 문의하시면 운영시간 내 순차적으로 답변드립니다.
            </p>
          </div>
        </div>
        <a href="mailto:help@on-race.com">
          <Button variant="primary1" rounded="full">
            1:1 문의하기
          </Button>
        </a>
      </section>
    </div>
  );
};
