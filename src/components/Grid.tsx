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
  /** One valid answer per cell, revealed for unsolved cells once the game ends. */
  reveals?: (string | null)[];
}

/**
 * Tiles are 4:3 rather than square because car photography is landscape — two
 * thirds of the dataset is 1.7:1 or wider, and a square crop cuts the nose or
 * tail off the car.
 *
 * The grid is sized by whichever runs out first: the 64rem cap, the viewport
 * width, or the viewport *height* working back from the tile aspect ratio. That
 * last term is what keeps the whole board on screen without scrolling. `dvh`
 * rather than `vh` because mobile browser chrome makes `vh` overflow.
 */
/**
 * Label column width lives in globals.css as `--label-w`, because it has to
 * change at the same 640px breakpoint where the chips switch font size and
 * swap in their short forms, and an inline style cannot hold a media query.
 */
const LABEL = "var(--label-w)";

/**
 * Phone-only short forms, shown below the `sm` breakpoint.
 *
 * Only one entry, and it has to stay that way unless a label is BOTH too wide
 * and unambiguous when shortened. "Turbocharged" qualifies on both counts: it
 * is the widest token across all 104 labels, and its axis holds exactly two
 * values, "Turbocharged" and "Naturally aspirated", so "Turbo" cannot be
 * mistaken for anything. Brands are deliberately absent: "Lambo" is slang, and
 * "VW" would read as the existing "VW Group" parent-company label.
 *
 * Swapped with CSS rather than a width check in JS, so there is no hydration
 * mismatch and no resize listener. The hidden copy is `display: none`, which
 * screen readers skip, so only one label is ever announced.
 */
const SHORT_LABELS: Record<string, string> = {
  Turbocharged: "Turbo",
};

function AxisLabel({ label }: { label: string }) {
  const short = SHORT_LABELS[label];
  if (!short) return <>{label}</>;
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{label}</span>
    </>
  );
}
const GAP = "0.5rem";
const HEADER_ROW = "3.25rem";
const VERTICAL_BUDGET = "84dvh";

const gridSizing: React.CSSProperties = {
  // 3 tiles tall at 4:3 => grid width = 3 * (cellHeight * 4/3) + label + gaps
  width: `min(64rem, 100%, calc(((${VERTICAL_BUDGET} - ${HEADER_ROW} - 3 * ${GAP}) / 3) * 4 + ${LABEL} + 3 * ${GAP}))`,
  gridTemplateColumns: `${LABEL} repeat(3, 1fr)`,
  gap: GAP,
};

export default function Grid({
  layout,
  cells,
  selectedCell,
  gameOver,
  onCellClick,
  reveals,
}: Props) {
  return (
    <div className="mx-auto grid" style={gridSizing}>
      {/* Top-left empty corner */}
      <div />

      {/* Column headers */}
      {layout.columns.map((col) => (
        <div
          key={col.value}
          className="axis-chip axis-chip-col font-display flex items-center justify-center rounded-lg text-center text-[11px] uppercase sm:text-xs"
          style={{ minHeight: HEADER_ROW }}
        >
          <AxisLabel label={col.label} />
        </div>
      ))}

      {/* Rows */}
      {layout.rows.map((row, rowIdx) => (
        <Fragment key={rowIdx}>
          {/* Row header */}
          <div className="axis-chip axis-chip-row font-display flex items-center justify-center rounded-lg text-center text-[11px] uppercase sm:text-xs">
            <AxisLabel label={row.label} />
          </div>

          {/* Cells */}
          {[0, 1, 2].map((colIdx) => {
            const cellIndex = rowIdx * 3 + colIdx;
            const cell = cells[cellIndex];
            const isSelected =
              selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
            const car = cell.carId ? getCarById(cell.carId) : null;
            const reveal = reveals?.[cellIndex] ?? null;

            const axes = `${row.label} by ${col(layout, colIdx)}`;
            const ariaLabel = cell.solved && car
              ? `${axes}, solved: ${car.make} ${car.model}`
              : gameOver
              ? `${axes}, unsolved`
              : `${axes}, empty — tap to guess`;

            return (
              <button
                key={colIdx}
                onClick={() => !cell.solved && !gameOver && onCellClick(rowIdx, colIdx)}
                disabled={cell.solved || gameOver}
                aria-label={ariaLabel}
                className={`tile group relative aspect-[4/3] overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-hazard-400 focus-visible:ring-offset-2 focus-visible:ring-offset-asphalt-900
                  ${cell.solved
                    ? "tile-solved tile-sweep cursor-default"
                    : isSelected
                    ? "border-hazard-400 shadow-[0_0_0_3px_rgba(255,157,0,0.25)]"
                    : gameOver
                    ? "cursor-default opacity-60"
                    : "tile-open"
                  }`}
              >
                {cell.solved && car ? (
                  car.image_url ? (
                    <>
                      <Image
                        src={car.image_url}
                        alt={`${car.make} ${car.model}`}
                        fill
                        sizes="(max-width: 640px) 32vw, 300px"
                        className="object-cover"
                      />
                      {/* Always-on caption: the photo alone does not tell you
                          which car you actually scored. */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 pb-1.5 pt-6 text-left">
                        <p className="truncate text-xs font-semibold leading-tight text-white sm:text-sm">
                          {car.make} {car.model}
                        </p>
                        <p className="truncate text-[10px] leading-tight text-gray-300 sm:text-xs">
                          {car.production_start}–{car.production_end ?? "now"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
                      <span className="text-lg text-green-400">✓</span>
                      <span className="text-center text-xs font-medium leading-tight text-gray-200">
                        {car.make} {car.model}
                      </span>
                      <span className="text-xs text-gray-400">Gen {car.generation}</span>
                    </div>
                  )
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                    {gameOver && reveal ? (
                      <>
                        <span className="text-[10px] uppercase tracking-wider text-gray-600">
                          Answer
                        </span>
                        <span className="text-xs font-medium leading-tight text-gray-400 sm:text-sm">
                          {reveal}
                        </span>
                      </>
                    ) : (
                      !gameOver && (
                        <span className="font-display text-2xl text-asphalt-500 transition-colors group-hover:text-hazard-500">
                          +
                        </span>
                      )
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

function col(layout: GridLayout, index: number): string {
  return layout.columns[index].label;
}
