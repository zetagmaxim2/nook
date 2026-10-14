import { describe, expect, it } from "vitest";
import { nextBirthday } from "./contacts";
import type { Contact } from "./types";

const person = (birthday: string, birthYear?: number) => ({ id: "a", name: "Ada", birthday, birthYear, relatives: [], createdAt: "", updatedAt: "" }) satisfies Contact;

describe("nextBirthday", () => {
  it("handles birthdays across a year boundary", () => {
    expect(nextBirthday(person("01-02", 1990), new Date(2026, 11, 31))).toMatchObject({ days: 2, age: 37 });
  });
  it("includes today and skips invalid leap dates until the next leap year", () => {
    expect(nextBirthday(person("02-29"), new Date(2028, 1, 29))?.days).toBe(0);
    expect(nextBirthday(person("02-29"), new Date(2025, 0, 1))?.date.getFullYear()).toBe(2028);
  });
});
