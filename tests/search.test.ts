import { describe, expect, it } from "vitest";
import type { Page } from "@/lib/db/types";
import { createPageSearch, makeSnippet } from "@/lib/search/searchPages";

function page(id: string, title: string, deleted = false): Page {
  return {
    id, title, parentId: null, order: "a0", icon: null, cover: null, isFavorite: false,
    templateId: null, createdAt: 0, updatedAt: 0, deletedAt: deleted ? 1 : null,
  };
}

const pages = [page("bio", "Biology 101"), page("chem", "Chemistry notes"), page("old", "Old biology", true)];
const texts = new Map([
  ["bio", "Cells are the basic unit of life. The mitochondria is the powerhouse of the cell."],
  ["chem", "Covalent bonds share electrons. Ionic bonds transfer them."],
  ["old", "mitochondria"],
]);
const search = createPageSearch(pages, texts);

describe("page search", () => {
  it("finds pages by title, with title matches first", () => {
    expect(search("biology").map((r) => r.page.id)).toEqual(["bio"]);
  });

  it("finds words inside the page text, with a snippet", () => {
    const [result] = search("powerhouse");
    expect(result.page.id).toBe("bio");
    expect(result.snippet?.match).toBe("powerhouse");
    expect(result.snippet?.before).toContain("mitochondria is the");
  });

  it("matches partial words and small typos", () => {
    expect(search("mito")[0]?.page.id).toBe("bio");
    expect(search("mitocondria")[0]?.page.id).toBe("bio");
    expect(search("covalnt")[0]?.page.id).toBe("chem");
  });

  it("requires every word to match", () => {
    expect(search("bonds cells")).toEqual([]);
    expect(search("ionic bonds").map((r) => r.page.id)).toEqual(["chem"]);
  });

  it("ignores trashed pages and empty queries", () => {
    expect(search("old").map((r) => r.page.id)).not.toContain("old");
    expect(search("   ")).toEqual([]);
  });
});

describe("makeSnippet", () => {
  it("expands a prefix match to the whole word and adds ellipses", () => {
    const text = "x".repeat(100) + " the mitochondria is here " + "y".repeat(100);
    const snippet = makeSnippet(text, ["mito"], 10)!;
    expect(snippet.match).toBe("mitochondria");
    expect(snippet.before.startsWith("…")).toBe(true);
    expect(snippet.after.endsWith("…")).toBe(true);
  });

  it("starts and ends on whole words", () => {
    const text = "Reading notes about the importance of mitochondria in every single cell we study";
    const snippet = makeSnippet(text, ["mitochondria"], 20)!;
    expect(snippet.before).toBe("…the importance of ");
    expect(snippet.after).toBe(" in every single…");
  });

  it("returns null when nothing matches", () => {
    expect(makeSnippet("hello", ["zebra"])).toBeNull();
  });
});
