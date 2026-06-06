/**
 * かんたん電卓の純粋ロジック。
 * UI に依存しない状態遷移と合計計算のみを担う（フル電卓ではなく足し算専用）。
 */

export interface CalcState {
  /** 確定済みの加算項 */
  entries: number[];
  /** 入力中の数値文字列 */
  current: string;
}

export const initialCalcState: CalcState = { entries: [], current: '' };

/** 数字を 1 文字入力する。先頭の余分な 0 を避け、10 桁を上限にする（DB amount=NUMERIC(12,2)=整数10桁）。 */
export function inputDigit(state: CalcState, digit: string): CalcState {
  const next = state.current === '0' ? digit : state.current + digit;
  if (next.length > 10) {
    return state;
  }
  return { ...state, current: next };
}

/** current を entries へ確定し、current を空にする（足し算の「＋」）。 */
export function pressPlus(state: CalcState): CalcState {
  if (state.current === '') {
    return state;
  }
  return { entries: [...state.entries, Number(state.current)], current: '' };
}

/** 1 文字削除。current が空なら直前の entry を current に戻す。 */
export function backspace(state: CalcState): CalcState {
  if (state.current !== '') {
    return { ...state, current: state.current.slice(0, -1) };
  }
  if (state.entries.length > 0) {
    const entries = state.entries.slice();
    const last = entries.pop() as number;
    return { entries, current: String(last) };
  }
  return state;
}

/** 初期状態に戻す。 */
export function clearCalc(): CalcState {
  return { entries: [], current: '' };
}

/** entries と current の合計を返す。 */
export function calcTotal(state: CalcState): number {
  const currentValue = state.current === '' ? 0 : Number(state.current);
  return state.entries.reduce((sum, n) => sum + n, 0) + currentValue;
}

/** "1,200 ＋ 800" のような途中式を返す。空なら "0"。 */
export function formatCalcTape(state: CalcState): string {
  const parts = state.entries.map((n) => n.toLocaleString());
  if (state.current !== '') {
    parts.push(Number(state.current).toLocaleString());
  }
  return parts.length ? parts.join(' ＋ ') : '0';
}
