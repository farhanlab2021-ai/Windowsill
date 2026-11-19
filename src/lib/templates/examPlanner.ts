import { addDays } from "../dates";
import { bold, callout, date, heading, paragraph, table, todo, toggle, bullet } from "./blocks";
import type { BlockJson } from "./blocks";
import type { Template } from "./types";

/** One exam section: date + countdown, a syllabus checklist and a study plan. */
function examSection(name: string, course: string, examDate: Date, topics: string[]): BlockJson[] {
  return [
    heading(2, `${name} — ${course}`),
    paragraph(bold("Exam date: "), date(examDate), "   ", bold("Room: "), ""),
    heading(3, "Syllabus checklist"),
    ...topics.map((topic) => todo(false, topic)),
    toggle("Study plan", [bullet("Re-read lecture notes"), bullet("Do past papers"), bullet("Make a one-page summary")]),
  ];
}

export const examPlanner: Template = {
  id: "exam-planner",
  name: "Exam Planner",
  description: "Your exams with dates, days remaining and a syllabus checklist for each.",
  icon: "📚",
  cover: "dusk",
  build: (today) => {
    const midterm = addDays(today, 10);
    const finalExam = addDays(today, 24);
    return {
      title: "Exam Planner",
      blocks: [
        callout("note", "Each date shows the days remaining. Click one to change it, and tick off topics as you revise."),
        heading(2, "Overview"),
        table(
          ["Exam", "Course", "Date", "Ready?"],
          [
            ["Midterm", "BIO 101", date(midterm), "Not yet"],
            ["Final", "MATH 140", date(finalExam), "Not yet"],
          ],
          [160, 120, 190, 120],
        ),
        ...examSection("Midterm", "BIO 101", midterm, [
          "Chapter 1 — Cell structure",
          "Chapter 2 — Membranes and transport",
          "Chapter 3 — Cell respiration",
        ]),
        ...examSection("Final", "MATH 140", finalExam, [
          "Limits and continuity",
          "Derivatives and their rules",
          "Applications of derivatives",
          "Intro to integrals",
        ]),
      ],
    };
  },
};
