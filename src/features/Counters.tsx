import { useEffect, useState } from "react";
import { Plus, Pencil, Pin, Trash2 } from "lucide-react";
import { all, put, remove } from "../db";
import type { Counter } from "../types";
import { dayDiff, formatDate, id, localDate } from "../utils";
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
const colors = ["coral", "mint", "blue", "gold", "lavender"];
export default function Counters({ notify }: { notify: (s: string) => void }) {
  const [items, setItems] = useState<Counter[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Counter>();
  const [del, setDel] = useState<Counter>();
  const load = () => all<Counter>("counters").then(setItems);
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  const save = async (c: Omit<Counter, "id" | "createdAt">) => {
    await put(
      "counters",
      editing
        ? { ...editing, ...c }
        : { ...c, id: id(), createdAt: new Date().toISOString() },
    );
    setOpen(false);
    setEditing(undefined);
    load();
    notify(editing ? "Counter updated" : "Counter added");
  };
  const erase = async () => {
    if (del) {
      await remove("counters", del.id);
      setDel(undefined);
      load();
      notify("Counter deleted");
    }
  };
  const togglePin = async (counter: Counter) => {
    await put("counters", { ...counter, pinned: !counter.pinned });
    load();
    notify(counter.pinned ? "Counter unpinned" : "Counter pinned to Home");
  };
  return (
    <div className="page">
      <PageHeader
        title="Counters"
        subtitle="Milestones behind and moments ahead."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add
          </Button>
        }
      />
      {!items.length ? (
        <EmptyState
          icon="◷"
          title="Nothing you’re counting yet"
          body="Track a milestone or look forward to a date."
          action={<Button onClick={() => setOpen(true)}>New counter</Button>}
        />
      ) : (
        <>
          {(["up", "down"] as const).map((type) => {
            const list = items.filter((x) => x.type === type);
            return list.length ? (
              <section key={type}>
                <h2 className="section-title">
                  {type === "up" ? "Since" : "Coming up"}
                </h2>
                <div className="counter-grid">
                  {list.map((c) => (
                    <CounterCard
                      key={c.id}
                      counter={c}
                      onEdit={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                      onDelete={() => setDel(c)}
                      onPin={() => togglePin(c)}
                    />
                  ))}
                </div>
              </section>
            ) : null;
          })}
        </>
      )}
      <CounterForm
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
        title="Delete this counter?"
        body="The counter will be permanently removed."
        confirm="Delete counter"
        danger
        onClose={() => setDel(undefined)}
        onConfirm={erase}
      />
    </div>
  );
}
function CounterCard({
  counter,
  onEdit,
  onDelete,
  onPin,
}: {
  counter: Counter;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const diff = dayDiff(localDate(), counter.date);
  let big = "",
    sub = "";
  if (counter.type === "up") {
    const days = Math.max(0, -diff);
    big = `${days} ${days === 1 ? "day" : "days"}`;
    sub =
      days >= 7
        ? `${Math.floor(days / 7)} weeks, ${days % 7} days`
        : `Since ${formatDate(counter.date)}`;
  } else {
    big =
      diff === 0
        ? "Today"
        : diff > 0
          ? `${diff} ${diff === 1 ? "day" : "days"}`
          : `Completed`;
    sub =
      diff < 0
        ? `${Math.abs(diff)} days ago`
        : `${formatDate(counter.date)}${counter.time ? ` at ${counter.time}` : ""}`;
  }
  return (
    <Card className={`counter-card accent-${counter.color}`}>
      <div className="counter-top">
        <span>{counter.icon}</span>
        <div>
          <IconButton
            label={counter.pinned ? "Unpin from Home" : "Pin to Home"}
            onClick={onPin}
          >
            <Pin fill={counter.pinned ? "currentColor" : "none"} />
          </IconButton>
          <IconButton label="Edit counter" onClick={onEdit}>
            <Pencil />
          </IconButton>
          <IconButton label="Delete counter" onClick={onDelete}>
            <Trash2 />
          </IconButton>
        </div>
      </div>
      <h2>{counter.title}</h2>
      <strong>{big}</strong>
      <p>{sub}</p>
      {counter.description && <small>{counter.description}</small>}
    </Card>
  );
}
function CounterForm({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Counter;
  onClose: () => void;
  onSave: (c: Omit<Counter, "id" | "createdAt">) => void;
}) {
  const [type, setType] = useState<"up" | "down">("up");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDate());
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("✨");
  const [color, setColor] = useState("coral");
  useEffect(() => {
    setType(initial?.type || "up");
    setTitle(initial?.title || "");
    setDate(initial?.date || localDate());
    setTime(initial?.time || "");
    setDescription(initial?.description || "");
    setIcon(initial?.icon || "✨");
    setColor(initial?.color || "coral");
  }, [initial, open]);
  return (
    <Sheet
      open={open}
      title={initial ? "Edit counter" : "New counter"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim() && date)
            onSave({
              type,
              title: title.trim(),
              date,
              time: type === "down" ? time : undefined,
              description,
              icon: icon || "✨",
              color,
            });
        }}
      >
        <div className="segmented">
          <button
            type="button"
            className={type === "up" ? "active" : ""}
            onClick={() => setType("up")}
          >
            Count up
          </button>
          <button
            type="button"
            className={type === "down" ? "active" : ""}
            onClick={() => setType("down")}
          >
            Countdown
          </button>
        </div>
        <Field label="Title">
          <TextInput
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === "up" ? "Smoking-free" : "Dentist appointment"}
          />
        </Field>
        <div className="field-pair">
          <Field label={type === "up" ? "Starting date" : "Target date"}>
            <TextInput
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          {type === "down" && (
            <Field label="Time (optional)">
              <TextInput
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Field>
          )}
        </div>
        <Field label="Description (optional)">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Icon">
          <TextInput
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 4))}
          />
        </Field>
        <Field label="Accent">
          <div className="palette">
            {colors.map((c) => (
              <button
                type="button"
                aria-label={`${c} accent`}
                className={`${c} ${color === c ? "selected" : ""}`}
                onClick={() => setColor(c)}
                key={c}
              />
            ))}
          </div>
        </Field>
        <Button type="submit" disabled={!title.trim() || !date}>
          Save counter
        </Button>
      </form>
    </Sheet>
  );
}
