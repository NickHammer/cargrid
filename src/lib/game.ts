import type { Car, GridParameter, GameState } from "./types";

export const MAX_GUESSES = 9;

export function carMatchesParameter(car: Car, param: GridParameter): boolean {
  switch (param.type) {
    case "brand":
      return car.brands.includes(param.value);
    case "country_of_origin":
      return car.country_of_origin === param.value;
    case "decade":
      return car.decades.includes(param.value);
    case "engine_layout":
      return car.engine_layouts.includes(param.value);
    case "body_style":
      return car.body_style === param.value;
    case "drivetrain":
      return car.drivetrain.includes(param.value);
    case "car_class":
      return car.car_class === param.value;
    case "power_output":
      return car.power_output_ranges.includes(param.value);
    case "transmission":
      return car.transmission.includes(param.value);
    case "fuel_type":
      return car.fuel_type.includes(param.value);
    case "pop_culture":
      return car.pop_culture?.includes(param.value) ?? false;
    case "price_at_launch":
      return checkPriceRange(car.price_at_launch_usd, param.value);
    case "manufacturer_still_active":
      return car.manufacturer_still_active === (param.value === "true");
  }
}

function checkPriceRange(price: number | null, range: string): boolean {
  if (price === null) return false;
  if (range.endsWith("+")) return price >= parseInt(range);
  const [min, max] = range.split("-").map(Number);
  return price >= min && price <= max;
}

export function isValidAnswer(
  car: Car,
  rowParam: GridParameter,
  colParam: GridParameter
): boolean {
  return carMatchesParameter(car, rowParam) && carMatchesParameter(car, colParam);
}

export function isCarAlreadyUsed(state: GameState, carId: string): boolean {
  return state.cells.some((cell) => cell.carId === carId);
}

export function isGameOver(state: GameState): boolean {
  return (
    state.guessesUsed >= MAX_GUESSES || state.cells.every((c) => c.solved)
  );
}

export function solvedCount(state: GameState): number {
  return state.cells.filter((c) => c.solved).length;
}

export function accuracyPercent(state: GameState): number {
  if (state.guessesUsed === 0) return 0;
  return Math.round((solvedCount(state) / state.guessesUsed) * 100);
}
