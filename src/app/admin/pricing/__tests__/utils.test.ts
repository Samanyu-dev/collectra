import { describe, it, expect } from "vitest";
import { canViewPricingAdmin, timeAgo, timeUntil, rateLimitTone } from "../utils";

describe("canViewPricingAdmin", () => {
  it("allows MODERATOR, CURATOR, ADMIN", () => {
    expect(canViewPricingAdmin("MODERATOR")).toBe(true);
    expect(canViewPricingAdmin("CURATOR")).toBe(true);
    expect(canViewPricingAdmin("ADMIN")).toBe(true);
  });

  it("rejects plain USER and unknown roles", () => {
    expect(canViewPricingAdmin("USER")).toBe(false);
    expect(canViewPricingAdmin("")).toBe(false);
    expect(canViewPricingAdmin("SUPERADMIN")).toBe(false);
  });
});

describe("timeAgo / timeUntil", () => {
  it("timeAgo handles null as 'never'", () => {
    expect(timeAgo(null)).toBe("never");
  });

  it("timeAgo reports recent past correctly", () => {
    expect(timeAgo(new Date(Date.now() - 10_000))).toBe("just now");
    expect(timeAgo(new Date(Date.now() - 5 * 60_000))).toBe("5m ago");
  });

  it("timeUntil reports 'now' for a past or present date", () => {
    expect(timeUntil(new Date(Date.now() - 1000))).toBe("now");
  });

  it("timeUntil reports future windows correctly", () => {
    expect(timeUntil(new Date(Date.now() + 5 * 60_000))).toBe("in 5m");
  });
});

describe("rateLimitTone", () => {
  it("is ok comfortably under the limit", () => {
    expect(rateLimitTone(5, 30)).toBe("ok");
  });

  it("warns at 80% or more", () => {
    expect(rateLimitTone(24, 30)).toBe("warn");
    expect(rateLimitTone(29, 30)).toBe("warn");
  });

  it("reports exceeded at or over the limit", () => {
    expect(rateLimitTone(30, 30)).toBe("exceeded");
    expect(rateLimitTone(35, 30)).toBe("exceeded");
  });
});
