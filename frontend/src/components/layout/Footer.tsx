'use client';

import Link from 'next/link';
import ChallengeBanner from './contents/ChallengeBanner';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export default function Footer() {
  const pathname = usePathname();

  const isHome = pathname === '/';
  return (
    <footer
      className={cn(
        'border-t border-gray-100 ',
        isHome ? 'bg-black' : 'bg-white',
      )}
    >
      {isHome && <ChallengeBanner />}

      <div
        className={cn(
          'max-w-7xl mx-auto px-30 py-4  border-t',
          isHome ? 'border-gray-700' : 'border-gray-100',
        )}
      >
        <div className="flex flex-col md:flex-row justify-between gap-10">
          {/* 왼쪽: 로고 및 설명 */}
          <div className="w-2/3">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src={
                  isHome
                    ? '/image/logo/logo_white.png'
                    : '/image/logo/logo_black.png'
                }
                alt="Logo"
                width={16}
                height={16}
              />
              <h2
                className={cn(
                  'text-xl font-semibold',
                  isHome ? 'text-white' : 'text-black',
                )}
              >
                Race
              </h2>
            </div>
            <div
              className={cn(
                'space-y-1  text-sm py-6',
                isHome ? 'text-font-low' : 'text-gray-500',
              )}
            >
              <p>
                (주) 온레이스 | 대표이사 홍길동 | 서울 특별시 강남구 테헤란로
                123
              </p>
              <p>고객센터: 1234-5678 | 이메일: help@contact.com</p>
              <p>
                사업자등록번호: 123-45-67890 | 통신판매업신고:
                제2026-서울강남-12345호
                <Button
                  variant="link"
                  size="fit"
                  className={cn(
                    'text-sm font-bold',
                    isHome
                      ? 'text-white hover:text-font-medium'
                      : 'text-font-medium hover:text-gray-500',
                  )}
                >
                  사업자 정보 확인
                </Button>
              </p>
            </div>
          </div>

          {/* 오른쪽: 서비스 메뉴 및 고객센터 */}
          <div className="flex gap-12">
            {/* 서비스 섹션 */}
            <div>
              <h3
                className={cn(
                  'text-base font-semibold uppercase tracking-wider mb-4',
                  isHome ? 'text-white' : 'text-black',
                )}
              >
                서비스
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/event"
                    className={cn(
                      'text-sm',
                      isHome
                        ? 'text-white hover:text-font-low'
                        : 'text-black hover:text-gray-500',
                    )}
                  >
                    이벤트
                  </Link>
                </li>
                <li>
                  <Link
                    href="/mypage"
                    className={cn(
                      'text-sm',
                      isHome
                        ? 'text-white hover:text-font-low'
                        : 'text-black hover:text-gray-500',
                    )}
                  >
                    마이페이지
                  </Link>
                </li>
              </ul>
            </div>

            {/* 고객상담 섹션 */}
            <div>
              <h3
                className={cn(
                  'text-base font-semibold mb-4',
                  isHome ? 'text-white' : 'text-black',
                )}
              >
                고객상담
              </h3>
              <ul className="space-y-1">
                <li
                  className={cn(
                    'text-sm',
                    isHome ? 'text-white' : 'text-black',
                  )}
                >
                  평일 09:00 ~ 18:00
                </li>
                <li
                  className={cn(
                    'text-sm',
                    isHome ? 'text-font-low' : 'text-gray-500',
                  )}
                >
                  (점심시간 12:00 ~ 13:00 제외)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 추가된 최하단 영역: 정책 메뉴 및 Copyright */}
        <div
          className={cn(
            'mt-4 pt-4 border-t flex flex-col md:flex-row justify-between items-center gap-4',
            isHome ? 'border-gray-700' : 'border-gray-100',
          )}
        >
          <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
            <Link
              href="/policy/privacy"
              className={cn(
                'text-sm font-bold',
                isHome
                  ? 'text-white hover:text-font-low'
                  : 'text-black hover:text-gray-500',
              )}
            >
              개인정보 처리방침
            </Link>
            <Link
              href="/policy/terms"
              className={cn(
                'text-sm',
                isHome
                  ? 'text-white hover:text-font-low'
                  : 'text-black hover:text-gray-500',
              )}
            >
              이용약관
            </Link>
            <Link
              href="/policy/refund"
              className={cn(
                'text-sm',
                isHome
                  ? 'text-white hover:text-font-low'
                  : 'text-black hover:text-gray-500',
              )}
            >
              환불/교환정책
            </Link>
          </div>
        </div>
        <div>
          <p
            className={cn(
              'text-sm pt-4',
              isHome ? 'text-font-low' : 'text-gray-500',
            )}
          >
            © 2026 On. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
