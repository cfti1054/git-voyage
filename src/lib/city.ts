import type {
  BuildingCell,
  BuildingTheme,
  ContributionDay,
  ContributionLevel,
} from "./types";

export const CELL_SIZE = 4.2;
export const BUILDING_FOOTPRINT = 2.4;
export const GRID_COLUMNS = 53;
export const ROWS_PER_YEAR = 7;
export const MIN_HEIGHT = 1.2;
export const MAX_HEIGHT = 46;
export const PARK_HEIGHT = 0.18;

const LEVEL_RANK: Record<ContributionLevel, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const FALLBACK_GREENS = ["#9be9a8", "#40c463", "#30a14e", "#216e39"];

export function levelRank(level: ContributionLevel): number {
  return LEVEL_RANK[level] ?? 0;
}

export function buildingColor(day: ContributionDay): string {
  if (day.color && day.color.startsWith("#")) {
    return day.color;
  }
  const rank = levelRank(day.level);
  if (rank <= 0) {
    return "#6f8f6a";
  }
  return FALLBACK_GREENS[rank - 1];
}

export function heightFromCount(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }
  const normalized = count / maxCount;
  const curved = Math.pow(normalized, 0.72);
  return MIN_HEIGHT + curved * (MAX_HEIGHT - MIN_HEIGHT);
}

export function themeFromLanguage(language: string | null): BuildingTheme {
  switch (language?.toLowerCase()) {
    case "python":
      return "european";
    case "java":
      return "joseon";
    case "html":
    case "css":
      return "japanese";
    default:
      return "modern";
  }
}

export function toBuildingCells(days: ContributionDay[]): {
  buildings: BuildingCell[];
  parks: BuildingCell[];
  maxCount: number;
  cityWidth: number;
  cityDepth: number;
  years: { year: number; z: number }[];
} {
  const maxCount = days.reduce((max, day) => Math.max(max, day.count), 0);
  const buildings: BuildingCell[] = [];
  const parks: BuildingCell[] = [];
  const yearNumbers = [...new Set(days.map((day) => day.year))].sort(
    (a, b) => a - b,
  );
  const yearIndex = new Map(yearNumbers.map((year, index) => [year, index]));
  const bySlot = new Map<string, ContributionDay>();

  for (const day of days) {
    const date = new Date(`${day.date}T00:00:00Z`);
    const start = new Date(Date.UTC(day.year, 0, 1));
    const dayOfYear =
      Math.floor((date.getTime() - start.getTime()) / 86_400_000);
    const column = Math.floor(dayOfYear / ROWS_PER_YEAR);
    const row = dayOfYear % ROWS_PER_YEAR;
    bySlot.set(`${day.year}:${column}:${row}`, day);
  }

  for (const year of yearNumbers) {
    const index = yearIndex.get(year) ?? 0;
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      for (let row = 0; row < ROWS_PER_YEAR; row += 1) {
        const day = bySlot.get(`${year}:${column}:${row}`);
        const count = day?.count ?? 0;
        const language = day?.language ?? null;
        const cell: BuildingCell = {
          date: day?.date ?? `${year}-empty-${column}-${row}`,
          count,
          level: day ? levelRank(day.level) : 0,
          color: day ? buildingColor(day) : "#5d7a55",
          language,
          theme: themeFromLanguage(language),
          x: column * CELL_SIZE,
          z: (index * ROWS_PER_YEAR + row) * CELL_SIZE,
          height: heightFromCount(count, maxCount),
        };

        if (count > 0) {
          buildings.push(cell);
        } else {
          parks.push({ ...cell, height: PARK_HEIGHT, color: "#5d7a55" });
        }
      }
    }
  }

  return {
    buildings,
    parks,
    maxCount,
    cityWidth: GRID_COLUMNS * CELL_SIZE,
    cityDepth: yearNumbers.length * ROWS_PER_YEAR * CELL_SIZE,
    years: yearNumbers.map((year, index) => ({
      year,
      z: (index * ROWS_PER_YEAR + ROWS_PER_YEAR / 2) * CELL_SIZE,
    })),
  };
}
