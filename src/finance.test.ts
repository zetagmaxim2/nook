import { afterEach, describe, expect, it, vi } from "vitest";

const { all, put } = vi.hoisted(() => ({
  all: vi.fn(),
  put: vi.fn(),
}));
vi.mock("./db", () => ({ all, put }));

import { saveBudget } from "./finance";

describe("finance amount log", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("logs one dated amount and daily figure for each submission", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 10, 14, 30));
    all.mockResolvedValue([]);
    put.mockResolvedValue(undefined);

    await saveBudget(3000);

    const entries = put.mock.calls.filter(([store]) => store === "financeEntries");
    expect(entries).toHaveLength(1);
    expect(entries[0][1]).toMatchObject({
      date: "2026-03-10",
      amount: 3000,
      dailyTarget: 3000 / 19,
      periodStart: "2026-03-10",
      periodEnd: "2026-03-28",
    });
    expect(entries[0][1].loggedAt).toEqual(expect.any(String));
  });
});
