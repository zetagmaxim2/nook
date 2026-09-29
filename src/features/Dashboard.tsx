import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Pin,
  Plus,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import { all, put } from "../db";
import { currentBudgetPlan, saveBudget } from "../finance";
import type { Counter, FinancePlan, Habit, HabitCompletion } from "../types";
import {
  dayDiff,
  financeCalculation,
  formatDate,
  id,
  localDate,
  money,
} from "../utils";
import { Button, Card, ErrorNote, IconButton, PageHeader, Sheet } from "../ui";

type Props = {
  nav: (path: string) => void;
  version: number;
  refresh: () => void;
  notify: (message: string) => void;
};

export function Dashboard({ nav, version, refresh, notify }: Props) {
  const [plans, setPlans] = useState<FinancePlan[]>([]);
  const [amount, setAmount] = useState("");
  const [includeToday, setIncludeToday] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [pinSheet, setPinSheet] = useState(
    () => new URLSearchParams(location.search).get("configure") === "1",
  );
  const [budgetError, setBudgetError] = useState("");
  const [saving, setSaving] = useState(false);
  const [habitBusy, setHabitBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      all<FinancePlan>("financePlans"),
      all<Habit>("habits"),
      all<HabitCompletion>("habitCompletions"),
      all<Counter>("counters"),
    ]).then(([nextPlans, nextHabits, nextCompletions, nextCounters]) => {
      setPlans(nextPlans);
      const plan = currentBudgetPlan(nextPlans);
      setAmount(plan ? String(plan.amount) : "");
      setIncludeToday(plan?.includeToday ?? true);
      setHabits(nextHabits);
      setCompletions(nextCompletions);
      setCounters(nextCounters);
    });
  }, [version]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const plan = currentBudgetPlan(plans);
  const value = Number(amount);
  const validAmount = Number.isFinite(value) && value > 0;
  const calculation = financeCalculation(validAmount ? value : 0, includeToday);
  const changed = amount !== (plan ? String(plan.amount) : "");
  const target =
    !changed && plan?.dailyTarget != null
      ? plan.dailyTarget
      : calculation.target;
  const periodEnd =
    !changed && plan?.periodEnd ? plan.periodEnd : calculation.end;
  const creatine =
    habits.find((habit) => habit.id === "habit-creatine") ||
    habits.find((habit) => /creatine/i.test(habit.name));
  const today = localDate();
  const completion = completions.find(
    (entry) => entry.habitId === creatine?.id && entry.date === today,
  );
  const creatineDone = !!completion?.completed;
  const pinned = counters.filter((counter) => counter.pinned);

  const submitBudget = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveBudget(value, includeToday);
      setBudgetError("");
      notify("Budget saved");
      refresh();
    } catch (error) {
      setBudgetError(
        error instanceof Error ? error.message : "Could not save budget.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCreatine = async () => {
    if (habitBusy) return;
    setHabitBusy(true);
    try {
      if (!creatine) {
        await put("habits", {
          id: "habit-creatine",
          name: "Take creatine",
          icon: "✓",
          createdAt: new Date().toISOString(),
          active: true,
        } satisfies Habit);
      } else if (!creatine.active) {
        await put("habits", { ...creatine, active: true });
      }
      await put("habitCompletions", {
        id: completion?.id || id(),
        habitId: creatine?.id || "habit-creatine",
        date: today,
        completed: !creatineDone,
      } satisfies HabitCompletion);
      refresh();
      notify(
        creatineDone ? "Creatine unchecked" : "Creatine checked for today",
      );
    } catch {
      notify("Could not update creatine");
    } finally {
      setHabitBusy(false);
    }
  };

  const togglePin = async (counter: Counter) => {
    const updated = { ...counter, pinned: !counter.pinned };
    await put("counters", updated);
    setCounters((items) =>
      items.map((item) => (item.id === counter.id ? updated : item)),
    );
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
          <IconButton
            label="Choose pinned counters"
            onClick={() => setPinSheet(true)}
          >
            <SlidersHorizontal />
          </IconButton>
        }
      />

      <Card className="home-budget">
        <div className="home-card-top">
          <span className="eyebrow">
            <WalletCards /> Daily budget
          </span>
          <button className="text-link" onClick={() => nav("/finance")}>
            History <ChevronRight />
          </button>
        </div>
        <strong className="home-budget-value">
          {validAmount ? money(target) : "Set a budget"}
        </strong>
        <p className="home-budget-caption">
          {changed && validAmount ? "Preview · " : ""}
          {changed || !plan
            ? `${calculation.days} days`
            : "Your saved target"}{" "}
          through {formatDate(periodEnd, { month: "short", day: "numeric" })}
        </p>
        <form className="home-budget-form" onSubmit={submitBudget}>
          <label>
            <span>Amount available</span>
            <div className="money-input">
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <span>DH</span>
            </div>
          </label>
          <Button type="submit" disabled={!validAmount || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
        <ErrorNote>{budgetError}</ErrorNote>
      </Card>

      <Card className={`home-creatine ${creatineDone ? "done" : ""}`}>
        <button
          className="home-creatine-check"
          onClick={toggleCreatine}
          disabled={habitBusy}
          aria-label={
            creatineDone
              ? "Mark creatine not taken today"
              : "Mark creatine taken today"
          }
          aria-pressed={creatineDone}
        >
          {creatineDone && <Check />}
        </button>
        <div>
          <span className="eyebrow">Today’s habit</span>
          <strong>Take creatine</strong>
          <p>
            {creatineDone
              ? "Done for today"
              : "Tap the check when you’ve taken it"}
          </p>
        </div>
        <IconButton label="View habit history" onClick={() => nav("/habits")}>
          <ChevronRight />
        </IconButton>
      </Card>

      <section className="home-pinned" aria-labelledby="pinned-title">
        <div className="home-section-heading">
          <div>
            <span className="eyebrow">Keep in sight</span>
            <h2 id="pinned-title">Pinned counters</h2>
          </div>
          <button className="text-link" onClick={() => setPinSheet(true)}>
            Edit <ChevronRight />
          </button>
        </div>
        {pinned.length ? (
          <div className="home-counter-grid">
            {pinned.map((counter) => {
              const days = dayDiff(today, counter.date);
              const value =
                counter.type === "up"
                  ? `${Math.max(0, -days)} days`
                  : days === 0
                    ? "Today"
                    : days > 0
                      ? `${days} days left`
                      : `${-days} days ago`;
              return (
                <button
                  className="home-counter"
                  key={counter.id}
                  onClick={() => nav("/counters")}
                >
                  <span className="home-counter-icon">{counter.icon}</span>
                  <span className="home-counter-title">{counter.title}</span>
                  <strong>{value}</strong>
                  <small>
                    {formatDate(counter.date, {
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                </button>
              );
            })}
          </div>
        ) : (
          <button className="home-pin-empty" onClick={() => setPinSheet(true)}>
            <Pin size={19} /> Pin the counters you want to see here{" "}
            <ChevronRight size={18} />
          </button>
        )}
      </section>

      <Sheet
        open={pinSheet}
        title="Pin counters to Home"
        onClose={() => setPinSheet(false)}
      >
        <p className="muted">
          Choose the counters you want to see when you open Nook.
        </p>
        {counters.length ? (
          <div className="home-pin-list">
            {counters.map((counter) => (
              <button
                key={counter.id}
                className={counter.pinned ? "selected" : ""}
                onClick={() => togglePin(counter)}
                aria-pressed={!!counter.pinned}
              >
                <span>{counter.icon}</span>
                <b>{counter.title}</b>
                <Pin
                  size={19}
                  fill={counter.pinned ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">No counters yet. Add one, then pin it here.</p>
        )}
        <Button
          kind="secondary"
          onClick={() => {
            setPinSheet(false);
            nav("/counters");
          }}
        >
          <Plus size={18} />{" "}
          {counters.length ? "Manage counters" : "Add a counter"}
        </Button>
        <Button onClick={() => setPinSheet(false)}>Done</Button>
      </Sheet>
    </div>
  );
}
