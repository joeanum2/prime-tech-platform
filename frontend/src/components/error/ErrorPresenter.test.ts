import { describe, expect, it } from "vitest";
import { getErrorMessage } from "@/components/error/ErrorPresenter";

const canonical = {
  error: {
    code: "SAMPLE",
    message: "Something went wrong",
    details: { fieldErrors: { email: ["Required"] } }
  }
};

describe("ErrorPresenter", () => {
  it("returns null for missing error", () => {
    expect(getErrorMessage(null)).toBeNull();
  });

  it("extracts canonical error messages", () => {
    expect(getErrorMessage(canonical)).toBe("Something went wrong");
  });
});
