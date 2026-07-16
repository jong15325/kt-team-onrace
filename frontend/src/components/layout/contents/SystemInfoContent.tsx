'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

export default function SystemInfoContent() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.classList.add('opacity-100', 'translate-y-0');
            target.classList.remove('opacity-0', 'translate-y-10');
          }
        });
      },
      { threshold: 0.1 },
    );

    // querySelectorAll 결과와 el 파라미터에 타입을 명시합니다.
    const revealElements = currentContainer.querySelectorAll('.reveal');
    revealElements.forEach((el: Element) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // 공통 애니메이션 스타일 클래스
  const revealBase =
    'reveal opacity-0 translate-y-10 transition-all duration-1000 ease-out';

  return (
    <section ref={containerRef} className="bg-secondary">
      <div className="relative flex flex-col items-center w-full  min-h-fit">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/image/systemInfo/bg-pattern2.svg"
            alt="background"
            fill
            className="object-contain"
            quality={100}
            priority
          />
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-x-20 gap-y-4 px-30 py-30">
          {/* 타이틀 구역 */}
          <div className={`col-span-2 self-start ${revealBase}`}>
            <h2 className="text-5xl font-bold mb-3">The Right to Run</h2>
            <p className="text-lg font-medium text-black">
              공정한 예매 환경을 약속합니다.
              <br />
              모든 러너가 기술적 장벽 없이, 호흡과 발걸음에만 집중할 수 있는
              <br />
              공정한 예매 환경을 약속합니다.
            </p>
          </div>

          {/* 첫 번째 이미지 (Fairness) */}
          <div
            className={`row-span-1 aspect-[2/3] relative overflow-hidden rounded-sm shadow-sm group cursor-pointer ${revealBase} delay-200`}
          >
            <Image
              src="/image/systemInfo/fairness.png"
              alt="Fairness Image"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          {/* 첫 번째 텍스트 */}
          <div
            className={`col-start-3 row-start-2 space-y-1 ${revealBase} delay-300`}
          >
            <p className="text-xl font-semibold">Fairness</p>
            <p className="text-3xl font-bold">공정</p>
            <p className="text-base font-medium">
              서버 다운과 불공정한 매크로에 가로막히지 않고
              <br />
              진정으로 달리고 싶은 러너에게 기회가 돌아가는 것
            </p>
          </div>

          {/* 두 번째 이미지 (Trust) */}
          <div
            className={`col-start-2 row-start-2 aspect-[2/3] relative overflow-hidden rounded-sm shadow-sm group cursor-pointer ${revealBase} delay-400`}
          >
            <Image
              src="/image/systemInfo/trush.png"
              alt="Trust Image"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          {/* 두 번째 텍스트 */}
          <div
            className={`col-start-2 row-start-3 space-y-1 ${revealBase} delay-500`}
          >
            <p className="text-xl font-semibold">Trust</p>
            <p className="text-3xl font-bold">신뢰</p>
            <p className="text-base font-medium">
              러닝의 첫 경험인 예매 단계에서부터
              <br />
              완벽한 안정감을 느끼게 하는 것
            </p>
          </div>

          {/* 세 번째 이미지 (Connection) */}
          <div
            className={`col-start-3 row-start-3 aspect-[2/3] relative overflow-hidden rounded-sm shadow-sm group cursor-pointer ${revealBase} delay-600`}
          >
            <Image
              src="/image/systemInfo/connection.png"
              alt="Connection Image"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          {/* 세 번째 텍스트 */}
          <div
            className={`col-start-3 row-start-4 space-y-1 ${revealBase} delay-700`}
          >
            <p className="text-xl font-semibold">Connection</p>
            <p className="text-3xl font-bold">연결</p>
            <p className="text-base font-medium">
              티켓팅 한 번으로 끝나는 것이 아닌,
              <br />
              온의 혁신과 하나로 이어지는 선순환을 만드는 것
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
