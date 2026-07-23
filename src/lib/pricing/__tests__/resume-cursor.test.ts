import { describe, it, expect } from "vitest";
import { resolveStartIndex } from "../resume-cursor";

const items = [{ id: "base1" }, { id: "base2" }, { id: "jungle" }, { id: "fossil" }];

describe("resolveStartIndex", () => {
  it("starts at 0 when there is no cursor yet (first-ever sync)", () => {
    expect(resolveStartIndex(items, null)).toBe(0);
  });

  it("resumes right after the last-completed item", () => {
    expect(resolveStartIndex(items, "base1")).toBe(1);
    expect(resolveStartIndex(items, "jungle")).toBe(3);
  });

  it("wraps back to 0 once the cursor was the last item — a full lap just finished", () => {
    expect(resolveStartIndex(items, "fossil")).toBe(0);
  });

  it("restarts from 0 if the cursor's item no longer exists (upstream catalog changed)", () => {
    expect(resolveStartIndex(items, "some-removed-set")).toBe(0);
  });

  it("handles an empty item list without throwing", () => {
    expect(resolveStartIndex([], "anything")).toBe(0);
  });

  it("is stable under reordering — keyed on id, not position", () => {
    const reordered = [{ id: "fossil" }, { id: "base1" }, { id: "jungle" }, { id: "base2" }];
    // "base1" is now at index 1 in the reordered list; resume should still be the item right after it, base1's *new* neighbor
    expect(resolveStartIndex(reordered, "base1")).toBe(2);
  });
});
