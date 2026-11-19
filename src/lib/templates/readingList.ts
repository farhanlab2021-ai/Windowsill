import { bullet, heading, quote, table, toggle } from "./blocks";
import type { Template } from "./types";

const STATUS = { toRead: "📕 To read", reading: "📖 Reading", done: "✅ Finished" };

export const readingList: Template = {
  id: "reading-list",
  name: "Reading List",
  description: "Books and papers to read, with status and quick notes.",
  icon: "📖",
  cover: "meadow",
  build: () => ({
    title: "Reading List",
    blocks: [
      table(
        ["Title", "Author", "Course", "Status", "Notes"],
        [
          ["Campbell Biology, ch. 6–8", "Urry et al.", "BIO 101", STATUS.reading, "Focus on figures"],
          ["How to Read a Paper", "S. Keshav", "—", STATUS.toRead, "Short, 3-pass method"],
          ["Thinking, Fast and Slow", "D. Kahneman", "PSY 100", STATUS.done, ""],
        ],
        [200, 130, 100, 120, 180],
      ),
      heading(2, "Reading notes"),
      toggle("Campbell Biology, ch. 6–8", [
        bullet("Main idea:"),
        bullet("Key terms:"),
        quote("A quote worth remembering…"),
      ]),
    ],
  }),
};
