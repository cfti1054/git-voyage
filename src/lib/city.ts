import type { BuildingCell, ContributionDay, ContributionLevel } from "./types";

export const CELL_SIZE = 4.2;
export const BUILDING_FOOTPRINT = 2.4;
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

export function toBuildingCells(days: ContributionDay[]): {
  buildings: BuildingCell[];
  parks: BuildingCell[];
  maxCount: number;
  cityWidth: number;
  cityDepth: number;
} {
  const maxCount = days.reduce((max, day) => Math.max(max, day.count), 0);
  const buildings: BuildingCell[] = [];
  const parks: BuildingCell[] = [];

  let maxWeek = 0;
  for (const day of days) {
    maxWeek = Math.max(maxWeek, day.weekIndex);
    const cell: BuildingCell = {
      date: day.date,
      count: day.count,
      level: levelRank(day.level),
      color: buildingColor(day),
      x: day.weekIndex * CELL_SIZE,
      z: day.weekday * CELL_SIZE,
      height: heightFromCount(day.count, maxCount),
    };

    if (day.count > 0) {
      buildings.push(cell);
    } else {
      parks.push({ ...cell, height: PARK_HEIGHT, color: "#5d7a55" });
    }
  }

  return {
    buildings,
    parks,
    maxCount,
    cityWidth: (maxWeek + 1) * CELL_SIZE,
    cityDepth: 7 * CELL_SIZE,
  };
}
