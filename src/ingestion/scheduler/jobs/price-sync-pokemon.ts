import { registerJob } from "../worker";
import { syncPokemonPrices } from "../../pokemon/sync-prices";

registerJob("price-sync-pokemon", async (jobId, log) => {
  const result = await syncPokemonPrices();
  log(`Wrote ${result.observationsWritten} observations across ${result.variantsTouched} variants.`);
  if (result.failedSets.length > 0) {
    log(`${result.failedSets.length} set(s) failed: ${result.failedSets.join(", ")}`);
  }
});
