'use client';

import { Controller } from 'react-hook-form';
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AmountCalculatorPopover } from '@/components/transactions/AmountCalculatorPopover';
import { CurrencyInput } from '@/components/transactions/CurrencyInput';
import { PlaceCombobox } from '@/components/transactions/PlaceCombobox';
import { getCategoriesByType } from '@/constants/categories';
import { cn } from '@/lib/utils';
import type { TransactionFormData } from '@/lib/validations/transaction';
import type { HouseholdMember } from '@/types/household';
import type { PlaceSuggestion, TransactionType } from '@/types/transaction';

type ReviewableField = 'amount' | 'occurredOn' | 'category' | 'place';

interface TransactionTypeSelectorProps {
  value: TransactionType;
  onValueChange: (value: TransactionType) => void;
  allowedTypes?: readonly TransactionType[];
  disabled?: boolean;
}

const TYPE_OPTIONS: ReadonlyArray<{ value: TransactionType; label: string }> = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '収入' },
  { value: 'advance', label: '立替' },
];

export function TransactionTypeSelector({
  value,
  onValueChange,
  allowedTypes = TYPE_OPTIONS.map((option) => option.value),
  disabled = false,
}: TransactionTypeSelectorProps) {
  const options = TYPE_OPTIONS.filter((option) => allowedTypes.includes(option.value));

  return (
    <Tabs value={value} onValueChange={(nextValue) => onValueChange(nextValue as TransactionType)}>
      <TabsList className="min-h-11 w-full">
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            className="min-h-11 touch-manipulation"
            value={option.value}
            disabled={disabled}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

interface TransactionFormFieldsProps {
  fieldIdPrefix: string;
  control: Control<TransactionFormData>;
  register: UseFormRegister<TransactionFormData>;
  setValue: UseFormSetValue<TransactionFormData>;
  errors: FieldErrors<TransactionFormData>;
  transactionType: TransactionType;
  payerUserId: string | null | undefined;
  members: HouseholdMember[];
  currentUserId: string | null | undefined;
  placeSuggestions: PlaceSuggestion[];
  disabled?: boolean;
  needsReview?: (field: ReviewableField) => boolean;
}

function getMemberLabel(member: HouseholdMember): string {
  return member.profile?.name || member.profile?.email || '名前未設定';
}

export function TransactionFormFields({
  fieldIdPrefix,
  control,
  register,
  setValue,
  errors,
  transactionType,
  payerUserId,
  members,
  currentUserId,
  placeSuggestions,
  disabled = false,
  needsReview,
}: TransactionFormFieldsProps) {
  const id = (field: string) => `${fieldIdPrefix}-${field}`;
  const categories = getCategoriesByType(transactionType);
  const fieldClassName = (field: ReviewableField) =>
    cn('space-y-2 rounded-md', needsReview?.(field) && 'bg-amber-50 p-2');

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={fieldClassName('amount')}>
          <Label htmlFor={id('amount')}>金額</Label>
          <div className="flex gap-2">
            <CurrencyInput
              id={id('amount')}
              placeholder="金額を入力"
              disabled={disabled}
              className="flex-1"
              aria-invalid={!!errors.amount}
              {...register('amount')}
            />
            <AmountCalculatorPopover
              disabled={disabled}
              onApply={(total) => setValue('amount', total, { shouldValidate: true })}
            />
          </div>
          {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
        </div>

        <div className={fieldClassName('occurredOn')}>
          <Label htmlFor={id('occurredOn')}>日付</Label>
          <Input
            id={id('occurredOn')}
            type="date"
            className="min-h-11 touch-manipulation text-base"
            disabled={disabled}
            {...register('occurredOn')}
          />
          {errors.occurredOn && (
            <p className="text-sm text-red-500">{errors.occurredOn.message}</p>
          )}
        </div>
      </div>

      <div className={fieldClassName('category')}>
        <Label htmlFor={id('category')}>カテゴリ</Label>
        <select
          id={id('category')}
          className="min-h-11 w-full touch-manipulation rounded-md border border-gray-200 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          disabled={disabled}
          {...register('category')}
        >
          {categories.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
      </div>

      {transactionType === 'expense' && (
        <label className="flex min-h-11 touch-manipulation items-start gap-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Controller
            name="isHouseholdAdvance"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"
                checked={field.value ?? false}
                onChange={(event) => field.onChange(event.target.checked)}
                disabled={disabled}
              />
            )}
          />
          <span>
            家庭の支出を一旦立替えた場合はチェックしてください。後で世帯との精算に表示されます。
          </span>
        </label>
      )}

      <div className="space-y-2">
        <Label htmlFor={id('note')}>メモ</Label>
        <textarea
          id={id('note')}
          rows={3}
          className="min-h-20 w-full touch-manipulation rounded-md border border-gray-200 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="どんな取引かメモできます"
          disabled={disabled}
          {...register('note')}
        />
        {errors.note && <p className="text-sm text-red-500">{errors.note.message}</p>}
      </div>

      {transactionType !== 'income' && (
        <div className={fieldClassName('place')}>
          <Label htmlFor={id('place')}>場所（任意）</Label>
          <Controller
            name="place"
            control={control}
            render={({ field }) => (
              <PlaceCombobox
                id={id('place')}
                value={field.value ?? ''}
                onChange={field.onChange}
                suggestions={placeSuggestions}
                disabled={disabled}
              />
            )}
          />
          {errors.place && <p className="text-sm text-red-500">{errors.place.message}</p>}
        </div>
      )}

      {(transactionType === 'expense' || transactionType === 'advance') && (
        <div className="space-y-2">
          <Label htmlFor={id('payer')}>支払者</Label>
          <Controller
            name="payerUserId"
            control={control}
            render={({ field }) => (
              <select
                id={id('payer')}
                className="min-h-11 w-full touch-manipulation rounded-md border border-gray-200 bg-white px-3 py-2 text-base"
                disabled={disabled}
                value={field.value ?? ''}
                onChange={(event) => field.onChange(event.target.value || null)}
              >
                <option value="" disabled>
                  支払者を選択
                </option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {getMemberLabel(member)}
                    {member.userId === currentUserId ? '（自分）' : ''}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.payerUserId && (
            <p className="text-sm text-red-500">{errors.payerUserId.message}</p>
          )}
        </div>
      )}

      {transactionType === 'advance' && (
        <div className="space-y-2">
          <Label htmlFor={id('advanceTo')}>立替先</Label>
          <Controller
            name="advanceToUserId"
            control={control}
            render={({ field }) => (
              <select
                id={id('advanceTo')}
                className="min-h-11 w-full touch-manipulation rounded-md border border-gray-200 bg-white px-3 py-2 text-base"
                disabled={disabled}
                value={field.value ?? '__household__'}
                onChange={(event) =>
                  field.onChange(event.target.value === '__household__' ? null : event.target.value)
                }
              >
                <option value="__household__">家庭全体に立替</option>
                {members
                  .filter((member) => member.userId !== payerUserId)
                  .map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {getMemberLabel(member)}
                      {member.userId === currentUserId ? '（自分）' : ''}
                    </option>
                  ))}
              </select>
            )}
          />
          {errors.advanceToUserId && (
            <p className="text-sm text-red-500">{errors.advanceToUserId.message}</p>
          )}
        </div>
      )}
    </>
  );
}
