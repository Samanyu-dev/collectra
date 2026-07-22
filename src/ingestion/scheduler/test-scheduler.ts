import { PrismaClient } from "@prisma/client";
import { startWorker } from "./worker";

// Import jobs to register them
import "./jobs/pokemon-sync";
import "./jobs/mtg-sync";
import "./jobs/yugioh-sync";
import "./jobs/image-verifier";
import "./jobs/kaggle-dataset-sync";
import "./jobs/huggingface-dataset-sync";
import "./jobs/github-dataset-sync";
import "./jobs/contribution-processor";

const prisma = new PrismaClient();

async function runTest() {
  console.log("Cleaning up old test jobs...");
  await prisma.syncLog.deleteMany();
  await prisma.syncJob.deleteMany();

  console.log("Seeding test jobs...");
  await prisma.syncJob.createMany({
    data: [
      { name: "pokemon-sync", status: "PENDING", priority: 10 },
      { name: "image-verifier", status: "PENDING", priority: 5 }
    ]
  });

  console.log("Starting worker (will run for 15 seconds)...");
  startWorker(2000); // Poll every 2s

  setTimeout(async () => {
    console.log("Checking job statuses...");
    const jobs = await prisma.syncJob.findMany({
      orderBy: { priority: 'desc' }
    });
    
    console.table(jobs.map(j => ({ name: j.name, status: j.status, retries: j.retryCount })));
    
    console.log("Test complete. Exiting...");
    process.exit(0);
  }, 15000);
}

runTest().catch(console.error);
