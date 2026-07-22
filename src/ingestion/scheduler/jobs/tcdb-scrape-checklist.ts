import { registerJob } from "../worker";
import { TcdbCrawler } from "../../../../packages/core/adapters/tcdb/TcdbCrawler";

registerJob("tcdb-scrape-checklist", async (jobId: string, log: any, payload: any) => {
  const { setName, setUrl, year, category } = payload as any;
  log(`Starting TCDB Checklist Scraper for ${setName}...`);
  
  const crawler = new TcdbCrawler();
  await crawler.init();

  try {
    const page = await crawler.goto(setUrl);
    log(`Loaded checklist page: ${setUrl}`);

    // Extract cards from the set
    const cards = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tr"));
      const extracted: { cardNumber: string, cardName: string, imgUrl: string | null }[] = [];
      
      rows.forEach(row => {
        const numCell = row.querySelector("td:nth-child(1)");
        const nameCell = row.querySelector("td:nth-child(2) a");
        const img = row.querySelector("img");
        
        if (numCell && nameCell) {
          extracted.push({
            cardNumber: numCell.textContent?.trim() || "",
            cardName: nameCell.textContent?.trim() || "",
            imgUrl: img ? img.src : null
          });
        }
      });
      return extracted;
    });

    log(`Scraped ${cards.length} cards for set ${setName}.`);
    
    // In a complete implementation, we'd map these to the `EntityBatch` and push to the DB
    if (cards.length > 0) {
      log(`Sample card: ${cards[0].cardNumber} - ${cards[0].cardName}`);
    }

  } catch (error: any) {
    log(`[ERROR] tcdb-scrape-checklist failed: ${error.message}`);
    throw error;
  } finally {
    await crawler.close();
  }
});
