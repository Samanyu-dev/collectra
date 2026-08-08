-- Performance fix (2026-08-06 /cards investigation, docs/adr/007 follow-up):
-- Card had zero indexes, including on `name` (the /cards browse sort column)
-- and Variant had none on `cardId` (the per-page variant fan-out filter).
-- Confirmed via EXPLAIN ANALYZE: both were full sequential scans (Card:
-- 32,677 rows, Variant: 92,130 rows) on every single /cards page load.
--
-- Plain (non-CONCURRENTLY) CREATE INDEX: neither table has any active
-- concurrent writer (the eBay sweep writes PriceObservation/CurrentPrice/
-- Media/DataSource, never Card or Variant directly), so the brief SHARE
-- lock this takes is safe here.

-- CreateIndex
CREATE INDEX "Card_name_idx" ON "Card"("name");

-- CreateIndex
CREATE INDEX "Variant_cardId_idx" ON "Variant"("cardId");
