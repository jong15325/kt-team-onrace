'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);

  const isHome = pathname === '/';
  const isLoggedIn =
    !!session && !!session.accessToken && !session.isUnregistered;

  useEffect(() => {
    const handleScroll = () => {
      // 50px 이상 스크롤되면 배경색 변경 상태 true
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: '홈', href: '/' },
    { name: '이벤트', href: '/event' },
    { name: '고객지원', href: '/support' },
    // { name: '마우스이벤트(테스트용)', href: '/mouse-event' },
  ];

  return (
    <div className="w-full">
      <header
        className={cn(
          'w-full z-50 transition-all duration-300 ease-in-out fixed top-0 left-0',
          isHome
            ? isScrolled
              ? 'bg-white text-black'
              : 'bg-transparent text-white'
            : 'sticky bg-white text-black border-b border-gray-100', // 홈이 아닐 때 기본 흰색
        )}
      >
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between h-20 px-30">
          {/* 왼쪽: 로고 + 메뉴 */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={
                  isHome && !isScrolled
                    ? '/image/logo/logo_white.png'
                    : '/image/logo/logo_black.png'
                }
                alt="Logo"
                width={16}
                height={16}
              />
              <span className="text-base font-bold tracking-tighter">Race</span>
            </Link>

            <nav className="hidden md:block">
              <ul className="flex items-center gap-8">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'text-xl font-bold transition-colors group relative py-1',
                          isHome && !isScrolled
                            ? isActive
                              ? 'text-white'
                              : 'text-white/70 hover:text-white'
                            : isActive
                              ? 'text-black'
                              : 'text-gray-500 hover:text-black',
                        )}
                      >
                        {item.name}
                        <span
                          className={cn(
                            'absolute -bottom-1 left-0 h-[2px] transition-all duration-300',
                            isHome && !isScrolled ? 'bg-white' : 'bg-black',
                            isActive ? 'w-full' : 'w-0 group-hover:w-full',
                          )}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* 오른쪽: 유저 메뉴 */}
          <div
            className={cn(
              'flex items-center gap-6 text-xs font-bold',
              isHome && !isScrolled ? 'text-white/80' : 'text-gray-600',
            )}
          >
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  반갑습니다 {session.user?.name} 님!
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-sm hover:text-current opacity-80 hover:opacity-100 cursor-pointer"
                >
                  로그아웃
                </button>
                <Link
                  href="/mypage"
                  className="text-sm hover:text-current opacity-80 hover:opacity-100"
                >
                  마이페이지
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-sm hover:text-current opacity-80 hover:opacity-100"
                >
                  로그인
                </Link>
                <Link
                  href="/signup/email/agree"
                  className="text-sm hover:text-current opacity-80 hover:opacity-100"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 홈 배너 */}
      {isHome && (
        <section className="relative h-[920px] w-full bg-black overflow-hidden">
          <Image
            src="/image/banner2.png"
            alt="Main Banner"
            fill
            priority
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-7xl mx-auto px-30 z-10">
            <div className="max-w-xl text-left text-white">
              <h2 className="text-6xl font-bold mb-4 tracking-tight">
                달림 그 이상의 순간
              </h2>
              <p className="text-2xl mb-8">
                기록이 아닌 감각, 속도가 아닌 연결.
                <br />
                On이 설계한 러닝 라이프를 직접 경험하세요.
              </p>
              <Button
                variant="outline"
                rounded="full"
                size="fit"
                className="p-6 mb-6"
                onClick={() => router.push('/event')}
              >
                진행 중인 이벤트 보러가기
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
