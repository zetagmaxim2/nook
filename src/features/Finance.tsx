import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, WalletCards } from "lucide-react";
import { all, put } from "../db";
import type { FinanceEntry, FinancePlan } from "../types";
import {
  financeCalculation,
  formatDate,
  id,
  localDate,
  money,
  monthKey,
  parseLocalDate,
} from "../utils";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  IconButton,
  PageHeader,
  TextInput,
  Toggle,
} from "../ui";
export default function Finance({ notify }: { notify: (s: string) => void }) {
  const [amount, setAmount] = useState("");
  const [include, setInclude] = useState(true);
  const [plans, setPlans] = useState<FinancePlan[]>([]);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [viewMonth, setViewMonth] = useState(monthKey());
  const [error, setError] = useState("");
  const load = () =>
    Promise.all([
      all<FinancePlan>("financePlans"),
      all<FinanceEntry>("financeEntries"),
    ]).then(([p, e]) => {
      setPlans(p);
      setEntries(e);
      const current = p.find((x) => x.month === monthKey());
      if (current) {
        setAmount(String(current.amount));
        setInclude(current.includeToday);
      }
    });
  useEffect(() => {
    load();
  }, []);
  const calc = financeCalculation(Number(amount) || 0, include);
  const save = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const existing = plans.find((p) => p.month === monthKey());
    const plan: FinancePlan = {
      id: existing?.id || id(),
      month: monthKey(),
      amount: n,
      includeToday: include,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    await put("financePlans", plan);
    for (let i = 0; i < calc.days; i++) {
      const d = new Date();
      d.setDate(d.getDate() + (include ? i : i + 1));
      const date = localDate(d);
      const old = entries.find(
        (e) => e.date === date && e.periodStart === calc.start,
      );
      await put("financeEntries", {
        id: old?.id || id(),
        date,
        amount: n,
        dailyTarget: calc.target,
        periodStart: calc.start,
        periodEnd: calc.end,
        completed: old?.completed || false,
      });
    }
    notify("Budget saved");
    load();
  };
  const toggle = async (e: FinanceEntry) => {
    await put("financeEntries", { ...e, completed: !e.completed });
    load();
  };
  const monthEntries = entries
    .filter((e) => e.date.startsWith(viewMonth))
    .sort((a, b) => a.date.localeCompare(b.date));
  const shift = (n: number) => {
    const [y, m] = viewMonth.split("-").map(Number);
    setViewMonth(monthKey(new Date(y, m - 1 + n, 1)));
  };
  return (
    <div className="page">
      <PageHeader title="Finance" subtitle="A calm daily spending target." />
      <ErrorNote>{error}</ErrorNote>
      <Card className="budget-card">
        <span className="eyebrow">
          <WalletCards /> Budget through the 28th
        </span>
        {calc.ended ? (
          <>
            <h2>This period has ended</h2>
            <p>
              It’s after the 28th. Start a new plan when the next month begins;
              your history remains below.
            </p>
          </>
        ) : (
          <>
            <strong>
              {amount && Number(amount) > 0 ? money(calc.target) : "—"}
            </strong>
            <p>
              per day · {calc.days} {calc.days === 1 ? "day" : "days"} from{" "}
              {formatDate(calc.start, { month: "short", day: "numeric" })} to
              the 28th
            </p>
          </>
        )}
        <Field label="Amount available">
          <div className="money-input">
            <TextInput
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="3,000"
            />
            <span>DH</span>
          </div>
        </Field>
        <Toggle label="Include today" checked={include} onChange={setInclude} />
        <Button disabled={calc.ended || !Number(amount)} onClick={save}>
          Save monthly budget
        </Button>
      </Card>
      <div className="month-nav">
        <IconButton label="Previous month" onClick={() => shift(-1)}>
          <ChevronLeft />
        </IconButton>
        <h2>
          {new Intl.DateTimeFormat(undefined, {
            month: "long",
            year: "numeric",
          }).format(parseLocalDate(`${viewMonth}-01`))}
        </h2>
        <IconButton label="Next month" onClick={() => shift(1)}>
          <ChevronRight />
        </IconButton>
      </div>
      {!monthEntries.length ? (
        <EmptyState
          icon="⌁"
          title="No financial history yet"
          body="Save a monthly budget to create your daily plan."
        />
      ) : (
        <div className="history-list">
          {monthEntries.map((e) => (
            <Card key={e.id} className="history-row">
              <button
                className={`check ${e.completed ? "done" : ""}`}
                onClick={() => toggle(e)}
                aria-label={e.completed ? "Mark incomplete" : "Mark complete"}
              >
                {e.completed ? <Check /> : ""}
              </button>
              <span>
                <b>
                  {formatDate(e.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </b>
                <small>{money(e.dailyTarget)} target</small>
              </span>
              <em>{e.completed ? "Done" : "Open"}</em>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
