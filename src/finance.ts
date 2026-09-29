import { all, put } from "./db";
import type { FinanceEntry, FinancePlan } from "./types";
import { addDays, financeCalculation, id } from "./utils";

export function currentBudgetPlan(plans: FinancePlan[], date = new Date()) {
  const period = financeCalculation(0, true, date).end.slice(0, 7);
  const nextPeriod = financeCalculation(0, false, date).end.slice(0, 7);
  if (nextPeriod !== period) {
    const upcoming = plans.find((plan) => plan.month === nextPeriod);
    if (upcoming) return upcoming;
  }
  return plans.find((plan) => plan.month === period);
}

export async function saveBudget(amount: number, includeToday: boolean) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  const calc = financeCalculation(amount, includeToday);
  const month = calc.end.slice(0, 7);
  const [plans, entries] = await Promise.all([
    all<FinancePlan>("financePlans"),
    all<FinanceEntry>("financeEntries"),
  ]);
  const existing = plans.find((plan) => plan.month === month);
  await put("financePlans", {
    id: existing?.id || id(),
    month,
    amount,
    includeToday,
    periodStart: calc.start,
    periodEnd: calc.end,
    dailyTarget: calc.target,
    createdAt: existing?.createdAt || new Date().toISOString(),
  } satisfies FinancePlan);

  for (let day = calc.start; day <= calc.end; day = addDays(day, 1)) {
    const previous = entries.find(
      (entry) => entry.date === day && entry.periodEnd === calc.end,
    );
    await put("financeEntries", {
      id: previous?.id || id(),
      date: day,
      amount,
      dailyTarget: calc.target,
      periodStart: calc.start,
      periodEnd: calc.end,
      completed: previous?.completed || false,
    } satisfies FinanceEntry);
  }
  return calc;
}
