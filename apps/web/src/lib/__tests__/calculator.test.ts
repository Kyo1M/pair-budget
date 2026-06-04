import { describe, expect, it } from 'vitest';
import {
  backspace,
  calcTotal,
  clearCalc,
  formatCalcTape,
  initialCalcState,
  inputDigit,
  pressPlus,
} from '@/lib/calculator';

describe('inputDigit', () => {
  it('数字を current に追記する', () => {
    let s = initialCalcState;
    s = inputDigit(s, '1');
    s = inputDigit(s, '2');
    expect(s.current).toBe('12');
  });

  it('先頭の余分な 0 を置き換える', () => {
    let s = inputDigit(initialCalcState, '0');
    s = inputDigit(s, '5');
    expect(s.current).toBe('5');
  });

  it('10桁を超える入力は無視する（DB amount=NUMERIC(12,2)）', () => {
    let s = initialCalcState;
    for (let i = 0; i < 15; i++) s = inputDigit(s, '9');
    expect(s.current).toHaveLength(10);
  });
});

describe('pressPlus', () => {
  it('current を entries に確定し current を空にする', () => {
    let s = inputDigit(initialCalcState, '8');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0');
    s = pressPlus(s);
    expect(s.entries).toEqual([800]);
    expect(s.current).toBe('');
  });

  it('current が空なら何もしない', () => {
    const s = pressPlus(initialCalcState);
    expect(s).toEqual(initialCalcState);
  });
});

describe('backspace', () => {
  it('current の末尾を削る', () => {
    let s = inputDigit(initialCalcState, '1');
    s = inputDigit(s, '2');
    s = backspace(s);
    expect(s.current).toBe('1');
  });

  it('current が空なら直前の entry を current に戻す', () => {
    let s = inputDigit(initialCalcState, '5');
    s = pressPlus(s); // entries=[5], current=''
    s = backspace(s);
    expect(s.entries).toEqual([]);
    expect(s.current).toBe('5');
  });
});

describe('calcTotal', () => {
  it('entries と current を合算する', () => {
    let s = inputDigit(initialCalcState, '1');
    s = inputDigit(s, '2');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0'); // 1200
    s = pressPlus(s);
    s = inputDigit(s, '8');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0'); // 800
    expect(calcTotal(s)).toBe(2000);
  });

  it('初期状態は 0', () => {
    expect(calcTotal(initialCalcState)).toBe(0);
  });
});

describe('formatCalcTape', () => {
  it('項を ＋ 区切りで桁区切り表示する', () => {
    let s = inputDigit(initialCalcState, '1');
    s = inputDigit(s, '2');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0');
    s = pressPlus(s);
    s = inputDigit(s, '8');
    s = inputDigit(s, '0');
    s = inputDigit(s, '0');
    expect(formatCalcTape(s)).toBe('1,200 ＋ 800');
  });

  it('空なら 0 を返す', () => {
    expect(formatCalcTape(initialCalcState)).toBe('0');
  });
});

describe('clearCalc', () => {
  it('初期状態に戻す', () => {
    expect(clearCalc()).toEqual(initialCalcState);
  });
});
