/**
 * Turns BlockNote's JSON blocks into plain text, so pages can be searched.
 * Written defensively (no BlockNote imports) so it works on any saved data.
 */

type Json = Record<string, unknown>;

function inlineToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      const node = item as Json;
      if (typeof node.text === "string") return node.text;
      // Date chips are searchable by their date ("2026-12-05").
      const props = node.props as Json | undefined;
      if (node.type === "dateChip" && typeof props?.date === "string") return props.date;
      // Links (and other inline nodes) wrap their own content.
      return inlineToText(node.content);
    })
    .join("");
}

function tableToText(content: Json): string[] {
  const rows = Array.isArray(content.rows) ? content.rows : [];
  return rows.map((row) => {
    const cells = Array.isArray((row as Json).cells) ? ((row as Json).cells as unknown[]) : [];
    return cells
      .map((cell) =>
        // A cell is either an array of inline content or { type: "tableCell", content: [...] }.
        Array.isArray(cell) ? inlineToText(cell) : inlineToText((cell as Json)?.content),
      )
      .join(" | ");
  });
}

export function blocksToPlainText(blocks: unknown[]): string {
  const lines: string[] = [];
  const visit = (list: unknown[]) => {
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const block = raw as Json;
      const content = block.content;
      if (content && typeof content === "object" && !Array.isArray(content)) {
        if ((content as Json).type === "tableContent") lines.push(...tableToText(content as Json));
      } else {
        const text = inlineToText(content);
        if (text) lines.push(text);
      }
      // Image captions and file names are searchable too.
      const props = block.props as Json | undefined;
      if (typeof props?.caption === "string" && props.caption) lines.push(props.caption);
      // Imported PDF pages and slides keep their words in `text`, so search finds them.
      if (block.type === "docPage" && typeof props?.text === "string" && props.text) lines.push(props.text);
      if (Array.isArray(block.children)) visit(block.children);
    }
  };
  visit(blocks);
  return lines.join("\n");
}
