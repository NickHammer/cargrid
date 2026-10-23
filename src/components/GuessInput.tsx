"use client";

import { useMemo, useState } from "react";
import { searchCars, carDisplayLabel } from "@/lib/cars";
import type { Car } from "@/lib/types";

interface Props {
  onSelect: (car: Car) => void;
  usedCarIds: Set<string>;
}

export default function GuessInput({ onSelect, usedCarIds }: Props) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const results = useMemo(
    () => searchCars(query).filter((c) => !usedCarIds.has(c.id)),
    [query, usedCarIds]
  );

  // A stale index can outlive the list it pointed into — clamp at use.
  const activeIndex = Math.min(highlighted, Math.max(results.length - 1, 0));

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      onSelect(results[activeIndex]);
    }
  }

  return (
    <div className="relative w-full">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
        }}
        onKeyDown={handleKey}
        placeholder="Search make and model…"
        className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
      />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-600 bg-gray-900 shadow-xl">
          {results.map((car, i) => (
            <li
              key={car.id}
              onClick={() => onSelect(car)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                i === activeIndex
                  ? "bg-amber-500 text-gray-950"
                  : "text-gray-200 hover:bg-gray-700"
              }`}
            >
              {carDisplayLabel(car)}
            </li>
          ))}
        </ul>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">No matching cars found.</p>
      )}
    </div>
  );
}
