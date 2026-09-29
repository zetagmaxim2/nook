import type { Chapter } from "./types";

export type ChapterDraft = {
  title: string;
  content: string;
  modifiedAt: number;
};
export const chapterDraftKey = (chapterId: string) =>
  `nook-chapter-draft:${chapterId}`;

export function recoverChapterDraft(
  chapter: Chapter,
  storage?: Pick<Storage, "getItem">,
): ChapterDraft | null {
  try {
    const stored = (storage ?? localStorage).getItem(
      chapterDraftKey(chapter.id),
    );
    if (!stored) return null;
    const draft = JSON.parse(stored) as ChapterDraft;
    if (
      typeof draft.title !== "string" ||
      typeof draft.content !== "string" ||
      typeof draft.modifiedAt !== "number" ||
      !Number.isFinite(draft.modifiedAt) ||
      draft.modifiedAt <= Date.parse(chapter.updatedAt)
    )
      return null;
    return draft;
  } catch {
    return null;
  }
}
