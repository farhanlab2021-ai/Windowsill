import { describe, expect, it } from "vitest";
import {
  createPage,
  deletePageForever,
  emptyTrash,
  getAllPages,
  getContent,
  indent,
  moveDown,
  movePage,
  moveUp,
  outdent,
  restorePage,
  saveContent,
  toggleFavorite,
  trashPage,
  updatePage,
} from "@/lib/db/pages";
import { childrenOf, trashRoots } from "@/lib/db/tree";

/** Titles of the live children of `parentId`, in sidebar order. */
async function titles(parentId: string | null = null) {
  return childrenOf(await getAllPages(), parentId).map((p) => p.title);
}

describe("pages repository", () => {
  it("creates pages in order, with empty content", async () => {
    const a = await createPage({ title: "A" });
    await createPage({ title: "B" });
    await createPage({ title: "C" });

    expect(await titles()).toEqual(["A", "B", "C"]);
    expect((await getContent(a.id))?.blocks).toEqual([]);
  });

  it("updates title, icon and favourite", async () => {
    const page = await createPage({ title: "Old" });
    await updatePage(page.id, { title: "New", icon: "📚" });
    await toggleFavorite(page.id);

    const [saved] = await getAllPages();
    expect(saved).toMatchObject({ title: "New", icon: "📚", isFavorite: true });
  });

  it("saves content and plain text", async () => {
    const page = await createPage();
    await saveContent(page.id, [{ type: "paragraph" }], "hello");
    expect(await getContent(page.id)).toMatchObject({ plainText: "hello" });
  });

  it("reorders with before/after drops", async () => {
    const a = await createPage({ title: "A" });
    await createPage({ title: "B" });
    const c = await createPage({ title: "C" });

    await movePage(c.id, a.id, "before");
    expect(await titles()).toEqual(["C", "A", "B"]);

    await movePage(c.id, a.id, "after");
    expect(await titles()).toEqual(["A", "C", "B"]);
  });

  it("nests pages with an 'inside' drop and refuses cycles", async () => {
    const parent = await createPage({ title: "Parent" });
    const child = await createPage({ title: "Child" });

    expect(await movePage(child.id, parent.id, "inside")).toBe(true);
    expect(await titles(parent.id)).toEqual(["Child"]);

    // A page can't be dropped inside its own sub-page.
    expect(await movePage(parent.id, child.id, "inside")).toBe(false);
    expect(await movePage(parent.id, parent.id, "inside")).toBe(false);
  });

  it("supports keyboard-style moves: up, down, indent, outdent", async () => {
    const a = await createPage({ title: "A" });
    const b = await createPage({ title: "B" });

    await moveUp(b.id);
    expect(await titles()).toEqual(["B", "A"]);
    await moveDown(b.id);
    expect(await titles()).toEqual(["A", "B"]);

    await indent(b.id);
    expect(await titles(a.id)).toEqual(["B"]);
    await outdent(b.id);
    expect(await titles()).toEqual(["A", "B"]);

    // Nothing above the first page, so it can't move up or indent.
    expect(await moveUp(a.id)).toBe(false);
    expect(await indent(a.id)).toBe(false);
  });

  it("trashes a page with its sub-pages and restores them together", async () => {
    const parent = await createPage({ title: "Parent" });
    await createPage({ title: "Child", parentId: parent.id });

    const trashed = await trashPage(parent.id);
    expect(trashed).toHaveLength(2);
    expect(await titles()).toEqual([]);
    // Only the page the student deleted is listed in the trash.
    expect(trashRoots(await getAllPages()).map((p) => p.title)).toEqual(["Parent"]);

    await restorePage(parent.id);
    expect(await titles()).toEqual(["Parent"]);
    expect(await titles(parent.id)).toEqual(["Child"]);
  });

  it("restores a sub-page to the top level if its parent is still in the trash", async () => {
    const parent = await createPage({ title: "Parent" });
    const child = await createPage({ title: "Child", parentId: parent.id });

    await trashPage(child.id);
    await new Promise((r) => setTimeout(r, 2)); // different timestamp
    await trashPage(parent.id);

    await restorePage(child.id);
    expect(await titles()).toEqual(["Child"]);
  });

  it("deletes forever and empties the trash", async () => {
    const a = await createPage({ title: "A" });
    const b = await createPage({ title: "B" });
    await createPage({ title: "Keep" });

    await deletePageForever(a.id);
    await trashPage(b.id);
    await emptyTrash();

    const all = await getAllPages();
    expect(all.map((p) => p.title)).toEqual(["Keep"]);
    expect(await getContent(a.id)).toBeUndefined();
  });
});
