import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { all, get, put, remove } from "../db";
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
    return <Editor {...p} novelId={p.novelId} chapterId={p.chapterId} />;
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
  const [state, setState] = useState<"saved" | "saving" | "error">("saved");
  const editor = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const chapterRef = useRef<Chapter | undefined>(undefined);
  const titleRef = useRef("");
  useEffect(() => {
    get<Chapter>("chapters", chapterId).then((c) => {
      if (c) {
        setChapter(c);
        chapterRef.current = c;
        setTitle(c.title);
        titleRef.current = c.title;
        setWords(c.wordCount);
        if (editor.current) editor.current.innerHTML = c.content;
      }
    });
  }, [chapterId]);
  const persist = async () => {
    if (!chapterRef.current || !editor.current) return;
    setState("saving");
    const content = editor.current.innerHTML;
    const wc = countWords(content);
    const updated = {
      ...chapterRef.current,
      title: titleRef.current.trim() || "Untitled chapter",
      content,
      wordCount: wc,
      updatedAt: now(),
    };
    try {
      await put("chapters", updated);
      const n = await get<Novel>("novels", novelId);
      if (n) await put("novels", { ...n, updatedAt: updated.updatedAt });
      setChapter(updated);
      chapterRef.current = updated;
      setWords(wc);
      setState("saved");
    } catch {
      setState("error");
    }
  };
  const changed = () => {
    if (!editor.current) return;
    setWords(countWords(editor.current.innerHTML));
    setState("saving");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(persist, 600);
  };
  useEffect(() => {
    const flush = () => void persist();
    addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer.current);
      void persist();
      removeEventListener("pagehide", flush);
    };
  }, []);
  const cmd = (name: string, val?: string) => {
    editor.current?.focus();
    document.execCommand(name, false, val);
    changed();
  };
  const quotes = () => {
    editor.current?.focus();
    const sel = getSelection();
    if (sel && !sel.isCollapsed) {
      const text = sel.toString();
      document.execCommand("insertText", false, `“${text}”`);
    } else document.execCommand("insertText", false, "“”");
    changed();
  };
  if (!chapter) return <div className="loading">Opening chapter…</div>;
  return (
    <div className="editor-page">
      <header className="editor-head">
        <IconButton
          label="Back to novel"
          onClick={async () => {
            await persist();
            nav(`/novels/${novelId}`);
          }}
        >
          ‹
        </IconButton>
        <input
          aria-label="Chapter title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            titleRef.current = e.target.value;
            setState("saving");
            clearTimeout(timer.current);
            timer.current = window.setTimeout(persist, 600);
          }}
        />
        <span>
          {state === "saved"
            ? "Saved"
            : state === "saving"
              ? "Saving…"
              : "Save failed"}
        </span>
      </header>
      <div className="editor-toolbar" role="toolbar" aria-label="Writing tools">
        <IconButton label="Undo" onClick={() => cmd("undo")}>
          <Undo2 />
        </IconButton>
        <IconButton label="Redo" onClick={() => cmd("redo")}>
          <Redo2 />
        </IconButton>
        <IconButton label="Bold" onClick={() => cmd("bold")}>
          <Bold />
        </IconButton>
        <IconButton label="Insert smart double quotes" onClick={quotes}>
          <Quote />
        </IconButton>
        <small>{words.toLocaleString()} words</small>
      </div>
      <div
        ref={editor}
        className="editor"
        contentEditable
        suppressContentEditableWarning
        onInput={changed}
        role="textbox"
        aria-multiline="true"
        data-placeholder="Begin writing…"
      />
    </div>
  );
}
