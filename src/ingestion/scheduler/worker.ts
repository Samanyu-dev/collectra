import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export type JobHandler = (jobId: string, log: (msg: string) => void, payload: any) => Promise<void>;

export async function enqueueJob(name: string, payload: any = {}, priority: number = 0) {
  return prisma.syncJob.create({
    data: {
      name,
      priority,
      status: "PENDING",
      payload: JSON.stringify(payload)
    }
  });
}

const JOB_HANDLERS: Record<string, JobHandler> = {};

export function registerJob(name: string, handler: JobHandler) {
  JOB_HANDLERS[name] = handler;
}

const MAX_RETRIES = 3;

/**
 * Polling loop for SQLite-backed jobs
 */
export async function startWorker(pollIntervalMs = 5000) {
  console.log("🚀 Starting Collectra Live Data Pipeline Worker...");

  setInterval(async () => {
    let activeJobId: string | null = null;
    try {
      // 1. Find the next pending or ready-to-retry job
      const job = await prisma.syncJob.findFirst({
        where: {
          OR: [
            { status: "PENDING" },
            { 
              status: "RETRY", 
              nextRunAt: { lte: new Date() } 
            }
          ]
        },
        orderBy: [
          { priority: "desc" },
          // id acts as a rough time sort in CUIDs
          { id: "asc" }
        ]
      });

      if (!job) return;
      activeJobId = job.id;

      // 2. Lock the job
      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: "RUNNING",
          lockedAt: new Date(),
          lastRunAt: new Date(),
        }
      });

      console.log(`[WORKER] Picked up job ${job.name} (ID: ${job.id})`);

      const handler = JOB_HANDLERS[job.name];
      if (!handler) {
        throw new Error(`No handler registered for job name: ${job.name}`);
      }

      // 3. Execute the handler with a logger and parsed payload
      const logFn = (msg: string) => console.log(`[WORKER:${job.name}] ${msg}`);
      let payload = {};
      if (job.payload) {
        try {
          payload = JSON.parse(job.payload);
        } catch(e) {}
      }
      
      await handler(job.id, logFn, payload);

      // 4. Mark completed
      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          lockedAt: null,
          errorMessage: null
        }
      });

      console.log(`[WORKER] Completed job ${job.name} (ID: ${job.id})`);

    } catch (error: any) {
      if (!activeJobId) return;
      
      console.error(`[WORKER] Job ${activeJobId} failed:`, error);
      
      try {
        const failedJob = await prisma.syncJob.findUnique({ where: { id: activeJobId }});
        if (!failedJob) return;

        const nextRetryCount = failedJob.retryCount + 1;
        const willRetry = nextRetryCount <= MAX_RETRIES;
        
        await prisma.syncJob.update({
          where: { id: activeJobId },
          data: {
            status: willRetry ? "RETRY" : "FAILED",
            retryCount: nextRetryCount,
            lockedAt: null,
            errorMessage: error.message || "Unknown error",
            // Exponential backoff: retryCount * 5 minutes
            nextRunAt: willRetry ? new Date(Date.now() + nextRetryCount * 5 * 60000) : null
          }
        });

        await prisma.syncLog.create({
          data: {
            jobId: activeJobId,
            level: "ERROR",
            message: `Execution failed. ${willRetry ? 'Will retry.' : 'Max retries reached.'}`,
            metadata: JSON.stringify({ error: error.message, stack: error.stack })
          }
        });
      } catch (fatalErr) {
        console.error(`[WORKER] FATAL: Could not update job failure status for ${activeJobId}`, fatalErr);
      }
    }
  }, pollIntervalMs);
}
