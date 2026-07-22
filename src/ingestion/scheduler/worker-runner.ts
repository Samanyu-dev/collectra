import { startWorker } from "./worker";

// Import all jobs to register them
import "./jobs/mtg-sync";
import "./jobs/yugioh-sync";
import "./jobs/image-verifier";
import "./jobs/kaggle-dataset-sync";
import "./jobs/huggingface-dataset-sync";
import "./jobs/github-dataset-sync";
import "./jobs/contribution-processor";
import "./jobs/tcdb-index-categories";
import "./jobs/tcdb-index-sets";
import "./jobs/tcdb-scrape-checklist";
import "./jobs/price-sync-pokemon";

// Start the worker process
startWorker().catch(console.error);
