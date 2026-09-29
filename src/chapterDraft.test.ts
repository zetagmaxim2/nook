import { describe, expect, it } from "vitest";
import { recoverChapterDraft } from "./chapterDraft";
import type { Chapter } from "./types";

const chapter: Chapter = {
  id: "chapter-1",
  novelId: "novel-1",
  title: "Saved title",
  content: "Saved text",
  wordCount: 2,
  order: 0,
  createdAt: "2026-09-29T10:00:00.000Z",
  updatedAt: "2026-09-29T10:00:00.000Z",
};

describe("chapter draft recovery", () => {
  it("restores text typed after the last committed save", () => {
    const storage = {
      getItem: () =>
        JSON.stringify({
          title: "New title",
          content: "Text typed before closing the app",
          modifiedAt: Date.parse(chapter.updatedAt) + 1000,
        }),
    };
    expect(recoverChapterDraft(chapter, storage)?.content).toBe(
      "Text typed before closing the app",
    );
  });

  it("does not replace a newer committed chapter with an old draft", () => {
    const storage = {
      getItem: () =>
        JSON.stringify({
          title: "Old title",
          content: "Old text",
          modifiedAt: Date.parse(chapter.updatedAt) - 1000,
        }),
    };
    expect(recoverChapterDraft(chapter, storage)).toBeNull();
  });
});
