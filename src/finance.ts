import { all, put } from "./db";
import type { FinanceEntry, FinancePlan } from "./types";
import { financeCalculation, id, localDate } from "./utils";

export function currentBudgetPlan(plans: FinancePlan[], date = new Date()) {
  const period = financeCalculation(0, true, date).end.slice(0, 7);
  const nextPeriod = financeCalculation(0, false, date).end.slice(0, 7);
  if (nextPeriod !== period) {
    const upcoming = plans.find((plan) => plan.month === nextPeriod);
    if (upcoming) return upcoming;
  }
  return plans.find((plan) => plan.month === period);
}

export async function saveBudget(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  const savedAt = new Date();
  const calc = financeCalculation(amount, true, savedAt);
  const month = calc.end.slice(0, 7);
  const plans = await all<FinancePlan>("financePlans");
  const existing = plans.find((plan) => plan.month === month);
  await put("financePlans", {
    id: existing?.id || id(),
    month,
    amount,
    includeToday: true,
    periodStart: calc.start,
    periodEnd: calc.end,
    dailyTarget: calc.target,
    createdAt: existing?.createdAt || new Date().toISOString(),
  } satisfies FinancePlan);

  await put("financeEntries", {
    id: id(),
    date: localDate(savedAt),
    amount,
    dailyTarget: calc.target,
    periodStart: calc.start,
    periodEnd: calc.end,
    completed: false,
    loggedAt: savedAt.toISOString(),
  } satisfies FinanceEntry);
  return calc;
}
