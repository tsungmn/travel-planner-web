const DAY_COLORS = [
  { name: "teal", hex: "#0F766E" },
  { name: "orange", hex: "#EA580C" },
  { name: "violet", hex: "#7C3AED" },
  { name: "rose", hex: "#E11D48" },
  { name: "sky", hex: "#0284C7" },
  { name: "amber", hex: "#D97706" },
  { name: "lime", hex: "#65A30D" },
] as const;

export type DayColor = (typeof DAY_COLORS)[number];

export function getDayColor(dayIndex: number): DayColor {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}
