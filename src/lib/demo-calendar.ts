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

const LANGUAGES = [
  { name: "Python", color: "#3572A5" },
  { name: "Java", color: "#b07219" },
  { name: "HTML", color: "#e34c26" },
  { name: "CSS", color: "#563d7c" },
  { name: "TypeScript", color: "#3178c6" },
];

export function createDemoCalendar(
  fromYear = new Date().getUTCFullYear() - 5,
  toYear = new Date().getUTCFullYear(),
): VoyageCalendar {
  const from = new Date(Date.UTC(fromYear, 0, 1));
  const requestedTo = new Date(Date.UTC(toYear, 11, 31));
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const to = requestedTo > today ? today : requestedTo;

  const days: ContributionDay[] = [];
  const cursor = new Date(from);
  let total = 0;

  while (cursor <= to) {
    const year = cursor.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const dayOfYear =
      Math.floor((cursor.getTime() - yearStart.getTime()) / 86_400_000) + 1;
    const weekIndex = Math.min(52, Math.floor((dayOfYear - 1) / 7));
    const weekday = cursor.getUTCDay();
    const noise = hash(cursor.getTime() / 86_400_000);
    const weekend = weekday === 0 || weekday === 6;
    const streak = (weekIndex + year) % 9 < 5;
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
    const language =
      count > 0
        ? LANGUAGES[(weekIndex + cursor.getUTCMonth() + year) % LANGUAGES.length]
        : null;

    days.push({
      date: cursor.toISOString().slice(0, 10),
      count,
      level: LEVELS[levelIndex],
      color: COLORS[levelIndex],
      weekday,
      weekIndex,
      year,
      language: language?.name ?? null,
      languageColor: language?.color ?? null,
    });
    total += count;

    cursor.setUTCDate(cursor.getUTCDate() + 1);
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
