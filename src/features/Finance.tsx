import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, WalletCards } from "lucide-react";
import { all, put } from "../db";
import type { FinanceEntry, FinancePlan } from "../types";
import { currentBudgetPlan, saveBudget } from "../finance";
import {
  financeCalculation,
  formatDate,
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
  const [activePlan, setActivePlan] = useState<FinancePlan>();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [viewMonth, setViewMonth] = useState(monthKey());
  const [error, setError] = useState("");
  const load = () =>
    Promise.all([
      all<FinancePlan>("financePlans"),
      all<FinanceEntry>("financeEntries"),
    ]).then(([p, e]) => {
      setEntries(e);
      const current = currentBudgetPlan(p);
      setActivePlan(current);
      if (current) {
        setAmount(String(current.amount));
        setInclude(current.includeToday);
      }
    });
  useEffect(() => {
    load();
  }, []);
  const calc = financeCalculation(Number(amount) || 0, include);
  const unchanged =
    activePlan &&
    amount === String(activePlan.amount) &&
    include === activePlan.includeToday;
  const displayTarget = unchanged
    ? (activePlan.dailyTarget ?? calc.target)
    : calc.target;
  const displayStart = unchanged
    ? (activePlan.periodStart ?? calc.start)
    : calc.start;
  const displayEnd = unchanged ? (activePlan.periodEnd ?? calc.end) : calc.end;
  const save = async () => {
    try {
      await saveBudget(Number(amount), include);
      setError("");
      notify("Budget saved");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save budget.");
    }
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
          <WalletCards /> Budget through{" "}
          {formatDate(displayEnd, { month: "short", day: "numeric" })}
        </span>
        <strong>
          {amount && Number(amount) > 0 ? money(displayTarget) : "—"}
        </strong>
        <p>
          per day ·{" "}
          {unchanged
            ? "saved plan"
            : `${calc.days} ${calc.days === 1 ? "day" : "days"}`}{" "}
          from {formatDate(displayStart, { month: "short", day: "numeric" })} to{" "}
          {formatDate(displayEnd, { month: "short", day: "numeric" })}
        </p>
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
        <Button
          disabled={!Number.isFinite(Number(amount)) || Number(amount) <= 0}
          onClick={save}
        >
          Save budget
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
