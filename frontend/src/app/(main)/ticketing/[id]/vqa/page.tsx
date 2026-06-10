'use client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radioGroup';
import { VqaTooltip } from '@/features/ticketing/components/VqaTooltip';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FaPlay, FaVolumeDown, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { MdErrorOutline, MdReplay } from 'react-icons/md';
import { LuCircleAlert, LuRefreshCw, LuTimer } from 'react-icons/lu';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';
import { useEventStore } from '@/features/event/store/useEventStore';
import { eventService } from '@/features/event/services';
import { ticketingService } from '@/features/ticketing/services';
import { handleEntryError } from '@/features/ticketing/lib/entryErrorHandler';

export default function SecurityAuthPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { event, courseId, paceId, queueEnabled, setBotClearToken } =
    useEventStore();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedValue, setSelectedValue] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lives, setLives] = useState(3);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const endTimeRef = useRef<number | null>(null);

  // 타이머 초기화 함수
  const resetTimer = () => {
    endTimeRef.current = Date.now() + 60 * 1000;
    setTimeLeft(60);
  };

  // 실패 처리 로직
  const handleFailure = () => {
    if (lives > 1) {
      setLives((prev) => prev - 1);
      setSelectedValue('');
      resetTimer();
      alert('인증에 실패하였습니다. 남은 기회: ' + (lives - 1) + '회');
    } else {
      setLives(0);
      setShowFailModal(true);
    }
  };

  useEffect(() => {
    if (!endTimeRef.current) resetTimer();

    const timer = setInterval(() => {
      if (isSubmitting || showFailModal) {
        clearInterval(timer);
        return;
      }
      [];
      const now = Date.now();
      const remaining = Math.round((endTimeRef.current! - now) / 1000);

      if (remaining <= 0) {
        handleFailure(); // 시간 초과 시 실패 처리
      } else {
        setTimeLeft(remaining);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [lives, isSubmitting, showFailModal]);

  const handleSubmit = async () => {
    // VQA(Mock) 정답 체크 — 실제 보안 효력 없음(추후 AI팀 연동)
    const CORRECT_ANSWER = '1';

    if (selectedValue !== CORRECT_ANSWER) {
      handleFailure();
      return;
    }

    // 코스/페이스 미선택 방어 (직접 진입/새로고침 등)
    if (courseId == null || paceId == null) {
      router.replace(`/ticketing/${eventId}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // STEP 8 통과 → 봇 통과 토큰 발급(더미) → 스토어 보관
      let botToken: string | null = null;
      const tokenRes = await ticketingService.getBotClearToken();
      if (tokenRes.success) {
        botToken = tokenRes.data.botClearToken;
        setBotClearToken(botToken);
      }

      if (event?.appType === 'LOTTERY') {
        // STEP 10-A 응모 신청 → 완료(결제 없음)
        const res = await eventService.applyEventLottery(
          eventId,
          { courseId, paceId },
          { botToken },
        );
        if (res.success) setShowSuccessModal(true);
      } else {
        // FIRST_COME — 대기열 활성 이벤트면 대기열로, 아니면 STEP 10-B 바로 신청
        if (queueEnabled) {
          router.push(`/ticketing/${eventId}/waitQueue`);
        } else {
          const res = await eventService.applyEventFirstCome(
            eventId,
            { courseId, paceId },
            { botToken },
          );
          if (res.success) router.replace(`/ticketing/${eventId}/payment`);
        }
      }
    } catch (e) {
      setIsSubmitting(false);
      handleEntryError(e, { router, eventId });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleRefreshVQA = () => {
    setShowRefreshModal(true);
  };
  const handlePlay = () => {
    if (!videoRef.current || !audioRef.current || isPlaying) return;
    videoRef.current.currentTime = 0;
    audioRef.current.currentTime = 0;
    audioRef.current.volume = isMuted ? 0 : volume;
    Promise.all([videoRef.current.play(), audioRef.current.play()])
      .then(() => setIsPlaying(true))
      .catch(() => {});
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-sm bg-white">
        <div className="flex items-center justify-between px-6 py-4 ">
          <div className="flex items-center">
            <p className="text-xl font-bold mr-2">보안 인증</p>
            <VqaTooltip />
          </div>
          {/* 남은 기회 표시 UI */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">남은 기회</span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < lives ? 'bg-font-error' : 'bg-status-disabled1'}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start px-6 py-6 w-full">
          <div
            className={`relative w-full mb-1 aspect-video bg-black rounded-sm overflow-hidden group ${isPlaying ? 'cursor-default' : 'cursor-pointer'}`}
            onClick={handlePlay}
          >
            <video
              ref={videoRef}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full object-cover pointer-events-none"
              playsInline
            >
              <source src="/animations/vqa_video.mp4" type="video/mp4" />
            </video>
            <audio
              ref={audioRef}
              src="/animations/vqa_audio.mp3"
              onEnded={() => setIsPlaying(false)}
            />

            <div
              className="absolute top-3 right-3 flex items-center gap-1 bg-cta-outline p-2 rounded-full transition-all z-20 group/volume"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  background: `linear-gradient(to right, #525252 ${(isMuted ? 0 : volume) * 100}%, rgba(0, 0, 0, 0.1) ${(isMuted ? 0 : volume) * 100}%)`,
                }}
                className="w-0 group-hover/volume:w-24 group-hover/volume:mx-2 transition-all appearance-none bg-white/30 h-1 rounded-lg cursor-pointer outline-none accent-black [&::-webkit-slider-thumb]:appearance-none group-hover/volume:[&::-webkit-slider-thumb]:w-3 group-hover/volume:[&::-webkit-slider-thumb]:h-3 group-hover/volume:[&::-webkit-slider-thumb]:bg-font-medium group-hover/volume:[&::-webkit-slider-thumb]:rounded-full"
              />
              <Button
                variant="text"
                size="iconXs"
                onClick={toggleMute}
                className="text-font-medium p-1"
              >
                {isMuted || volume === 0 ? (
                  <FaVolumeMute size={18} />
                ) : volume < 0.5 ? (
                  <FaVolumeDown size={18} />
                ) : (
                  <FaVolumeUp size={18} />
                )}
              </Button>
            </div>

            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 bg-black/30">
                <div className="p-4 rounded-full transition-all duration-300 bg-white/40 group-hover:bg-white/80 group-hover:scale-110 text-black shadow-xl">
                  {videoRef.current && videoRef.current.currentTime > 0 ? (
                    <LuRefreshCw size={32} />
                  ) : (
                    <FaPlay size={32} className="ml-1" />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex justify-between items-center mb-4">
            <div className="flex items-center gap-1.5 text-font-error font-bold">
              <LuTimer size={20} />
              <span>남은 시간: {timeLeft}초</span>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={handleRefreshVQA}>
                <MdReplay size={18} /> 문제 변경
              </Button>
            </div>
          </div>

          <div className="text-lg font-bold mb-5 leading-tight text-gray-800">
            3등으로 결승선을 통과한 러너의 기록은 무엇입니까?
          </div>

          <div className="w-full">
            <RadioGroup
              value={selectedValue}
              onValueChange={setSelectedValue}
              className="flex flex-col gap-3"
            >
              {['02:15:20.05', '02:16:15.10', '02:17:05.45', '02:18:11.00'].map(
                (label, idx) => (
                  <label
                    key={idx}
                    className="flex items-center space-x-3 cursor-pointer px-4 transition-all"
                  >
                    <RadioGroupItem
                      value={String(idx + 1)}
                      id={String(idx + 1)}
                    />
                    <span className="text-base font-semibold">{label}</span>
                  </label>
                ),
              )}
            </RadioGroup>
          </div>
        </div>

        <div className="px-6 pt-2">
          <Button
            variant="primary1"
            rounded="full"
            disabled={!selectedValue || isSubmitting}
            onClick={handleSubmit}
          >
            제출하기
          </Button>
        </div>
      </div>
      {/* 실패 모달 */}

      <div>
        <Modal open={showFailModal}>
          {/* cva를 통해 정의한 size="lg" 적용 */}
          <ModalContent size="md">
            <ModalHeader>
              <div className="flex justify-center mb-4 text-font-error">
                <LuCircleAlert size={40} />
              </div>
              <ModalTitle className="text-2xl font-bold">
                보안 인증에 실패했습니다.
              </ModalTitle>
              <ModalDescription>
                오답 횟수 또는 제출 시간이 초과되어 이전 페이지로 돌아갑니다.
                <br />
                다시 신청해주세요
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button
                variant="primary1"
                rounded="full"
                onClick={() => router.push('/')}
              >
                확인
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>

      <div>
        <Modal open={showRefreshModal}>
          {/* cva를 통해 정의한 size="lg" 적용 */}
          <ModalContent size="md">
            <ModalHeader>
              <div className="flex justify-center mb-4 text-font-error">
                <LuCircleAlert size={40} />
              </div>
              <ModalTitle className="text-2xl font-bold">
                문제 변경 하시겠습니까?
              </ModalTitle>
              <ModalDescription>
                문제 변경 시 기회가 차감됩니다.
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button
                variant="secondary"
                rounded="full"
                onClick={() => setShowRefreshModal(false)}
              >
                취소
              </Button>
              <Button
                variant="primary1"
                rounded="full"
                onClick={() => {
                  handleFailure();
                  setShowRefreshModal(false);
                }}
              >
                확인
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>

      {/* 응모(LOTTERY) 완료 모달 */}
      <div>
        <Modal open={showSuccessModal}>
          <ModalContent size="md">
            <ModalHeader>
              <ModalTitle className="text-2xl font-bold">
                응모가 완료되었습니다.
              </ModalTitle>
              <ModalDescription>
                추첨 결과는 마이페이지 및 알림을 통해 안내됩니다.
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button
                variant="primary1"
                rounded="full"
                onClick={() => router.push('/event')}
              >
                확인
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
