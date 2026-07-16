import { Button } from '@/components/ui/button';
import { LuChevronLeft } from 'react-icons/lu';
import { EntryNotice } from './EntryNotice';
import { useEventStore } from '@/features/event/store/useEventStore';
import { useRouter } from 'next/navigation';

export function ResultCardPage({
  setResultCard,
}: {
  setResultCard: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { event } = useEventStore();
  const router = useRouter();
  const handleAction = () => {
    router.push(`/ticketing/${event?.id}/payment`);
  };

  return (
    <div className="space-y-2">
      {/* 전체 컨테이너에 flex flex-col과 고정 높이 부여 */}
      <div className="flex flex-col border border-gray-200 rounded-sm h-[500px]">
        {/* 스크롤되는 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-row items-center">
            <Button
              variant="ghost"
              size="fit"
              onClick={() => setResultCard(false)}
            >
              <LuChevronLeft size={20} />
            </Button>
            <h2 className="text-lg font-bold text-gray-900">결과 보기</h2>
          </div>

          <section>
            <div className="flex flex-col items-center justify-center py-6 space-y-2">
              <p className="font-bold">당첨을 축하합니다 🎉</p>
              <p className="text-xl font-bold text-red-600">
                2026.04.01 (일) 까지
              </p>
              <p>결제를 완료해주세요</p>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700">
                예상 결제 금액
              </label>
            </div>
            <div className="rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">10km, 5'30"/km</span>
                <span className="text-gray-900 font-medium">50,000원</span>
              </div>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700">
                추가 가능한 옵션
              </label>
            </div>
            <div className="rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">키링</span>
                <span className="text-gray-900 font-medium">+7,900원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">키링 + 텀블러</span>
                <span className="text-gray-900 font-medium">+14,000원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">키링 + 텀블러 + 후드집업</span>
                <span className="text-gray-900 font-medium">+32,000원</span>
              </div>
            </div>
          </section>

          <EntryNotice />
        </div>

        {/* 고정된 하단 버튼 영역 */}
        <div className="p-4 border-t">
          <Button
            className="w-full"
            variant="primary1"
            rounded="full"
            onClick={() => handleAction()}
          >
            결제하기
          </Button>
        </div>
      </div>

      {/* 응모 실패 */}
      {/* <div className="p-4 space-y-4 border border-gray-200 rounded-sm">
              <div className="flex flex-row items-center">
                <Button
                  variant="ghost"
                  size="fit"
                  onClick={() => setResultCard(false)}
                >
                  <LuChevronLeft size={20} />
                </Button>
                <h2 className="text-lg font-bold text-gray-900">결과 보기</h2>
              </div>

              <section>
                <div className="flex flex-col items-center justify-center py-6 space-y-2">
                  <p className="font-bold">당첨되지 않았습니다 😢</p>
                  <p className="text-xl font-bold">
                    아쉽지만 다음 기회에 또 만나요!
                  </p>
                  <Button variant="primary1" rounded="sm" size="fit">
                    다른 이벤트 보러가기
                  </Button>
                </div>
              </section>

              <EntryNotice />
            </div>

            <div className="p-4 space-y-4 border border-gray-200 rounded-sm">
              <div className="flex flex-row items-center">
                <Button
                  variant="ghost"
                  size="fit"
                  onClick={() => setResultCard(false)}
                >
                  <LuChevronLeft size={20} />
                </Button>
                <h2 className="text-lg font-bold text-gray-900">결과 보기</h2>
              </div>

              <section>
                <div className="flex flex-col items-center justify-center py-6 space-y-2">
                  <p className="text-xl text-gray-500 font-bold">
                    응모한 내역이 없습니다.
                  </p>
                  <p className="text-gray-400">
                    마이페이지에서 내가 응모한 이벤트를 확인해보세요.
                  </p>
                  <Button variant="primary1" rounded="sm" size="fit">
                    마이페이지 가기
                  </Button>
                </div>
              </section>

              <EntryNotice />
            </div>

            <div className="p-4 space-y-4 border border-gray-200 rounded-sm">
              <div className="flex flex-row items-center">
                <Button
                  variant="ghost"
                  size="fit"
                  onClick={() => setResultCard(false)}
                >
                  <LuChevronLeft size={20} />
                </Button>
                <h2 className="text-lg font-bold text-gray-900">결과 보기</h2>
              </div>

              <section>
                <div className="flex flex-col items-center justify-center py-6 space-y-2">
                  <p className="text-xl text-gray-500 font-bold">
                    당첨이 취소되었습니다.
                  </p>
                  <p className="text-gray-400">
                    기한 내 결제하지 않아 당첨이 취소되었습니다
                  </p>
                </div>
              </section>

              <EntryNotice />
            </div> */}
    </div>
  );
}
