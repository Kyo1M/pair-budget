'use client';

import { useState } from 'react';
import { Calculator as CalculatorIcon, Delete } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  backspace,
  calcTotal,
  formatCalcTape,
  initialCalcState,
  inputDigit,
  pressPlus,
  type CalcState,
} from '@/lib/calculator';

interface AmountCalculatorPopoverProps {
  /** 「金額に入れる」押下時に合計を渡す */
  onApply: (total: number) => void;
  disabled?: boolean;
}

const DIGIT_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'] as const;

export function AmountCalculatorPopover({ onApply, disabled }: AmountCalculatorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CalcState>(initialCalcState);

  const total = calcTotal(state);
  const reset = () => setState(initialCalcState);

  const handleApply = () => {
    onApply(total);
    reset();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="かんたん電卓を開く"
          disabled={disabled}
          className="flex w-12 shrink-0 items-center justify-center rounded-[13px] bg-pb-primary-soft text-[var(--pb-primary-hover)] shadow-[inset_0_0_0_1.5px_var(--pb-border)] disabled:opacity-50"
        >
          <CalculatorIcon className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-2xl p-3">
        <div className="text-right text-xs text-pb-faint">{formatCalcTape(state)}</div>
        <div className="mb-2 text-right text-2xl font-extrabold text-pb-ink">
          {total.toLocaleString()}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {DIGIT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setState((s) => inputDigit(s, key))}
              className="rounded-[10px] bg-pb-bg py-2 text-base font-bold"
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            aria-label="足す"
            onClick={() => setState((s) => pressPlus(s))}
            className="rounded-[10px] bg-pb-primary-soft py-2 text-base font-bold text-[var(--pb-primary-hover)]"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => setState((s) => inputDigit(s, '0'))}
            className="rounded-[10px] bg-pb-bg py-2 text-base font-bold"
          >
            0
          </button>
          <button
            type="button"
            aria-label="1文字削除"
            onClick={() => setState((s) => backspace(s))}
            className="flex items-center justify-center rounded-[10px] bg-pb-expense-soft py-2 text-pb-expense"
          >
            <Delete className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-[10px] bg-pb-primary-soft py-2 text-xs font-bold text-pb-muted"
          >
            クリア
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[1.4] rounded-[10px] bg-pb-primary py-2 text-xs font-extrabold text-white"
          >
            金額に入れる
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
