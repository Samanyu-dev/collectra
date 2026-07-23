import { describe, it, expect, vi } from "vitest";
import { identifyFromOcr } from "../identify";
import type { OcrTextBlock } from "../ocr";

function blocks(...texts: string[]): OcrTextBlock[] {
  return texts.map((text) => ({ text, confidence: 0.9 }));
}

describe("identifyFromOcr — extraction heuristics", () => {
  it("returns NO_DATA when OCR found no usable name text", async () => {
    const prisma = {} as any;
    const result = await identifyFromOcr(prisma, blocks("4/102", "123"));
    expect(result.confidenceLabel).toBe("NO_DATA");
    expect(result.extractedName).toBeNull();
  });

  it("extracts a card number from a slash-format block and excludes it from the name candidates", async () => {
    const prisma = {
      set: { findMany: vi.fn() },
      card: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;
    const result = await identifyFromOcr(prisma, blocks("Charizard", "4/102", "Fire"));
    expect(result.extractedCardNumber).toBe("4");
    expect(result.extractedName).toBe("Charizard"); // the first surviving candidate, not "Fire"
  });

  it("picks the card name over longer rules/flavor/copyright text (regression: real OCR.space output from a live Base Set Charizard scan)", async () => {
    // Captured verbatim from a real end-to-end run against images.pokemontcg.io/base1/4_hires.png.
    // The original "longest block wins" heuristic picked the copyright line here instead of "Charizard".
    const realOcrLines = [
      "STAGE 2",
      "Evolves from Charmeleon",
      "Charizard",
      "Put Charizard on the Stage I card",
      "120 HP",
      "Pokémon Power: Energy Burn As often as you",
      "like during your turn (before your attack), you may turn",
      "all Energy attached to Charizard into & Energy for the",
      "rest of the turn. This power can't be used if Charizard",
      "is Asleep, Confused, or Paralyzed.",
      "Fire Spin Discard 2 Energy cards attached",
      "to Charizard in order to use this attack.",
      "100",
      "weakness",
      "resistance",
      "retreat cost",
      "-30",
      "Spits fire that is hot enough to melt boulders. Known to",
      "unintentionally cause forest fires. LV. 76 #6",
      "Illus. Mitsuhiro Arica © 1995,96,98,99 Nintendo, Creatures, GAMEFREAK. @ 1999 Wizards.",
      "4/102 *",
    ];
    const prisma = { set: { findMany: vi.fn() }, card: { findMany: vi.fn().mockResolvedValue([]) } } as any;
    const result = await identifyFromOcr(prisma, blocks(...realOcrLines));
    expect(result.extractedName).toBe("Charizard");
    expect(result.extractedCardNumber).toBe("4");
  });

  it("labels a resolved single-variant match as HIGH", async () => {
    const prisma = {
      set: { findMany: vi.fn() },
      card: {
        findMany: vi.fn().mockResolvedValue([
          { id: "card-1", name: "Charizard", number: "4", set: { name: "Base Set" }, variants: [{ id: "variant-1" }] },
        ]),
      },
    } as any;
    const result = await identifyFromOcr(prisma, blocks("Charizard", "4/102"));
    expect(result.confidenceLabel).toBe("HIGH");
    expect(result.variantId).toBe("variant-1");
  });

  it("labels multiple candidates as MEDIUM, never silently picking one", async () => {
    const prisma = {
      set: { findMany: vi.fn() },
      card: {
        findMany: vi.fn().mockResolvedValue([
          { id: "card-1", name: "Charizard", number: "4", set: { name: "Base Set" }, variants: [{ id: "variant-1" }] },
          { id: "card-2", name: "Charizard", number: "4", set: { name: "Base Set 2" }, variants: [{ id: "variant-2" }] },
        ]),
      },
    } as any;
    const result = await identifyFromOcr(prisma, blocks("Charizard", "4/102"));
    expect(result.confidenceLabel).toBe("MEDIUM");
    expect(result.variantId).toBeNull();
    expect(result.candidates.length).toBe(2);
  });

  it("labels a total miss as NO_DATA, never a fabricated guess", async () => {
    const prisma = {
      set: { findMany: vi.fn() },
      card: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;
    const result = await identifyFromOcr(prisma, blocks("Some Unknown Card Text", "999/102"));
    expect(result.confidenceLabel).toBe("NO_DATA");
    expect(result.variantId).toBeNull();
    expect(result.candidates).toEqual([]);
  });
});
