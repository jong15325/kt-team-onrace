'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import PostcodeModal from './PostcodeModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LuChevronLeft } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import { addressService } from '@/features/address/services';

// 데이터 타입 정의
type AddressFormData = {
  nickname: string;
  receiver: string;
  contact: string;
  zonecode: string;
  address: string;
  detailAddress: string;
};

export type AddressInitial = AddressFormData & { isDefault: boolean };

export default function AddressForm({
  onClose,
  onSaved,
  editId,
  initial,
}: {
  onClose?: () => void;
  onSaved?: () => void;
  editId?: number;
  initial?: AddressInitial;
}) {
  const isEdit = editId != null;
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [nicknameType, setNicknameType] = useState<
    'HOME' | 'OFFICE' | 'MANUAL'
  >(
    initial
      ? initial.nickname === '우리집'
        ? 'HOME'
        : initial.nickname === '회사'
          ? 'OFFICE'
          : 'MANUAL'
      : 'HOME',
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isValid }, // isValid를 통해 폼 완성 여부 확인
  } = useForm<AddressFormData>({
    mode: 'onChange', // 실시간으로 버튼 활성화 상태를 반영하기 위해 설정
    defaultValues: initial
      ? {
          nickname: initial.nickname,
          receiver: initial.receiver,
          contact: initial.contact,
          zonecode: initial.zonecode,
          address: initial.address,
          detailAddress: initial.detailAddress,
        }
      : {
          nickname: '우리집',
          receiver: '',
          contact: '',
          zonecode: '',
          address: '',
          detailAddress: '',
        },
  });

  const handleChipClick = (
    type: 'HOME' | 'OFFICE' | 'MANUAL',
    value: string,
  ) => {
    setNicknameType(type);
    setValue('nickname', value, { shouldValidate: true });
  };

  const onSubmit = async (data: AddressFormData) => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const payload = {
        label: data.nickname,
        receiverName: data.receiver,
        phone: data.contact,
        zipcode: data.zonecode,
        address1: data.address,
        address2: data.detailAddress,
        memo: '',
        isDefault,
      };
      const res =
        isEdit && editId != null
          ? await addressService.updateAddress(String(editId), payload)
          : await addressService.postAddress(payload);
      if (res.success) {
        onSaved?.();
        onClose?.();
      } else {
        setErrorMsg(res.message ?? '배송지 저장에 실패했습니다.');
      }
    } catch (error: any) {
      setErrorMsg(
        error?.response?.data?.message ??
          '에러가 발생했습니다, 다시 시도해주세요',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-md mx-auto">
      <div className="flex items-center border-b-2 border-black mb-6">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <LuChevronLeft />
        </Button>
        <h1 className="text-xl font-bold ">
          {isEdit ? '배송지 수정' : '배송지 추가'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 주소 검색 */}
        <div>
          <label className="block text-sm font-medium">주소*</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                {...register('address', { required: true })}
                readOnly
                placeholder="기본 주소"
              />
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPostcodeOpen(true)}
              >
                주소 검색
              </Button>
            </div>
          </div>
          <Input
            {...register('detailAddress', { required: true })}
            placeholder="상세 주소를 입력하세요"
            className="mt-2"
          />
          <label className="flex items-center mt-2 cursor-pointer">
            <Checkbox
              className="mr-1"
              checked={isDefault}
              onCheckedChange={(c: boolean) => setIsDefault(!!c)}
            />
            <span className="text-sm text-gray-500">기본 배송지로 저장</span>
          </label>
        </div>

        {/* 배송지 별명 */}
        <div className="flex gap-2 mb-3">
          <Button
            type="button"
            variant="outline"
            size="fit"
            rounded="full"
            onClick={() => handleChipClick('HOME', '우리집')}
            className={cn(
              nicknameType === 'HOME'
                ? 'border-2 text-black border-black'
                : 'border text-font-low border-cta-outline',
            )}
          >
            우리집
          </Button>
          <Button
            type="button"
            variant="outline"
            size="fit"
            rounded="full"
            onClick={() => handleChipClick('OFFICE', '회사')}
            className={cn(
              nicknameType === 'OFFICE'
                ? 'border-2 text-black border-black'
                : 'border text-font-low border-cta-outline',
            )}
          >
            회사
          </Button>
          <Button
            type="button"
            variant="outline"
            size="fit"
            rounded="full"
            onClick={() => handleChipClick('MANUAL', '')}
            className={cn(
              nicknameType === 'MANUAL'
                ? 'border-2 text-black border-black'
                : 'border text-font-low border-cta-outline',
            )}
          >
            직접입력
          </Button>
        </div>

        {nicknameType === 'MANUAL' && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <Input
              {...register('nickname', { required: true })}
              placeholder="배송지 별명을 입력해 주세요"
              autoFocus
            />
          </div>
        )}

        {/* 받는 사람 */}
        <div>
          <label className="block text-sm font-medium">받으실 분*</label>
          <Input {...register('receiver', { required: true })} />
        </div>

        {/* 연락처 (하이픈 유무 모두 허용) */}
        <div>
          <label className="block text-sm font-medium">연락처*</label>
          <Input
            {...register('contact', {
              required: true,
              pattern: /^\d{2,3}-?\d{3,4}-?\d{4}$/,
            })}
            placeholder="010-0000-0000"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-red-500 px-1">{errorMsg}</p>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            rounded="full"
            type="submit"
            disabled={!isValid || submitting} // 폼이 유효하지 않으면 버튼 비활성화
          >
            {submitting ? '저장 중...' : '저장하기'}
          </Button>
        </div>
      </form>

      {isPostcodeOpen && (
        <PostcodeModal
          onComplete={(data) => {
            setValue('zonecode', data.zonecode, { shouldValidate: true });
            setValue('address', data.fullAddress, { shouldValidate: true });
            setIsPostcodeOpen(false);
          }}
          onClose={() => setIsPostcodeOpen(false)}
        />
      )}
    </div>
  );
}
