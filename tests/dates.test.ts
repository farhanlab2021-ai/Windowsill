import { describe, expect, it } from "vitest";
import { addDays, daysUntil, describeDaysUntil, isValidISODate, toISODate } from "@/lib/dates";

describe("date helpers", () => {
  const today = new Date(2026, 10, 19, 23, 30); // 19 Nov 2026, late evening

  it("formats local calendar days", () => {
    expect(toISODate(today)).toBe("2026-11-19");
    expect(toISODate(addDays(today, 14))).toBe("2026-12-03");
  });

  it("counts whole days regardless of the time of day", () => {
    expect(daysUntil("2026-11-19", today)).toBe(0);
    expect(daysUntil("2026-11-20", today)).toBe(1);
    expect(daysUntil("2026-11-18", today)).toBe(-1);
    expect(daysUntil("2027-01-01", today)).toBe(43);
  });

  it("is not thrown off by daylight-saving changes", () => {
    // Many countries change clocks in late March and late October.
    expect(daysUntil("2026-04-05", new Date(2026, 2, 25))).toBe(11);
    expect(daysUntil("2026-11-05", new Date(2026, 9, 20))).toBe(16);
  });

  it("describes the distance in words", () => {
    expect(describeDaysUntil(0)).toBe("today");
    expect(describeDaysUntil(1)).toBe("tomorrow");
    expect(describeDaysUntil(5)).toBe("in 5 days");
    expect(describeDaysUntil(-1)).toBe("yesterday");
    expect(describeDaysUntil(-3)).toBe("3 days ago");
  });

  it("validates ISO dates", () => {
    expect(isValidISODate("2026-12-05")).toBe(true);
    expect(isValidISODate("5/12/2026")).toBe(false);
    expect(isValidISODate("")).toBe(false);
  });
});
