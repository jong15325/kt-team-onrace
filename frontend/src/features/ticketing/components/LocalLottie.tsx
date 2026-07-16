'use client';

import { useEffect, useRef } from 'react';

/**
 * 로컬 lottie.min.js + /animations/queue.json 으로 대기열 애니메이션 렌더.
 *
 * 기존엔 next/script 의 onLoad 로 초기화했는데, 클라이언트 네비게이션(상세→VQA→대기열)으로
 * 진입하면 스크립트가 이미 로드돼 있어 onLoad 가 재발화하지 않아 애니메이션이 비어 보였다.
 * → 스크립트 로드 여부와 무관하게 안전하게 초기화하도록 수정.
 */
export default function LocalLottie() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled || !containerRef.current) return;
      const lottie = (window as any).lottie;
      if (!lottie || animRef.current) return;
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/animations/queue.json',
      });
      animRef.current.setSpeed(2.5);
    };

    if ((window as any).lottie) {
      init();
    } else {
      const existing = document.getElementById(
        'lottie-local-script',
      ) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', init);
      } else {
        const script = document.createElement('script');
        script.id = 'lottie-local-script';
        script.src = '/js/lottie.min.js';
        script.async = true;
        script.addEventListener('load', init);
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: 500, height: 300 }} />;
}
