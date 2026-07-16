'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { LuCheck, LuChevronDown, LuX } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

/** --- 스타일 시스템 (CVA) --- **/
const selectTriggerVariants = cva(
  'flex w-full items-center justify-between rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-focus bg-white transition-colors',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-status-error focus:ring-1 focus:ring-status-error ',
      },
      selectSize: {
        default: 'h-10',
        sm: 'h-8 px-2 text-xs',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      selectSize: 'default',
    },
  },
);

export interface Option {
  value: string;
  label: string;
  price: string | number;
}

interface MultiProductSelectProps extends VariantProps<
  typeof selectTriggerVariants
> {
  options: Option[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function MultiProductSelect({
  options,
  selectedIds,
  onSelectionChange,
  variant,
  selectSize,
}: MultiProductSelectProps) {
  const [open, setOpen] = React.useState(false);

  // 아이템 선택/해제 핸들러
  const handleSelect = (value: string) => {
    let next: string[];
    if (value === 'option1') {
      next = []; // 선택안함 클릭 시 초기화
    } else {
      next = selectedIds.includes(value)
        ? selectedIds.filter((id) => id !== value)
        : [...selectedIds, value];
    }
    onSelectionChange(next);
  };

  // 선택된 옵션 객체들만 추출
  const selectedOptions = options.filter((opt) =>
    selectedIds.includes(opt.value),
  );

  // 총액 계산
  const totalPrice = selectedOptions.reduce(
    (sum, opt) => sum + Number(opt.price),
    0,
  );

  return (
    <div className="w-full space-y-4">
      {/* 셀렉트 박스 */}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          className={cn(selectTriggerVariants({ variant, selectSize }))}
        >
          <span
            className={cn(
              'truncate mr-2 text-left',
              selectedIds.length === 0 && 'text-gray-400',
            )}
          >
            {selectedIds.length > 0
              ? selectedOptions.map((o) => o.label).join(', ')
              : '상품을 선택해주세요'}
          </span>
          <LuChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className="z-50 min-w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto rounded-md border bg-white p-1 shadow-lg"
          >
            <div className="flex flex-col gap-0.5">
              {options.map((option) => {
                const isSelected = selectedIds.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-4 text-sm transition-colors hover:bg-slate-100',
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-4">
                      <span>{option.label}</span>
                      {option.price !== '0' && option.price !== 0 && (
                        <span className="text-xs text-gray-500 font-normal">
                          +{Number(option.price).toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {/* 하단 카드 리스트 */}
      {selectedIds.length > 0 && (
        <div className="space-y-1 ">
          <div className="rounded-sm border border-cta-outline bg-secondary">
            {selectedOptions.map((item) => (
              <div
                key={item.value}
                className="flex items-center justify-between p-3"
              >
                <div>
                  <p className="text-base font-medium text-slate-800">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold text-black">
                    + {Number(item.price).toLocaleString()}원
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="iconXs"
                  rounded="full"
                  onClick={() => handleSelect(item.value)}
                  className="p-1 text-gray-600"
                >
                  <LuX className="h-4 w-4 text-" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
