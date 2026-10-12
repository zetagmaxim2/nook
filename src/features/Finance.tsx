import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, WalletCards } from "lucide-react";
import { all } from "../db";
import type { FinanceEntry, FinancePlan } from "../types";
import { currentBudgetPlan, saveBudget } from "../finance";
import {
  dayDiff,
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
} from "../ui";
export default function Finance({ notify }: { notify: (s: string) => void }) {
  const [amount, setAmount] = useState("");
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [viewMonth, setViewMonth] = useState(monthKey());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = () =>
    Promise.all([
      all<FinancePlan>("financePlans"),
      all<FinanceEntry>("financeEntries"),
    ]).then(([p, e]) => {
      setEntries(e);
      const current = currentBudgetPlan(p);
      if (current) {
        setAmount(String(current.amount));
      }
    });
  useEffect(() => {
    load();
  }, []);
  const calc = financeCalculation(Number(amount) || 0, true);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveBudget(Number(amount));
      setError("");
      notify("Amount logged");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log amount.");
    } finally {
      setSaving(false);
    }
  };
  const monthEntries = entries
    .filter((e) => e.loggedAt && e.date.startsWith(viewMonth))
    .sort((a, b) => (b.loggedAt || "").localeCompare(a.loggedAt || ""));
  const shift = (n: number) => {
    const [y, m] = viewMonth.split("-").map(Number);
    setViewMonth(monthKey(new Date(y, m - 1 + n, 1)));
  };
  return (
    <div className="page">
      <PageHeader title="Finance" subtitle="See what you can spend each day through the 28th." />
      <ErrorNote>{error}</ErrorNote>
      <Card className="budget-card">
        <span className="eyebrow">
          <WalletCards /> Daily amount through{" "}
          {formatDate(calc.end, { month: "short", day: "numeric" })}
        </span>
        <strong>
          {amount && Number(amount) > 0 ? money(calc.target) : "—"}
        </strong>
        <p>
          per day · {calc.days} {calc.days === 1 ? "day" : "days"}{" "}
          from {formatDate(calc.start, { month: "short", day: "numeric" })} to{" "}
          {formatDate(calc.end, { month: "short", day: "numeric" })}
        </p>
        <Field label="Amount you have to spend">
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
        <Button
          disabled={saving || !Number.isFinite(Number(amount)) || Number(amount) <= 0}
          onClick={save}
        >
          {saving ? "Logging…" : "Log amount"}
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
          body="Log an amount to see your daily spending guide here."
        />
      ) : (
        <div className="history-list">
          {monthEntries.map((e) => (
            <Card key={e.id} className="history-row">
              <span>
                <b>
                  {formatDate(e.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </b>
                <small>{money(e.amount)} entered · {dayDiff(e.periodStart, e.periodEnd) + 1} days through {formatDate(e.periodEnd, { month: "short", day: "numeric" })}</small>
              </span>
              <strong>{money(e.dailyTarget)}<small>/day</small></strong>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
