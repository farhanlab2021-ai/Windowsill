import { bold, bullet, callout, date, divider, heading, paragraph, todo } from "./blocks";
import type { Template } from "./types";

export const classNotes: Template = {
  id: "class-notes",
  name: "Class Notes",
  description: "Course, date, lecture topic, key points and questions to ask.",
  icon: "📝",
  cover: "sage",
  build: (today) => ({
    title: "Class Notes",
    blocks: [
      paragraph(bold("Course: "), ""),
      paragraph(bold("Date: "), date(today)),
      paragraph(bold("Lecture topic: "), ""),
      divider(),
      heading(2, "Key points"),
      bullet(),
      heading(2, "Notes"),
      paragraph(),
      heading(2, "Questions to ask"),
      todo(false),
      heading(2, "Summary"),
      callout("note", "In one or two sentences: what was this lecture about?"),
    ],
  }),
};
