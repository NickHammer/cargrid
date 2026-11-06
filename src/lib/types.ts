export interface Car {
  id: string;
  make: string;
  model: string;
  /**
   * Other names players genuinely type for this car — a US player searches
   * "Miata", not "MX-5". Matched by searchNameplates but never displayed, so the
   * answer label stays canonical.
   */
  aliases?: string[];
  generation: number;
  brands: string[];
  country_of_origin: string;
  production_start: number;
  production_end: number | null;
  decades: string[];
  engine_layouts: string[];
  body_style: string;
  drivetrain: string[];
  car_class: string;
  power_output_hp_min: number;
  power_output_hp_max: number;
  power_output_ranges: string[];
  transmission: string[];
  fuel_type: string[];
  pop_culture: string[] | null;
  price_at_launch_usd: number | null;
  manufacturer_still_active: boolean;
  image_url: string;
  /** Reviewed launch variants only; unknown facts stay absent. */
  engine_position?: "Front-engine" | "Mid-engine" | "Rear-engine";
  powertrains?: Powertrain[];
}

/**
 * A make + model and every generation of it in the catalog — what a player
 * guesses, and what the autocomplete lists. Built by `groupByNameplate`;
 * `cars` is ordered by generation.
 */
export interface Nameplate {
  /** `${make} ${model}` — also the display label and the reuse key. */
  key: string;
  make: string;
  model: string;
  cars: Car[];
}

export interface Powertrain {
  name: string;
  displacement_cc?: number;
  cylinders?: number;
  aspiration?: "Naturally aspirated" | "Turbocharged" | "Supercharged";
}

export type ParameterType =
  | "brand"
  | "country_of_origin"
  | "decade"
  | "engine_layout"
  | "body_style"
  | "drivetrain"
  | "car_class"
  | "power_output"
  | "transmission"
  | "fuel_type"
  // "pop_culture" and "price_at_launch" were retired as axes on 2026-11-03 —
  // see the note in parameters.mjs. The Car fields above stay; the axes went.
  | "manufacturer_still_active"
  | "aspiration"
  | "engine_position"
  | "displacement"
  | "cylinder_count"
  | "region"
  | "parent_group";

export interface GridParameter {
  type: ParameterType;
  value: string;
  label: string;
}

export interface GridLayout {
  id: string;
  date: string;
  rows: [GridParameter, GridParameter, GridParameter];
  columns: [GridParameter, GridParameter, GridParameter];
}

export interface CellState {
  solved: boolean;
  carId: string | null;
}

export interface GameState {
  date: string;
  gridId: string;
  /** 9 elements in row-major order: index = row * 3 + col */
  cells: CellState[];
  guessesUsed: number;
}
