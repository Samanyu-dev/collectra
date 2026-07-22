import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";

// Add stealth plugin to bypass Cloudflare
puppeteer.use(StealthPlugin());

export class TcdbCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init() {
    console.log("[TcdbCrawler] Launching stealth browser...");
    this.browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    this.page = await this.browser.newPage();
    
    // Set a realistic viewport and user agent (stealth plugin also helps with this)
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  async close() {
    if (this.browser) {
      console.log("[TcdbCrawler] Closing browser...");
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Helper to delay execution (prevents 429 Too Many Requests / IP Bans)
   */
  async sleep(minMs: number, maxMs: number) {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    console.log(`[TcdbCrawler] Sleeping for ${ms}ms to respect rate limits...`);
    await new Promise(r => setTimeout(r, ms));
  }

  /**
   * Navigates to a URL safely
   */
  async goto(url: string) {
    if (!this.page) throw new Error("Crawler not initialized. Call init() first.");
    console.log(`[TcdbCrawler] Navigating to: ${url}`);
    
    let response = await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Cloudflare Turnstile initially returns 403/503. Wait for the title to change or for a navigation
    const title = await this.page.title();
    if (title.includes("Just a moment") || response?.status() === 403) {
      console.log(`[TcdbCrawler] Cloudflare challenge detected. Waiting for challenge to pass...`);
      try {
        // Wait up to 60 seconds for the challenge to resolve (title will change from 'Just a moment...')
        await this.page.waitForFunction(() => !document.title.includes("Just a moment"), { timeout: 60000 });
        // Give it a brief moment to finish loading the real DOM
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        throw new Error(`Cloudflare challenge failed to resolve on ${url}.`);
      }
    }
    
    return this.page;
  }
}
