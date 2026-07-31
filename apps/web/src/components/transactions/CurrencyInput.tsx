'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** iPhoneでも安定して数字キーボードを開く円金額入力。 */
export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, 'type' | 'inputMode'>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    type="text"
    inputMode="numeric"
    pattern="[0-9,]*"
    autoComplete="off"
    className={cn('min-h-11 text-base touch-manipulation', className)}
    {...props}
  />
));

CurrencyInput.displayName = 'CurrencyInput';
