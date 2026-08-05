import { describe, it, expect } from "vitest";
import { isLikelyBulkListing, isLikelyGraded, titleMatchesCard } from "../api-client";

describe("isLikelyBulkListing", () => {
  it("flags lot/bundle/pick-your-card phrasing", () => {
    expect(isLikelyBulkListing("Lot of 50 Pokemon Cards Bulk")).toBe(true);
    expect(isLikelyBulkListing("You Pick Naruto Animax Card")).toBe(true);
    expect(isLikelyBulkListing("Complete Set 1-360 Topps Premier League")).toBe(true);
    expect(isLikelyBulkListing("Topps NARUTO ANIMAX JET BLACK Limited Edition Card Full Set Of 15 CARDS")).toBe(true);
  });

  it("catches numeric 'set of N' / 'N card lot' phrasing the keyword list can't enumerate", () => {
    expect(isLikelyBulkListing("Rare set of 12 Marvel cards")).toBe(true);
    expect(isLikelyBulkListing("15 card lot mixed sports")).toBe(true);
  });

  it("does not flag an ordinary single-card listing", () => {
    expect(isLikelyBulkListing("2025-26 Topps Match Attax Gabriel Martinelli #123")).toBe(false);
  });
});

describe("isLikelyGraded", () => {
  it("flags PSA/BGS/SGC/CGC grading language", () => {
    expect(isLikelyGraded("Shikamaru Nara #100 PSA 10 GEM MINT")).toBe(true);
    expect(isLikelyGraded("2009 Bandai Naruto BGS 9.5")).toBe(true);
    expect(isLikelyGraded("Card SGC graded 9")).toBe(true);
  });

  it("does not flag an ungraded/raw listing", () => {
    expect(isLikelyGraded("Shikamaru Nara #100 Naruto Animax Card Raw NM")).toBe(false);
  });
});

describe("titleMatchesCard", () => {
  it("rejects a result whose title carries a different card number (real Shikamaru #100 finding)", () => {
    expect(titleMatchesCard("Shikamaru Nara NX-159 Naruto Animax", "Shikamaru Nara", "100")).toBe(false);
    expect(titleMatchesCard("Shikamaru Nara #93 Naruto Animax", "Shikamaru Nara", "100")).toBe(false);
    expect(titleMatchesCard("Shikamaru Nara Naruto Animax Card", "Shikamaru Nara", "100")).toBe(false);
  });

  it("accepts a result whose title carries the matching number as a distinct token", () => {
    expect(titleMatchesCard("Shikamaru Nara #100 Naruto Animax Jet Black", "Shikamaru Nara", "100")).toBe(true);
    expect(titleMatchesCard("Naruto Animax No. 100 Shikamaru Nara", "Shikamaru Nara", "100")).toBe(true);
  });

  it("does not let '100' match inside a longer number like '1000'", () => {
    expect(titleMatchesCard("Some Card #1000 Shikamaru Nara", "Shikamaru Nara", "100")).toBe(false);
  });

  it("treats internal whitespace in a compound insert number as optional (real 'IN 6' vs listing '#IN6' finding)", () => {
    expect(titleMatchesCard("Topps Match Attax 2025/26 Infinity Jude Bellingham #IN6", "Jude Bellingham", "IN 6")).toBe(true);
    expect(titleMatchesCard("2025-26 TOPPS MATCH ATTAX SOCCER CARD -[INFINITY]- IN6 Jude BELLINGHAM (BAYERN)", "Jude Bellingham", "IN 6")).toBe(true);
    // still requires the letters+digits to actually match — doesn't go loose enough to match a different insert number
    expect(titleMatchesCard("Topps Match Attax 2025/26 Infinity Jude Bellingham #IN7", "Jude Bellingham", "IN 6")).toBe(false);
  });

  it("rejects a wrong-subline product that reuses the same number (real Gabriel Martinelli #CA-GM finding)", () => {
    expect(
      titleMatchesCard(
        "2025-26 Topps Chrome Sapphire UEFA - Gabriel Martinelli Black Auto /10 #CA-GM",
        "Gabriel Martinelli",
        "CA-GM",
        "Topps Chrome UEFA Champions League"
      )
    ).toBe(false);
  });

  it("does not reject a subline keyword when the card's own set legitimately contains it", () => {
    expect(
      titleMatchesCard("Some Card #CA-GM Ruby & Sapphire Special", "Some Card", "CA-GM", "Ruby & Sapphire")
    ).toBe(true);
  });

  it("skips the subline check entirely when setName is omitted (older call sites)", () => {
    expect(titleMatchesCard("2025-26 Topps Chrome Sapphire - Gabriel Martinelli #CA-GM", "Gabriel Martinelli", "CA-GM")).toBe(true);
  });

  it("rejects when fewer than half the card name's meaningful words appear in the title", () => {
    expect(titleMatchesCard("Random Unrelated Card #100", "Shikamaru Nara Uzumaki", "100")).toBe(false);
  });
});
