import { describe, expect, it } from "vitest";

import { formatMonth, getActiveLocale, setActiveLocale } from "@/domain/format";
import { copy } from "@/i18n/copy";

describe("locale copy", () => {
  it("gives Arabic every English phrase", () => {
    expect(Object.keys(copy.ar).sort()).toEqual(Object.keys(copy.en).sort());
  });

  it("uses Lebanese month names when Arabic is selected", () => {
    const previous = getActiveLocale();
    setActiveLocale("ar");
    try {
      expect(formatMonth("2026-06")).toBe("حزيران 2026");
      expect(formatMonth("2026-07")).toBe("تموز 2026");
    } finally {
      setActiveLocale(previous);
    }
  });
});