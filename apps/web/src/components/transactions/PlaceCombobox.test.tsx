import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceCombobox } from './PlaceCombobox';

const suggestions = [
  { place: 'スーパー田中', useCount: 4, lastUsedOn: '2026-07-20' },
  { place: 'ドラッグてらだ', useCount: 2, lastUsedOn: '2026-07-18' },
  { place: 'スーパーマルイ', useCount: 1, lastUsedOn: '2026-07-10' },
];

describe('PlaceCombobox', () => {
  it('フォーカス時に複数候補を表示し、入力内容で部分一致する', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PlaceCombobox id="place" value="" onChange={onChange} suggestions={suggestions} />
    );

    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(3);

    rerender(
      <PlaceCombobox id="place" value="スーパー" onChange={onChange} suggestions={suggestions} />
    );
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('矢印キーとEnterで候補を選べる', () => {
    const onChange = vi.fn();
    render(<PlaceCombobox id="place" value="" onChange={onChange} suggestions={suggestions} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('スーパー田中');
  });
});
