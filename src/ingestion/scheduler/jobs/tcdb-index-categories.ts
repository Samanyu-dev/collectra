import { registerJob, enqueueJob } from "../worker";
import { TcdbCrawler } from "../../../../packages/core/adapters/tcdb/TcdbCrawler";

registerJob("tcdb-index-categories", async (jobId: string, log: any) => {
  log("Starting TCDB Category Indexer...");
  
  const crawler = new TcdbCrawler();
  await crawler.init();

  try {
    const page = await crawler.goto("https://www.tcdb.com/");
    // Dump DOM and links for analysis
    const html = await page.evaluate(() => document.body.innerHTML);
    require("fs").writeFileSync("tcdb-homepage.html", html);
    
    // Extract all main categories (e.g. Baseball, Gaming, etc.)
    const categories = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"));
      return links
        .filter(a => a.href)
        .map(a => ({
          name: a.innerText.trim(),
          url: a.href
        }))
        .filter(a => a.name.length > 0);
    });
    
    require("fs").writeFileSync("tcdb-links.json", JSON.stringify(categories, null, 2));

    // Deduplicate
    const uniqueCategories = Array.from(new Map(categories.map(c => [c.url, c])).values());
    log(`Found ${uniqueCategories.length} categories.`);

    log(`Skipping enqueueing sets while testing DOM extract.`);

  } catch (error: any) {
    log(`[ERROR] tcdb-index-categories failed: ${error.message}`);
    throw error;
  } finally {
    await crawler.close();
  }
});
