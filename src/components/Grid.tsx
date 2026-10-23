"use client";

import { Fragment } from "react";
import Image from "next/image";
import type { GridLayout, CellState } from "@/lib/types";
import { getCarById } from "@/lib/cars";

interface Props {
  layout: GridLayout;
  cells: CellState[];
  selectedCell: { row: number; col: number } | null;
  gameOver: boolean;
  onCellClick: (row: number, col: number) => void;
}

export default function Grid({
  layout,
  cells,
  selectedCell,
  gameOver,
  onCellClick,
}: Props) {
  return (
    <div className="grid grid-cols-[96px_repeat(3,_1fr)] gap-1.5">
      {/* Top-left empty corner */}
      <div />

      {/* Column headers */}
      {layout.columns.map((col) => (
        <div
          key={col.value}
          className="flex items-center justify-center rounded-lg bg-gray-800 px-2 py-3 text-center text-sm font-semibold text-amber-400"
        >
          {col.label}
        </div>
      ))}

      {/* Rows */}
      {layout.rows.map((row, rowIdx) => (
        <Fragment key={rowIdx}>
          {/* Row header */}
          <div
            className="flex items-center justify-center rounded-lg bg-gray-800 px-2 py-3 text-center text-sm font-semibold text-amber-400"
          >
            {row.label}
          </div>

          {/* Cells */}
          {[0, 1, 2].map((colIdx) => {
            const cellIndex = rowIdx * 3 + colIdx;
            const cell = cells[cellIndex];
            const isSelected =
              selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
            const car = cell.carId ? getCarById(cell.carId) : null;

            return (
              <button
                key={colIdx}
                onClick={() => !cell.solved && !gameOver && onCellClick(rowIdx, colIdx)}
                disabled={cell.solved || gameOver}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all
                  ${cell.solved
                    ? "cursor-default border-green-500 bg-gray-800"
                    : isSelected
                    ? "border-amber-400 bg-gray-700"
                    : gameOver
                    ? "cursor-default border-gray-700 bg-gray-900 opacity-50"
                    : "border-gray-700 bg-gray-800 hover:border-amber-500 hover:bg-gray-700 active:scale-95"
                  }`}
              >
                {cell.solved && car ? (
                  <>
                    {car.image_url ? (
                      <Image
                        src={car.image_url}
                        alt={`${car.make} ${car.model}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
                        <span className="text-lg text-green-400">✓</span>
                        <span className="text-center text-xs font-medium leading-tight text-gray-200">
                          {car.make} {car.model}
                        </span>
                        <span className="text-xs text-gray-400">
                          Gen {car.generation}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {!gameOver && (
                      <span className="text-2xl text-gray-600">+</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
