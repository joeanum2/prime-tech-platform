import { describe, expect, it } from "vitest";
import { identifierPatterns } from "./validation";

const cases = [
  { pattern: identifierPatterns.ORD, ok: "ORD-20250131-AB12", bad: "ord-20250131-ab12" },
  { pattern: identifierPatterns.INV, ok: "INV-2025-000123", bad: "INV-25-123" },
  { pattern: identifierPatterns.RCP, ok: "RCP-2025-999999", bad: "RCP-202-999999" },
  { pattern: identifierPatterns.LIC, ok: "LIC-ABCD-1234-WXYZ", bad: "LIC-ABC-1234-XYZ" },
  { pattern: identifierPatterns.BKG, ok: "BKG-1A2B3C4D", bad: "BKG-123" }
];

describe("identifierPatterns", () => {
  cases.forEach(({ pattern, ok, bad }) => {
    it(`accepts ${ok} and rejects ${bad}`, () => {
      expect(pattern.test(ok)).toBe(true);
      expect(pattern.test(bad)).toBe(false);
    });
  });
});
