import { TcdbCrawler } from "../packages/core/adapters/tcdb/TcdbCrawler";
import fs from "fs";

async function run() {
  const crawler = new TcdbCrawler();
  await crawler.init();
  try {
    const page = await crawler.goto("https://www.tcdb.com/");
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync("tcdb-homepage.html", html);
    console.log("Saved TCDB homepage HTML to tcdb-homepage.html");
    
    // Also save all links to a file to make it easy to find them
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a")).map(a => a.href).filter(h => h);
    });
    fs.writeFileSync("tcdb-links.json", JSON.stringify(links, null, 2));
    console.log("Saved TCDB links to tcdb-links.json");

  } catch (err) {
    console.error(err);
  } finally {
    await crawler.close();
  }
}

run();
