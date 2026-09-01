import type { ContributionDay, ContributionLevel, VoyageCalendar } from "./types";

const LEVELS: ContributionLevel[] = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
];

const COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

function hash(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function createDemoCalendar(now = new Date()): VoyageCalendar {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 370);

  const start = new Date(from);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const days: ContributionDay[] = [];
  let cursor = new Date(start);
  let weekIndex = 0;
  let total = 0;

  while (cursor <= to) {
    const weekday = cursor.getUTCDay();
    const noise = hash(cursor.getTime() / 86_400_000);
    const weekend = weekday === 0 || weekday === 6;
    const streak = weekIndex % 9 < 5;
    let count = 0;

    if (streak && !weekend && noise > 0.18) {
      count = Math.floor(1 + noise * 14);
    } else if (noise > 0.82) {
      count = Math.floor(1 + noise * 6);
    } else if (weekIndex === 20 && weekday === 3) {
      count = 22;
    }

    const levelIndex =
      count === 0 ? 0 : count < 3 ? 1 : count < 7 ? 2 : count < 12 ? 3 : 4;

    days.push({
      date: cursor.toISOString().slice(0, 10),
      count,
      level: LEVELS[levelIndex],
      color: COLORS[levelIndex],
      weekday,
      weekIndex,
    });
    total += count;

    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor.getUTCDay() === 0) {
      weekIndex += 1;
    }
  }

  return {
    login: "demo",
    name: "Demo City",
    avatarUrl: null,
    totalContributions: total,
    days,
    source: "demo",
    from: days[0].date,
    to: days[days.length - 1].date,
  };
}
