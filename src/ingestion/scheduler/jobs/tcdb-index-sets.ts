import { registerJob, enqueueJob } from "../worker";
import { TcdbCrawler } from "../../../../packages/core/adapters/tcdb/TcdbCrawler";

registerJob("tcdb-index-sets", async (jobId: string, log: any, payload: any) => {
  const { categoryName, categoryUrl } = payload as { categoryName: string, categoryUrl: string };
  log(`Starting TCDB Set Indexer for ${categoryName}...`);
  
  const crawler = new TcdbCrawler();
  await crawler.init();

  try {
    const page = await crawler.goto(categoryUrl);
    log(`Loaded category page: ${categoryUrl}`);

    // In a full implementation, this would handle pagination to get all sets for a category
    // For this demonstration, we'll extract the first page of sets
    const sets = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tr"));
      const extracted: { setName: string, setUrl: string, year: number }[] = [];
      
      rows.forEach(row => {
        const link = row.querySelector<HTMLAnchorElement>("a[href*='ViewSet.cfm']");
        if (link) {
          // Attempt to extract year from the text or row
          const text = link.innerText.trim();
          const match = text.match(/^(\d{4})/);
          const year = match ? parseInt(match[1]) : 0;
          extracted.push({
            setName: text,
            setUrl: link.href,
            year
          });
        }
      });
      return extracted;
    });

    log(`Found ${sets.length} sets on page 1 of ${categoryName}.`);

    for (const set of sets) {
      log(`Enqueueing checklist scraper for set: ${set.setName}`);
      await enqueueJob("tcdb-scrape-checklist", {
        setName: set.setName,
        setUrl: set.setUrl,
        year: set.year,
        category: categoryName
      });
    }

  } catch (error: any) {
    log(`[ERROR] tcdb-index-sets failed: ${error.message}`);
    throw error;
  } finally {
    await crawler.close();
  }
});
