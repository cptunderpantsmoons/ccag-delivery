"use client";

import { useRef, useState, useCallback } from "react";
import { Search, X } from "lucide-react";

export interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  placeholder = "Search…",
  onSearch,
  debounceMs = 300,
  className = "",
}: SearchInputProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setValue(next);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(next), debounceMs);
    },
    [onSearch, debounceMs],
  );

  const handleClear = useCallback(() => {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch("");
  }, [onSearch]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={15}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-[var(--space-md)] text-[var(--text-tertiary)]"
      />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="carbon-input rounded-xl bg-[var(--deep)] pl-[calc(var(--space-md)+20px)] pr-[var(--space-xl)] transition-colors focus:bg-[var(--surface)]"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-[var(--space-sm)] flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--deep)] hover:text-[var(--text-primary)]"
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
