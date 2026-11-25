import { randomUUID } from "node:crypto";
import { repository } from "../lib/repository";
import type { BackgroundJob } from "../lib/types";
import { discoverForProduct } from "../engines/discovery";
import { refreshOffers } from "../engines/monitoring";
import { updateCartForProduct } from "../engines/cart-engine";

export async function processJob(job: BackgroundJob): Promise<void> {
  switch (job.type) {
    case "discovery":
      await discoverForProduct(String(job.payload.monitoredId), { maxStores: job.payload.maxStores as number | undefined });
      break;
    case "monitor":
      await refreshOffers({ limit: (job.payload.limit as number) ?? 40 });
      break;
    case "revalidate":
      await updateCartForProduct(String(job.payload.monitoredId));
      break;
  }
}

export async function runWorkerOnce(workerId = randomUUID()): Promise<{ processed: number; failed: number }> {
  const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 3);
  const jobs = await repository.claimJobs(workerId, concurrency);
  let failed = 0;
  await Promise.all(jobs.map(async (job) => {
    try {
      await processJob(job);
      await repository.completeJob(job.id);
    } catch (error) {
      failed += 1;
      await repository.failJob(job, error instanceof Error ? error.message : "erro desconhecido");
    }
  }));
  return { processed: jobs.length, failed };
}

export async function startWorker(): Promise<void> {
  const workerId = randomUUID();
  const pollMs = Number(process.env.WORKER_POLL_MS ?? 5000);
  console.log(`[smartdeals-worker] iniciado (${workerId}), poll=${pollMs}ms`);
  for (;;) {
    try {
      await runWorkerOnce(workerId);
    } catch (error) {
      console.error("[smartdeals-worker] ciclo falhou:", error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

if (process.argv[1]?.endsWith("src/worker/index.ts")) {
  void startWorker();
}
