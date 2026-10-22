import type {
  BuildingCell,
  BuildingTheme,
  ContributionDay,
  ContributionLevel,
} from "./types";

// 1 world unit is treated as roughly 1 metre. The paper plane is about 1.35 m
// long, while a city block building is 24 m wide with a 10 m street gap.
// Blender props use a slightly smaller multiplier so roof overhangs remain
// inside each 34 m cell.
export const CITY_MODEL_SCALE = 7.5;
export const CELL_SIZE = 34;
export const BUILDING_FOOTPRINT = 24;
export const GRID_COLUMNS = 53;
export const ROWS_PER_YEAR = 7;
export const MIN_HEIGHT = 15;
export const MAX_HEIGHT = 180;
export const PARK_HEIGHT = 1;

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

/**
 * modern_building_{세트}_{단계}Level_Demo.glb의 실제 최고 높이(m).
 * glb는 CITY_MODEL_SCALE 균일 스케일로 놓이므로 이 값이 곧 충돌 높이다.
 * 단계별 범위가 겹치지 않아서 단계가 높을수록 항상 더 높다.
 */
export const MODERN_BUILDING_HEIGHTS: readonly (readonly number[])[] = [
  [15, 70, 125, 180],
  [22, 62, 133, 190],
  [16, 78, 118, 172],
  [26, 56, 138, 168],
];
export const MODERN_BUILDING_SETS = MODERN_BUILDING_HEIGHTS.length;
export const PARK_VARIANTS = 2;

/**
 * 단계별로 (열 짝홀, 행 짝홀) 칸 종류 → 세트 번호 순서를 다르게 섞는다.
 * 각 행은 0~3의 순열이어야 한다.
 */
const LEVEL_SET_ORDER: readonly (readonly number[])[] = [
  [0, 1, 2, 3],
  [2, 0, 3, 1],
  [1, 3, 0, 2],
  [3, 2, 1, 0],
];

export function modernBuildingUrl(variant: number, level: number): string {
  return `/models/buildings/modern_building_${variant + 1}_${level}Level_Demo.glb`;
}

export function parkUrl(variant: number): string {
  return variant === 0
    ? "/models/buildings/park.glb"
    : `/models/buildings/park${variant + 1}.glb`;
}

function cellHash(column: number, row: number, salt: number): number {
  let h = Math.imul(column, 374761393) ^ Math.imul(row, 668265263) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * 주변 8칸은 열이나 행의 짝홀이 반드시 다르다. 그래서 짝홀 조합(4종)을
 * 세트 번호로 쓰면 같은 단계 이웃끼리 같은 glb가 놓이지 않는다.
 */
function modernSetFor(level: number, column: number, globalRow: number): number {
  const parityClass = (column % 2) * 2 + (globalRow % 2);
  return LEVEL_SET_ORDER[level - 1][parityClass];
}

function quarterTurn(column: number, globalRow: number): number {
  return (cellHash(column, globalRow, 0x5bd1e995) % 4) * (Math.PI / 2);
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
        const globalRow = index * ROWS_PER_YEAR + row;
        const level =
          count > 0 ? Math.min(4, Math.max(1, day ? levelRank(day.level) : 1)) : 0;
        const theme = themeFromLanguage(language);
        const variant =
          count > 0 && theme === "modern"
            ? modernSetFor(level, column, globalRow)
            : 0;
        const rotation = quarterTurn(column, globalRow);
        const cell: BuildingCell = {
          date: day?.date ?? `${year}-empty-${column}-${row}`,
          count,
          level,
          color: day ? buildingColor(day) : "#5d7a55",
          language,
          theme,
          x: column * CELL_SIZE,
          z: globalRow * CELL_SIZE,
          height:
            count > 0 && theme === "modern"
              ? MODERN_BUILDING_HEIGHTS[variant][level - 1]
              : heightFromCount(count, maxCount),
          variant,
          rotation,
        };

        if (count > 0) {
          buildings.push(cell);
        } else {
          parks.push({
            ...cell,
            height: PARK_HEIGHT,
            color: "#5d7a55",
            variant: cellHash(column, globalRow, 0x27d4eb2f) % PARK_VARIANTS,
          });
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
