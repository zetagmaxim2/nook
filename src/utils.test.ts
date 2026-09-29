import { describe, expect, it } from "vitest";
import { currentBudgetPlan } from "./finance";
import { countWords, dayDiff, financeCalculation, localDate } from "./utils";

describe("local calendar calculations", () => {
  it("calculates March 10 through March 28 excluding today", () => {
    const result = financeCalculation(
      3000,
      false,
      new Date(2026, 2, 10, 23, 30),
    );
    expect(result.days).toBe(18);
    expect(result.start).toBe("2026-03-11");
    expect(result.end).toBe("2026-03-28");
    expect(result.target).toBeCloseTo(166.67, 2);
  });

  it("calculates March 10 through March 28 including today", () => {
    const result = financeCalculation(3000, true, new Date(2026, 2, 10, 0, 5));
    expect(result.days).toBe(19);
    expect(result.start).toBe("2026-03-10");
    expect(result.target).toBeCloseTo(157.89, 2);
  });

  it("rolls a budget saved after the 28th into the next period", () => {
    const result = financeCalculation(3000, true, new Date(2026, 2, 29));
    expect(result.start).toBe("2026-03-29");
    expect(result.end).toBe("2026-04-28");
    expect(result.days).toBe(31);
    expect(result.target).toBeCloseTo(96.77, 2);
  });

  it("starts the next period when today is excluded on the 28th", () => {
    const result = financeCalculation(3000, false, new Date(2026, 8, 28));
    expect(result.start).toBe("2026-09-29");
    expect(result.end).toBe("2026-10-28");
    expect(result.days).toBe(30);
  });

  it("keeps a budget saved after the 28th active into the next month", () => {
    const plan = {
      id: "october",
      month: "2026-10",
      amount: 3000,
      includeToday: true,
      dailyTarget: 100,
      createdAt: "2026-09-29T12:00:00.000Z",
    };
    expect(currentBudgetPlan([plan], new Date(2026, 8, 29))).toBe(plan);
    expect(currentBudgetPlan([plan], new Date(2026, 9, 1))).toBe(plan);
    expect(currentBudgetPlan([plan], new Date(2026, 8, 28))).toBe(plan);
  });

  it("uses calendar days across daylight saving changes", () => {
    expect(dayDiff("2026-03-07", "2026-03-10")).toBe(3);
    expect(localDate(new Date(2026, 8, 29, 23, 59))).toBe("2026-09-29");
  });
});

describe("word count", () => {
  it("ignores markup, whitespace, and punctuation", () => {
    expect(
      countWords(
        "<p>“Hello, world.”</p><p><strong>It’s me</strong> — again.</p>",
      ),
    ).toBe(5);
    expect(countWords("<p><br></p>   ")).toBe(0);
  });

  it("supports non-Latin writing", () => {
    expect(countWords("مرحبا بالعالم bonjour le monde")).toBe(5);
  });
});
