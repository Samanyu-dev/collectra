-- Follow-up correction to 20260807072030 (still same session, no data
-- written to either column yet): `group` and `finish` turned out to be
-- redundant for both products in scope — the ladder name ("Mini Diamond",
-- "Rainbow Foil") IS the finish/technique, there's no independently
-- documented "finish" beyond that. Consolidating to `finish` (dropping
-- `group`) and adding `color` as the genuinely orthogonal axis, so a
-- parallel decomposes as finish="Rainbow Foil" + color="Pink" instead of
-- a single combined name needing a new type per color.

-- AlterTable
ALTER TABLE "Parallel" DROP COLUMN "group";
ALTER TABLE "Parallel" ADD COLUMN     "color" TEXT;
