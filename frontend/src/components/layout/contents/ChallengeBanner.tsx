'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const images = [
  '/image/challengeBanner/challenge1.png',
  '/image/challengeBanner/challenge2.png',
  '/image/challengeBanner/challenge3.png',
  '/image/challengeBanner/challenge4.png',
];

export default function ChallengeBanner() {
  const router = useRouter();

  return (
    // 배경색은 화면 전체(w-full)를 채웁니다.
    <section className="w-full bg-black overflow-hidden ">
      <div className="flex flex-col items-center justify-center h-[700px] max-w-7xl mx-auto w-full text-white">
        {/* 메인 콘텐츠 */}
        <main>
          <div className="flex flex-col justify-center items-center space-y-4 ">
            <p className="text-5xl font-bold">
              이제 On과 함께 도전할 시간입니다
            </p>

            <p className="text-lg">
              지금까지 꿈꿔왔던 러닝, 온 레이스로 시작하세요.
            </p>
          </div>
        </main>

        {/* 슬라이더 영역 */}
        <div className="w-full overflow-hidden bg-black py-10">
          <div className="rolling-container flex gap-4">
            {/* 원본 세트 */}
            {images.map((src, idx) => (
              <div
                key={`orig-${idx}`}
                className="relative flex-shrink-0 w-[300px] h-[300px]"
              >
                <Image
                  src={src}
                  alt="rolling"
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
            ))}
            {/* 무한 루프용 복사본 세트 */}
            {images.map((src, idx) => (
              <div
                key={`copy-${idx}`}
                className="relative flex-shrink-0 w-[300px] h-[300px]"
              >
                <Image
                  src={src}
                  alt="rolling-copy"
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 하단 버튼 섹션 */}
        <footer>
          <Button
            variant="outline"
            rounded="full"
            onClick={() => router.push('/event')}
          >
            이벤트 전체보기
          </Button>
        </footer>
      </div>
    </section>
  );
}
