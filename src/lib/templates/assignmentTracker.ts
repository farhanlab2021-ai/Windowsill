import { addDays } from "../dates";
import { callout, date, heading, paragraph, table } from "./blocks";
import type { Template } from "./types";

export const STATUS = { notStarted: "⬜ Not started", inProgress: "🟦 In progress", done: "✅ Done" };
export const PRIORITY = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" };

export const assignmentTracker: Template = {
  id: "assignment-tracker",
  name: "Assignment Tracker",
  description: "A table of assignments with course, due date, status and priority.",
  icon: "🎯",
  cover: "dawn",
  build: (today) => ({
    title: "Assignment Tracker",
    blocks: [
      callout(
        "info",
        "Replace the examples with your own. Click a due date to change it — it counts down for you. To add a date in a new row, type / in the cell and choose ",
        { type: "text", text: "Date", styles: { bold: true } },
        ".",
      ),
      table(
        ["Assignment", "Course", "Due date", "Status", "Priority"],
        [
          ["Problem set 4", "MATH 140", date(addDays(today, 2)), STATUS.inProgress, PRIORITY.high],
          ["Lab report 2", "BIO 101", date(addDays(today, 6)), STATUS.notStarted, PRIORITY.medium],
          ["Essay outline", "ENG 110", date(addDays(today, 13)), STATUS.notStarted, PRIORITY.low],
          ["Reading quiz", "PSY 100", date(addDays(today, -1)), STATUS.done, PRIORITY.medium],
        ],
        [190, 110, 170, 140, 120],
      ),
      heading(3, "Status & priority options"),
      paragraph(`Status: ${STATUS.notStarted} · ${STATUS.inProgress} · ${STATUS.done}`),
      paragraph(`Priority: ${PRIORITY.high} · ${PRIORITY.medium} · ${PRIORITY.low}`),
    ],
  }),
};
