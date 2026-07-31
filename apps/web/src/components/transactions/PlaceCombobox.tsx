'use client';

import { useId, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { PlaceSuggestion } from '@/types/transaction';

interface PlaceComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: PlaceSuggestion[];
  disabled?: boolean;
}

const MAX_VISIBLE_SUGGESTIONS = 8;

export function PlaceCombobox({
  id,
  value,
  onChange,
  suggestions,
  disabled,
}: PlaceComboboxProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase('ja');
    const filtered = query
      ? suggestions.filter((item) => item.place.toLocaleLowerCase('ja').includes(query))
      : suggestions;
    return filtered.slice(0, MAX_VISIBLE_SUGGESTIONS);
  }, [suggestions, value]);

  const choose = (place: string) => {
    onChange(place);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && filteredSuggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        autoComplete="off"
        placeholder="例：スーパー、コンビニ"
        disabled={disabled}
        className="min-h-11 text-base touch-manipulation"
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setIsOpen(false);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && filteredSuggestions.length > 0) {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => Math.min(current + 1, filteredSuggestions.length - 1));
          } else if (event.key === 'ArrowUp' && filteredSuggestions.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault();
            choose(filteredSuggestions[activeIndex].place);
          } else if (event.key === 'Escape') {
            setIsOpen(false);
            setActiveIndex(-1);
          }
        }}
      />

      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-[70] mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-white p-1 shadow-lg"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              id={`${listboxId}-${index}`}
              key={suggestion.place}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className="flex min-h-11 w-full touch-manipulation items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none aria-selected:bg-blue-50"
                onPointerDown={(event) => {
                  event.preventDefault();
                  choose(suggestion.place);
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate">{suggestion.place}</span>
                </span>
                <span className="shrink-0 text-xs text-gray-400">{suggestion.useCount}回</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
