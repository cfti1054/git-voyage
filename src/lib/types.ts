export type ContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE";

export type ContributionDay = {
  date: string;
  count: number;
  level: ContributionLevel;
  color: string;
  weekday: number;
  weekIndex: number;
};

export type VoyageCalendar = {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  totalContributions: number;
  days: ContributionDay[];
  source: "github" | "demo";
  from: string;
  to: string;
};

export type BuildingCell = {
  date: string;
  count: number;
  level: number;
  color: string;
  x: number;
  z: number;
  height: number;
};
