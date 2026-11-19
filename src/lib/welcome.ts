/**
 * The page created the very first time someone opens Windowsill.
 * Written as BlockNote blocks (the same JSON the editor saves).
 */
import { getSetting, setSetting } from "./db/settings";
import { createPage } from "./db/pages";
import { blocksToPlainText } from "./editor/plainText";
import { gradientCoverValue } from "./covers";

const text = (t: string, styles: Record<string, boolean> = {}) => ({ type: "text", text: t, styles });

const WELCOME_BLOCKS = [
  {
    type: "paragraph",
    content: [text("A quiet place to take notes, plan your week and focus. Everything is saved on this device as you type — no account needed.")],
  },
  { type: "heading", props: { level: 2 }, content: [text("Try these")] },
  { type: "checkListItem", content: [text("Type "), text("/", { code: true }), text(" on an empty line to see all block types")] },
  { type: "checkListItem", content: [text("Type "), text("# ", { code: true }), text(" for a heading, "), text("- ", { code: true }), text(" for a bullet, or "), text("[] ", { code: true }), text(" for a to-do")] },
  { type: "checkListItem", content: [text("Drag the ⋮⋮ handle beside a block to move it")] },
  { type: "checkListItem", content: [text("Add a sub-page with the + next to a page in the sidebar, and drag pages to reorder or nest them")] },
  { type: "checkListItem", content: [text("Give this page your own icon and cover (hover above the title)")] },
  {
    type: "callout",
    props: { tone: "note" },
    content: [text("Tip: click the emoji in a callout to change its style.")],
  },
  { type: "toggleListItem", content: [text("What's coming next?")], children: [
    { type: "bulletListItem", content: [text("Student templates and search (Ctrl/Cmd + K)")] },
    { type: "bulletListItem", content: [text("A Pomodoro timer with stats")] },
    { type: "bulletListItem", content: [text("Focus Mode — study by the window, with a beach or mountain view")] },
  ] },
];

let seeding: Promise<string | null> | null = null;

/**
 * Creates the welcome page once per device. Returns its id if it was created now.
 * (Guarded so React's double-run in development can't create two.)
 */
export function seedWelcomePage(): Promise<string | null> {
  seeding ??= (async () => {
    if (await getSetting("seededWelcome", false)) return null;
    await setSetting("seededWelcome", true);
    const page = await createPage({
      title: "Welcome to Windowsill",
      icon: "🌿", // (🪴 isn't available in Windows 10's emoji font)
      cover: gradientCoverValue("dawn"),
      blocks: WELCOME_BLOCKS,
      plainText: blocksToPlainText(WELCOME_BLOCKS),
    });
    return page.id;
  })();
  return seeding;
}
