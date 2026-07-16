'use client';

import { Button } from '@/components/ui/button';

import { Label } from '@/components/shadcn/label';
import { Checkbox } from '@/components/ui/checkbox';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@/components/ui/modal';
import { authService } from '@/features/auth/services';
import { useSignupStore } from '@/features/auth/store/useSignupStore';
import { Term } from '@/features/auth/types';
import PassModal from '@/features/auth/components/PassModal';

export default function SignupForm() {
  const router = useRouter();
  const params = useParams();
  const setTermAgreements = useSignupStore((state) => state.setTermAgreements);
  const [terms, setTerms] = useState<Term[]>([]);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    email: false,
    sms: false,
  });
  const [open, setOpen] = useState(false);

  const [agreeModal, setAgreeModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const isRequiredChecked = agreements.terms && agreements.privacy;

  const handleAllCheckbox = async (checked: boolean) => {
    handleCheckboxChange('terms', checked);
    handleCheckboxChange('privacy', checked);
    handleCheckboxChange('email', checked);
    handleCheckboxChange('sms', checked);
  };

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
    setIsModalOpen(false);

    alert(`${provider}를 선택하셨습니다. 인증 페이지로 이동합니다.`);
  };

  const handleCheckboxChange = (
    id: keyof typeof agreements,
    value?: boolean,
  ) => {
    setAgreements((prev) => ({
      ...prev,
      // value가 boolean 타입이면 그 값을 쓰고, 아니면(undefined면) 기존 값을 반전시킴
      [id]: typeof value === 'boolean' ? value : !prev[id],
    }));
  };

  const handleAgree = () => {
    if (isRequiredChecked) {
      setOpen(true);
    } else {
      setAgreeModal(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authService.getTerms();
        if (response.success && response.data) {
          setTerms(response.data);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    };

    fetchData();
  }, []);

  const handleEvent = () => {
    // 실제 약관 ID로 동의 정보 구성: 필수는 동의(진행 시점에 이미 체크됨),
    // 선택(마케팅)은 사용자가 고른 값만 반영
    const marketingAgreed = agreements.email || agreements.sms;
    const built = terms.map((t) => ({
      termVersionId: t.termVersionId,
      agreed: t.required ? true : marketingAgreed,
    }));
    setTermAgreements(built);
    router.push('/signup/user-info');
  };

  const type = params.id === 'email' ? '이메일' : 'SNS';

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-primary">
      <div className="flex flex-col w-full max-w-xl p-8 ">
        <div className="text-4xl font-bold py-4">{type} 회원가입</div>
        <div className="text-2xl font-bold py-4">약관 동의</div>

        <div className="rounded-xl space-y-4 ">
          {/* 전체 동의 */}
          <div className="flex items-center space-x-3 pb-3 border-b">
            <Checkbox
              id="all"
              variant="primary"
              onCheckedChange={(checked: boolean) => {
                handleAllCheckbox(checked);
              }}
            />
            <Label
              htmlFor="all"
              className="text-base font-bold cursor-pointer text-slate-800"
            >
              전체 동의
            </Label>
          </div>
          <div className="space-y-2">
            {/* 필수 약관들 */}
            <div className="text-base font-bold text-black">필수 약관</div>
            <div className="space-y-3 px-1 pb-2">
              <div className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="t1"
                    variant="primary"
                    checked={agreements.terms}
                    onCheckedChange={() => handleCheckboxChange('terms')}
                  />
                  <Label
                    htmlFor="t1"
                    className="text-sm cursor-pointer text-black"
                  >
                    이용약관 동의
                  </Label>
                </div>
                <Button variant="link" size="fit" className="text-xs h-5">
                  전체보기
                </Button>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="t2"
                    variant="primary"
                    checked={agreements.privacy}
                    onCheckedChange={() => handleCheckboxChange('privacy')}
                  />
                  <Label
                    htmlFor="t2"
                    className="text-sm cursor-pointer text-black"
                  >
                    개인정보 수집 및 이용 동의
                  </Label>
                </div>
                <Button variant="link" size="fit" className="text-xs h-5">
                  전체보기
                </Button>
              </div>
            </div>

            {/* 선택 약관 (마케팅 수신) */}
            <div className="space-y-3 px-1 pt-1">
              <div className="text-base font-bold text-black">선택 약관</div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="marketing-email"
                  variant="primary"
                  checked={agreements.email}
                  onCheckedChange={() => handleCheckboxChange('email')}
                />
                <Label
                  htmlFor="marketing-email"
                  className="text-sm cursor-pointer text-black"
                >
                  마케팅 정보 수신 동의 (이메일)
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="marketing-sms"
                  variant="primary"
                  checked={agreements.sms}
                  onCheckedChange={() => handleCheckboxChange('sms')}
                />
                <Label
                  htmlFor="marketing-sms"
                  className="text-sm cursor-pointer text-black"
                >
                  마케팅 정보 수신 동의 (SMS)
                </Label>
              </div>
            </div>

            {/* 구분선 */}
            <div className="my-3 h-[1px] bg-gray-300"></div>

            <div className="space-y-3 px-1 pt-1">
              <div>
                <Button variant="primary1" rounded="full" onClick={handleAgree}>
                  확인
                </Button>
                <Modal open={open} onOpenChange={setOpen}>
                  <ModalContent size="md">
                    <ModalHeader>
                      <ModalTitle className="text-3xl font-bold">
                        본인 인증 절차
                      </ModalTitle>
                      <ModalDescription className="text-sm text-font-medium my-0">
                        1인 1계정 가입을 위한 필수 절차입니다. (마이페이지에서
                        수정 가능)
                      </ModalDescription>
                      <p className="text-sm text-black mb-4">
                        *본인인증을 하지 않으면 예매를 할 수 없습니다.
                      </p>
                    </ModalHeader>
                    <ModalFooter>
                      <Button
                        variant="secondary"
                        rounded="full"
                        onClick={handleEvent}
                      >
                        건너뛰기
                      </Button>

                      <Button
                        variant="primary1"
                        rounded="full"
                        onClick={() => {
                          setOpen(false);
                          setIsModalOpen(true);
                        }}
                      >
                        PASS 본인 인증
                      </Button>
                    </ModalFooter>
                  </ModalContent>
                </Modal>
              </div>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-500"
                rounded="full"
                onClick={() => router.push('/login')}
              >
                돌아가기
              </Button>
            </div>
            <div>
              <Modal open={agreeModal} onOpenChange={setAgreeModal}>
                <ModalContent size="md">
                  <ModalHeader>
                    <ModalTitle className="text-3xl font-bold">
                      필수 약관 동의 안내
                    </ModalTitle>
                    <ModalDescription className="text-sm text-font-medium my-0">
                      필수 약관 미동의시 서비스 이용이 불가합니다.
                    </ModalDescription>
                    <p className="text-sm text-font-medium mb-4">
                      *본인인증을 하지 않으면 예매를 할 수 없습니다.
                    </p>
                  </ModalHeader>
                  <ModalFooter>
                    <Button
                      variant="primary1"
                      rounded="full"
                      onClick={() => {
                        setAgreeModal(false);
                      }}
                    >
                      확인
                    </Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            </div>
          </div>
        </div>
        <PassModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onFinish={() => {
            setIsModalOpen(false);
            handleEvent();
          }}
        />
      </div>
    </div>
  );
}
