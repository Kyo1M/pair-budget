import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CurrencyInput } from './CurrencyInput';

describe('CurrencyInput', () => {
  it('iPhone向けの数字キーボードと44pxの操作領域を使う', () => {
    render(<CurrencyInput aria-label="金額" />);
    const input = screen.getByRole('textbox', { name: '金額' });
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveClass('min-h-11');
  });
});
