import { describe, expect, it } from "vitest";
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

  it("ends a monthly period after the 28th", () => {
    expect(financeCalculation(3000, true, new Date(2026, 2, 29)).ended).toBe(
      true,
    );
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
