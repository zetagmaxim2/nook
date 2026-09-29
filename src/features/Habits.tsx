import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { all, put, remove } from "../db";
import type { Habit, HabitCompletion } from "../types";
import { addDays, formatDate, id, localDate } from "../utils";
import {
  Button,
  Card,
  Confirm,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  Sheet,
  TextInput,
  Toggle,
} from "../ui";
export default function Habits({ notify }: { notify: (s: string) => void }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [comps, setComps] = useState<HabitCompletion[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit>();
  const [del, setDel] = useState<Habit>();
  const load = () =>
    Promise.all([
      all<Habit>("habits"),
      all<HabitCompletion>("habitCompletions"),
    ]).then(([h, c]) => {
      setHabits(h);
      setComps(c);
    });
  useEffect(() => {
    load();
  }, []);
  const toggleToday = async (h: Habit) => {
    const date = localDate();
    const old = comps.find((c) => c.habitId === h.id && c.date === date);
    await put("habitCompletions", {
      id: old?.id || id(),
      habitId: h.id,
      date,
      completed: !old?.completed,
    });
    load();
  };
  const save = async (name: string, icon: string) => {
    await put(
      "habits",
      editing
        ? { ...editing, name, icon }
        : {
            id: id(),
            name,
            icon,
            createdAt: new Date().toISOString(),
            active: true,
          },
    );
    setOpen(false);
    setEditing(undefined);
    load();
    notify(editing ? "Habit updated" : "Habit added");
  };
  const erase = async () => {
    if (!del) return;
    for (const c of comps.filter((x) => x.habitId === del.id))
      await remove("habitCompletions", c.id);
    await remove("habits", del.id);
    setDel(undefined);
    load();
    notify("Habit deleted");
  };
  return (
    <div className="page">
      <PageHeader
        title="Habits"
        subtitle="Small things, kept consistent."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Add
          </Button>
        }
      />
      {!habits.length ? (
        <EmptyState
          icon="✓"
          title="No habits yet"
          body="Add one small action you want to repeat."
        />
      ) : (
        <div className="habit-list">
          {habits.map((h) => {
            const done = comps.some(
              (c) =>
                c.habitId === h.id && c.date === localDate() && c.completed,
            );
            const streak = getStreak(h.id, comps);
            return (
              <Card
                key={h.id}
                className={`habit-card ${!h.active ? "disabled" : ""}`}
              >
                <button
                  className={`habit-check ${done ? "done" : ""}`}
                  disabled={!h.active}
                  onClick={() => toggleToday(h)}
                >
                  {done ? <Check /> : h.icon}
                </button>
                <div>
                  <h2>{h.name}</h2>
                  <p>
                    {streak} day streak · {h.active ? "Active" : "Disabled"}
                  </p>
                  <History habit={h} comps={comps} />
                </div>
                <div className="habit-actions">
                  <IconButton
                    label="Edit habit"
                    onClick={() => {
                      setEditing(h);
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton label="Delete habit" onClick={() => setDel(h)}>
                    <Trash2 />
                  </IconButton>
                  <Toggle
                    label=""
                    checked={h.active}
                    onChange={async (active) => {
                      await put("habits", { ...h, active });
                      load();
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <HabitForm
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
        title="Delete this habit?"
        body="Its completion history will also be permanently removed."
        confirm="Delete habit"
        danger
        onClose={() => setDel(undefined)}
        onConfirm={erase}
      />
    </div>
  );
}
function getStreak(id: string, c: HabitCompletion[]) {
  let n = 0,
    d = localDate();
  while (c.some((x) => x.habitId === id && x.date === d && x.completed)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
function History({ habit, comps }: { habit: Habit; comps: HabitCompletion[] }) {
  return (
    <div className="habit-history">
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(localDate(), -i);
        const done = comps.some(
          (c) => c.habitId === habit.id && c.date === date && c.completed,
        );
        return (
          <span
            key={date}
            className={done ? "done" : ""}
            title={`${formatDate(date)}: ${done ? "complete" : "not complete"}`}
          >
            <i>{done ? "✓" : "·"}</i>
            <small>
              {i === 0
                ? "T"
                : new Intl.DateTimeFormat(undefined, {
                    weekday: "narrow",
                  }).format(
                    new Date(
                      Number(date.slice(0, 4)),
                      Number(date.slice(5, 7)) - 1,
                      Number(date.slice(8, 10)),
                    ),
                  )}
            </small>
          </span>
        );
      })}
    </div>
  );
}
function HabitForm({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Habit;
  onClose: () => void;
  onSave: (n: string, i: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✓");
  useEffect(() => {
    setName(initial?.name || "");
    setIcon(initial?.icon || "✓");
  }, [initial, open]);
  return (
    <Sheet
      open={open}
      title={initial ? "Edit habit" : "New habit"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim(), icon || "✓");
        }}
      >
        <Field label="Name">
          <TextInput
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Take creatine"
          />
        </Field>
        <Field label="Icon">
          <TextInput
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 4))}
            placeholder="✓"
          />
        </Field>
        <Button type="submit" disabled={!name.trim()}>
          Save habit
        </Button>
      </form>
    </Sheet>
  );
}
