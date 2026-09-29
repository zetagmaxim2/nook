import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Plus,
  BookOpen,
  Trash2,
  Pencil,
  GripVertical,
  Undo2,
  Redo2,
  Bold,
  Quote,
  ImagePlus,
  Save,
} from "lucide-react";
import { all, get, put, remove } from "../db";
import { chapterDraftKey, recoverChapterDraft } from "../chapterDraft";
import type { ChapterDraft } from "../chapterDraft";
import type { Novel, Chapter } from "../types";
import { countWords, formatDate, id, now } from "../utils";
import {
  Button,
  Card,
  Confirm,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  Sheet,
  TextArea,
  TextInput,
} from "../ui";
type Props = {
  novelId?: string;
  chapterId?: string;
  nav: (p: string) => void;
  refresh: () => void;
  notify: (s: string) => void;
  version: number;
};
export default function Novels(p: Props) {
  if (p.novelId && p.chapterId)
    return (
      <Editor
        key={p.chapterId}
        {...p}
        novelId={p.novelId}
        chapterId={p.chapterId}
      />
    );
  if (p.novelId) return <NovelDetail {...p} novelId={p.novelId} />;
  return <Gallery {...p} />;
}
function Gallery({ nav, notify }: Props) {
  const [items, setItems] = useState<Novel[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Novel>();
  const [del, setDel] = useState<Novel>();
  const load = () =>
    all<Novel>("novels").then((x) =>
      setItems(x.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
    );
  useEffect(() => {
    void load();
  }, []);
  const save = async (v: Partial<Novel>) => {
    const t = now();
    const n: Novel = {
      id: editing?.id || id(),
      title: v.title!.trim(),
      description: v.description?.trim() || "",
      cover: v.cover || editing?.cover,
      createdAt: editing?.createdAt || t,
      updatedAt: t,
    };
    await put("novels", n);
    setOpen(false);
    setEditing(undefined);
    load();
    notify(editing ? "Novel updated" : "Novel created");
    if (!editing) nav(`/novels/${n.id}`);
  };
  const erase = async () => {
    if (!del) return;
    for (const c of (await all<Chapter>("chapters")).filter(
      (x) => x.novelId === del.id,
    ))
      await remove("chapters", c.id);
    await remove("novels", del.id);
    setDel(undefined);
    load();
    notify("Novel deleted");
  };
  return (
    <div className="page">
      <PageHeader
        title="Novels"
        subtitle="Your stories, kept close."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus /> New
          </Button>
        }
      />
      {!items.length ? (
        <EmptyState
          icon="✦"
          title="No novels yet"
          body="Start writing your first story."
          action={<Button onClick={() => setOpen(true)}>New novel</Button>}
        />
      ) : (
        <div className="novel-grid">
          {items.map((n) => (
            <NovelCard
              key={n.id}
              novel={n}
              onOpen={() => nav(`/novels/${n.id}`)}
              onEdit={() => {
                setEditing(n);
                setOpen(true);
              }}
              onDelete={() => setDel(n)}
            />
          ))}
        </div>
      )}
      <NovelForm
        open={open}
        initial={editing}
        onClose={() => {
          setOpen(false);
          setEditing(undefined);
        }}
        onSave={save}
      />
      <Confirm
        open={!!del}
        title="Delete this novel?"
        body="The novel and every chapter inside it will be permanently removed."
        confirm="Delete novel"
        danger
        onClose={() => setDel(undefined)}
        onConfirm={erase}
      />
    </div>
  );
}
function NovelCard({
  novel,
  onOpen,
  onEdit,
  onDelete,
}: {
  novel: Novel;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [ch, setCh] = useState<Chapter[]>([]);
  useEffect(() => {
    all<Chapter>("chapters").then((x) =>
      setCh(x.filter((c) => c.novelId === novel.id)),
    );
  }, [novel.id]);
  return (
    <Card className="novel-card">
      <button className="cover" onClick={onOpen}>
        {novel.cover ? <img src={novel.cover} alt="" /> : <BookOpen />}
      </button>
      <div>
        <button className="title-button" onClick={onOpen}>
          <h2>{novel.title}</h2>
        </button>
        <p>{novel.description || "No description"}</p>
        <small>
          {ch.length} chapters ·{" "}
          {ch.reduce((s, c) => s + c.wordCount, 0).toLocaleString()} words
        </small>
        <div className="inline-actions">
          <Button kind="secondary" onClick={onOpen}>
            Open
          </Button>
          <IconButton label="Edit novel" onClick={onEdit}>
            <Pencil />
          </IconButton>
          <IconButton label="Delete novel" onClick={onDelete}>
            <Trash2 />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}
function NovelForm({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Novel;
  onClose: () => void;
  onSave: (n: Partial<Novel>) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string>();
  useEffect(() => {
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setCover(initial?.cover);
  }, [initial, open]);
  const image = (f?: File) => {
    if (!f) return;
    if (f.size > 5_000_000) return alert("Choose an image smaller than 5 MB.");
    const r = new FileReader();
    r.onload = () => setCover(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <Sheet
      open={open}
      title={initial ? "Edit novel" : "New novel"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) onSave({ title, description, cover });
        }}
      >
        <label className="cover-picker">
          {cover ? (
            <img src={cover} alt="Selected cover" />
          ) : (
            <>
              <ImagePlus />
              <span>Choose cover</span>
            </>
          )}
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={(e) => image(e.target.files?.[0])}
          />
        </label>
        <Field label="Title">
          <TextInput
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Story title"
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this story about?"
          />
        </Field>
        <Button type="submit" disabled={!title.trim()}>
          {initial ? "Save changes" : "Create novel"}
        </Button>
      </form>
    </Sheet>
  );
}
function NovelDetail({ novelId, nav, notify }: Props & { novelId: string }) {
  const [novel, setNovel] = useState<Novel>();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [del, setDel] = useState<Chapter>();
  const load = () =>
    Promise.all([get<Novel>("novels", novelId), all<Chapter>("chapters")]).then(
      ([n, c]) => {
        setNovel(n);
        setChapters(
          c
            .filter((x) => x.novelId === novelId)
            .sort((a, b) => a.order - b.order),
        );
      },
    );
  useEffect(() => {
    void load();
  }, [novelId]);
  const create = async (title: string) => {
    const t = now();
    const c: Chapter = {
      id: id(),
      novelId,
      title,
      content: "",
      wordCount: 0,
      order: chapters.length,
      createdAt: t,
      updatedAt: t,
    };
    await put("chapters", c);
    if (novel) await put("novels", { ...novel, updatedAt: t });
    setNewOpen(false);
    nav(`/novels/${novelId}/${c.id}`);
  };
  const erase = async () => {
    if (!del) return;
    await remove("chapters", del.id);
    setDel(undefined);
    load();
    notify("Chapter deleted");
  };
  const move = async (c: Chapter, d: number) => {
    const i = chapters.indexOf(c),
      other = chapters[i + d];
    if (!other) return;
    await Promise.all([
      put("chapters", { ...c, order: other.order }),
      put("chapters", { ...other, order: c.order }),
    ]);
    load();
  };
  if (!novel)
    return (
      <div className="page">
        <PageHeader title="Novel not found" back={() => nav("/novels")} />
      </div>
    );
  return (
    <div className="page">
      <PageHeader
        title={novel.title}
        subtitle={`Updated ${formatDate(novel.updatedAt)}`}
        back={() => nav("/novels")}
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus /> Chapter
          </Button>
        }
      />
      <Card className="novel-hero">
        {novel.cover && <img src={novel.cover} alt="" />}
        <div>
          <p>{novel.description || "No description yet."}</p>
          <strong>
            {chapters.reduce((s, c) => s + c.wordCount, 0).toLocaleString()}
          </strong>
          <small> total words · {chapters.length} chapters</small>
        </div>
      </Card>
      {!chapters.length ? (
        <EmptyState
          icon="¶"
          title="No chapters yet"
          body="Begin with a blank page and let the story grow."
          action={<Button onClick={() => setNewOpen(true)}>New chapter</Button>}
        />
      ) : (
        <div className="chapter-list">
          {chapters.map((c, i) => (
            <Card key={c.id} className="chapter-row">
              <GripVertical className="grip" />
              <button
                className="chapter-main"
                onClick={() => nav(`/novels/${novelId}/${c.id}`)}
              >
                <small>Chapter {i + 1}</small>
                <b>{c.title}</b>
                <span>
                  {c.wordCount.toLocaleString()} words ·{" "}
                  {formatDate(c.updatedAt, { month: "short", day: "numeric" })}
                </span>
              </button>
              <div>
                <IconButton
                  label="Move chapter up"
                  disabled={i === 0}
                  onClick={() => move(c, -1)}
                >
                  ↑
                </IconButton>
                <IconButton
                  label="Move chapter down"
                  disabled={i === chapters.length - 1}
                  onClick={() => move(c, 1)}
                >
                  ↓
                </IconButton>
                <IconButton label="Delete chapter" onClick={() => setDel(c)}>
                  <Trash2 />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ChapterForm
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSave={create}
      />
      <Confirm
        open={!!del}
        title="Delete this chapter?"
        body="This chapter and its writing will be permanently removed."
        confirm="Delete chapter"
        danger
        onClose={() => setDel(undefined)}
        onConfirm={erase}
      />
    </div>
  );
}
function ChapterForm({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: string) => void;
}) {
  const [t, setT] = useState("");
  useEffect(() => setT(""), [open]);
  return (
    <Sheet open={open} title="New chapter" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (t.trim()) onSave(t.trim());
        }}
      >
        <Field label="Chapter title">
          <TextInput
            autoFocus
            required
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="Untitled chapter"
          />
        </Field>
        <Button type="submit" disabled={!t.trim()}>
          Create chapter
        </Button>
      </form>
    </Sheet>
  );
}
function Editor({
  novelId,
  chapterId,
  nav,
  notify,
}: Props & { novelId: string; chapterId: string }) {
  const [chapter, setChapter] = useState<Chapter>();
  const [title, setTitle] = useState("");
  const [words, setWords] = useState(0);
  const [state, setState] = useState<"saved" | "unsaved" | "saving" | "error">(
    "saved",
  );
  const [boldActive, setBoldActive] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const chapterRef = useRef<Chapter | undefined>(undefined);
  const draftRef = useRef<ChapterDraft | null>(null);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const titleRef = useRef("");
  const persist = async (): Promise<boolean> => {
    const base = chapterRef.current;
    const draft = draftRef.current;
    if (!base || !draft) return false;
    const revision = revisionRef.current;
    if (revision <= savedRevisionRef.current) return true;
    setState("saving");
    const updated: Chapter = {
      ...base,
      title: draft.title.trim() || "Untitled chapter",
      content: draft.content,
      wordCount: countWords(draft.content),
      updatedAt: now(),
    };
    const write = writeQueue.current.then(async () => {
      await put("chapters", updated);
      try {
        const novel = await get<Novel>("novels", novelId);
        if (novel)
          await put("novels", { ...novel, updatedAt: updated.updatedAt });
      } catch {
        // The chapter write has already committed; its place in the gallery can refresh later.
      }
    });
    writeQueue.current = write.catch(() => {});
    try {
      await write;
      chapterRef.current = updated;
      savedRevisionRef.current = Math.max(savedRevisionRef.current, revision);
      if (revision === revisionRef.current) {
        setState("saved");
        try {
          const stored = localStorage.getItem(chapterDraftKey(chapterId));
          if (stored && JSON.parse(stored).modifiedAt <= draft.modifiedAt)
            localStorage.removeItem(chapterDraftKey(chapterId));
        } catch {
          // The committed chapter remains in IndexedDB.
        }
      }
      return true;
    } catch {
      if (revision === revisionRef.current) setState("error");
      return false;
    }
  };
  const changed = () => {
    const content = editor.current?.innerHTML ?? draftRef.current?.content;
    if (content === undefined) return;
    const draft: ChapterDraft = {
      title: titleRef.current,
      content,
      modifiedAt: Date.now(),
    };
    draftRef.current = draft;
    revisionRef.current += 1;
    setWords(countWords(content));
    setState("unsaved");
    try {
      localStorage.setItem(chapterDraftKey(chapterId), JSON.stringify(draft));
    } catch {
      // Autosave still writes to IndexedDB if local draft storage is unavailable.
    }
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(), 600);
  };
  useEffect(() => {
    let active = true;
    setChapter(undefined);
    selectionRef.current = null;
    setBoldActive(false);
    get<Chapter>("chapters", chapterId).then((c) => {
      if (c && active) {
        const draft = recoverChapterDraft(c);
        const opening = draft
          ? {
              ...c,
              title: draft.title,
              content: draft.content,
              wordCount: countWords(draft.content),
            }
          : c;
        setChapter(opening);
        chapterRef.current = c;
        draftRef.current = draft || {
          title: c.title,
          content: c.content,
          modifiedAt: Date.parse(c.updatedAt),
        };
        revisionRef.current = draft ? 1 : 0;
        savedRevisionRef.current = 0;
        setTitle(opening.title);
        titleRef.current = opening.title;
        setWords(opening.wordCount);
        setState(draft ? "unsaved" : "saved");
        if (draft) timer.current = window.setTimeout(() => void persist(), 600);
      }
    });
    return () => {
      active = false;
    };
  }, [chapterId]);
  useLayoutEffect(() => {
    if (chapter?.id === chapterId && editor.current) {
      editor.current.innerHTML = chapter.content;
    }
  }, [chapterId, chapter?.id]);
  const rememberSelection = () => {
    const selection = getSelection();
    if (
      !editor.current ||
      !selection?.rangeCount ||
      !editor.current.contains(selection.anchorNode)
    )
      return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
    setBoldActive(document.queryCommandState("bold"));
  };
  useEffect(() => {
    document.addEventListener("selectionchange", rememberSelection);
    return () =>
      document.removeEventListener("selectionchange", rememberSelection);
  }, []);
  useEffect(() => {
    const flush = () => {
      clearTimeout(timer.current);
      void persist();
    };
    addEventListener("pagehide", flush);
    return () => {
      removeEventListener("pagehide", flush);
      flush();
    };
  }, [chapterId, novelId]);
  const focusEditor = () => {
    if (!editor.current) return;
    editor.current.focus();
    const range = selectionRef.current;
    const selection = getSelection();
    if (
      range &&
      selection &&
      editor.current.contains(range.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };
  const cmd = (name: string) => {
    focusEditor();
    document.execCommand(name, false);
    rememberSelection();
    changed();
  };
  const quotes = () => {
    focusEditor();
    document.execCommand("insertText", false, '"');
    rememberSelection();
    changed();
  };
  const saveNow = async () => {
    if (
      editor.current &&
      (editor.current.innerHTML !== draftRef.current?.content ||
        titleRef.current !== draftRef.current?.title)
    )
      changed();
    clearTimeout(timer.current);
    let saved = await persist();
    while (saved && revisionRef.current > savedRevisionRef.current)
      saved = await persist();
    if (saved) notify("Chapter saved");
    else notify("Chapter could not be saved. Please try again.");
    return saved;
  };
  if (!chapter) return <div className="loading">Opening chapter…</div>;
  return (
    <div className="editor-page">
      <header className="editor-head">
        <IconButton
          label="Back to novel"
          onClick={async () => {
            if (await saveNow()) nav(`/novels/${novelId}`);
          }}
        >
          ‹
        </IconButton>
        <div className="editor-title-group">
          <input
            aria-label="Chapter title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              titleRef.current = e.target.value;
              changed();
            }}
          />
          <span role="status">
            {state === "saved"
              ? "Saved"
              : state === "saving"
                ? "Saving…"
                : state === "unsaved"
                  ? "Unsaved changes"
                  : "Save failed — retry"}
          </span>
        </div>
        <Button onClick={saveNow}>
          <Save size={17} /> Save
        </Button>
      </header>
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Writing tools"
        onPointerDownCapture={(event) => {
          if ((event.target as HTMLElement).closest("button"))
            event.preventDefault();
        }}
      >
        <IconButton label="Undo" onClick={() => cmd("undo")}>
          <Undo2 />
        </IconButton>
        <IconButton label="Redo" onClick={() => cmd("redo")}>
          <Redo2 />
        </IconButton>
        <IconButton
          label="Bold"
          aria-pressed={boldActive}
          onClick={() => cmd("bold")}
        >
          <Bold />
        </IconButton>
        <IconButton label="Insert double quote" onClick={quotes}>
          <Quote />
        </IconButton>
        <small>{words.toLocaleString()} words</small>
      </div>
      <div
        ref={editor}
        className="editor"
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          changed();
          rememberSelection();
        }}
        onKeyUp={rememberSelection}
        role="textbox"
        aria-multiline="true"
        data-placeholder="Begin writing…"
      />
    </div>
  );
}
