import { callout, heading, table, todo } from "./blocks";
import type { Template } from "./types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = ["8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

/** A few example classes so the timetable doesn't start blank. */
const EXAMPLES: Record<string, Record<string, string>> = {
  "9:00": { Mon: "BIO 101 · Lecture", Wed: "BIO 101 · Lecture" },
  "11:00": { Tue: "MATH 140", Thu: "MATH 140" },
  "12:00": { Mon: "🍽️ Lunch", Tue: "🍽️ Lunch", Wed: "🍽️ Lunch", Thu: "🍽️ Lunch", Fri: "🍽️ Lunch" },
  "14:00": { Fri: "BIO Lab" },
  "16:00": { Mon: "📖 Library", Wed: "📖 Library" },
};

export const weeklyTimetable: Template = {
  id: "weekly-timetable",
  name: "Weekly Timetable",
  description: "Your classes and study blocks for each day of the week.",
  icon: "🗓️",
  cover: "sea",
  build: () => ({
    title: "Weekly Timetable",
    blocks: [
      callout("info", "Type your classes into the grid. Add or remove rows and columns with the handles on the table's edges."),
      table(
        ["Time", ...DAYS],
        HOURS.map((hour) => [hour, ...DAYS.map((day) => EXAMPLES[hour]?.[day] ?? "")]),
        [90, ...DAYS.map(() => 120)],
      ),
      heading(2, "This week's focus"),
      todo(false, ""),
    ],
  }),
};
