import { enqueueJob } from "../worker";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function startTcdbIngestion() {
  console.log("=============================================");
  console.log("   COLLECTRA - TCDB DISTRIBUTED INGESTION    ");
  console.log("=============================================");
  
  // Seed the initial job to crawl the homepage
  console.log("Enqueueing initial 'tcdb-index-categories' job...");
  await enqueueJob("tcdb-index-categories", {});
  
  console.log("Job seeded in SQLite queue!");
  console.log("");
  console.log("To begin processing, run the worker:");
  console.log("  npx tsx src/ingestion/scheduler/worker-runner.ts");
  
  await prisma.$disconnect();
}

startTcdbIngestion().catch(console.error);
