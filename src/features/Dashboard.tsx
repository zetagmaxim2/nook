import { useEffect, useState } from "react";
import {
  BookOpen,
  WalletCards,
  ListChecks,
  Timer,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { all, put } from "../db";
import type {
  DashboardWidget,
  Novel,
  Chapter,
  FinancePlan,
  Habit,
  HabitCompletion,
  Counter,
} from "../types";
import {
  localDate,
  monthKey,
  financeCalculation,
  money,
  dayDiff,
} from "../utils";
import { Card, PageHeader, Button, Sheet, IconButton } from "../ui";
const labels = {
  finance: "Daily budget",
  habits: "Habits",
  counters: "Counters",
  novels: "Novels",
};
export function Dashboard({
  nav,
  version,
  refresh,
}: {
  nav: (p: string) => void;
  version: number;
  refresh: () => void;
}) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [data, setData] = useState<any>({});
  const [edit, setEdit] = useState(
    () => new URLSearchParams(location.search).get("configure") === "1",
  );
  useEffect(() => {
    Promise.all([
      all<DashboardWidget>("widgets"),
      all<Novel>("novels"),
      all<Chapter>("chapters"),
      all<FinancePlan>("financePlans"),
      all<Habit>("habits"),
      all<HabitCompletion>("habitCompletions"),
      all<Counter>("counters"),
    ]).then(([w, n, ch, f, h, hc, c]) => {
      setWidgets(w.sort((a, b) => a.order - b.order));
      setData({ n, ch, f, h, hc, c });
    });
  }, [version]);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const update = async (w: DashboardWidget) => {
    await put("widgets", w);
    setWidgets((x) =>
      x.map((a) => (a.id === w.id ? w : a)).sort((a, b) => a.order - b.order),
    );
    refresh();
  };
  const move = async (w: DashboardWidget, d: number) => {
    const vis = widgets;
    const idx = vis.findIndex((x) => x.id === w.id);
    const other = vis[idx + d];
    if (!other) return;
    await Promise.all([
      put("widgets", { ...w, order: other.order }),
      put("widgets", { ...other, order: w.order }),
    ]);
    refresh();
  };
  return (
    <div className="page dashboard">
      <PageHeader
        title={greeting}
        subtitle={new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())}
        action={
          <IconButton label="Configure dashboard" onClick={() => setEdit(true)}>
            <SlidersHorizontal />
          </IconButton>
        }
      />
      <div className="widget-grid">
        {widgets
          .filter((w) => w.visible)
          .map((w) => (
            <Widget key={w.id} type={w.type} data={data} nav={nav} />
          ))}
      </div>
      <Sheet
        open={edit}
        title="Configure dashboard"
        onClose={() => setEdit(false)}
      >
        <p className="muted">
          Choose what appears and arrange it in your preferred order.
        </p>
        <div className="configure-list">
          {widgets.map((w) => (
            <div key={w.id}>
              <span>{labels[w.type]}</span>
              <IconButton label="Move up" onClick={() => move(w, -1)}>
                <ChevronUp />
              </IconButton>
              <IconButton label="Move down" onClick={() => move(w, 1)}>
                <ChevronDown />
              </IconButton>
              <IconButton
                label={w.visible ? "Hide" : "Show"}
                onClick={() => update({ ...w, visible: !w.visible })}
              >
                {w.visible ? <Eye /> : <EyeOff />}
              </IconButton>
            </div>
          ))}
        </div>
        <Button onClick={() => setEdit(false)}>Done</Button>
      </Sheet>
    </div>
  );
}
function Widget({
  type,
  data,
  nav,
}: {
  type: DashboardWidget["type"];
  data: any;
  nav: (p: string) => void;
}) {
  const today = localDate();
  if (type === "novels") {
    const words = (data.ch || []).reduce(
      (s: number, c: Chapter) => s + c.wordCount,
      0,
    );
    return (
      <Card className="widget" onClick={() => nav("/novels")}>
        <span className="eyebrow">
          <BookOpen /> Novels
        </span>
        <strong>{data.n?.length || 0} novels</strong>
        <p>
          {data.ch?.length || 0} chapters · {words.toLocaleString()} words
        </p>
      </Card>
    );
  }
  if (type === "finance") {
    const plan = (data.f || [])
      .filter((p: FinancePlan) => p.month === monthKey())
      .at(-1);
    const calc = financeCalculation(
      plan?.amount || 0,
      plan?.includeToday ?? true,
    );
    return (
      <Card className="widget featured" onClick={() => nav("/finance")}>
        <span className="eyebrow">
          <WalletCards /> Daily budget
        </span>
        <strong>{plan ? money(calc.target) : "Not set"}</strong>
        <p>
          {calc.ended
            ? "This month’s period has ended"
            : `${calc.days} days remaining`}
        </p>
      </Card>
    );
  }
  if (type === "habits") {
    const habits = (data.h || []).filter((h: Habit) => h.active);
    const done = habits.filter((h: Habit) =>
      (data.hc || []).some(
        (c: HabitCompletion) =>
          c.habitId === h.id && c.date === today && c.completed,
      ),
    ).length;
    return (
      <Card className="widget" onClick={() => nav("/habits")}>
        <span className="eyebrow">
          <ListChecks /> Habits
        </span>
        <strong>
          {done} of {habits.length}
        </strong>
        <p>
          {habits.length && done === habits.length
            ? "All done today"
            : "Completed today"}
        </p>
      </Card>
    );
  }
  const upcoming = (data.c || [])
    .filter((c: Counter) => c.type === "down")
    .sort((a: Counter, b: Counter) => a.date.localeCompare(b.date))[0];
  const ups = (data.c || []).filter((c: Counter) => c.type === "up");
  return (
    <Card className="widget" onClick={() => nav("/counters")}>
      <span className="eyebrow">
        <Timer /> Counters
      </span>
      <strong>
        {upcoming
          ? dayDiff(today, upcoming.date) === 0
            ? "Today"
            : `${Math.abs(dayDiff(today, upcoming.date))} days`
          : `${ups.length} milestones`}
      </strong>
      <p>{upcoming?.title || "Nothing upcoming yet"}</p>
    </Card>
  );
}
