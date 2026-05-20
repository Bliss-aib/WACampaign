import { Queue } from "bullmq";
import { redis } from "./redis";

export const campaignQueue = new Queue("campaign-queue", {
  connection: redis,
});

export async function scheduleCampaign(campaignId: string, scheduledAt: Date) {
  const delay = scheduledAt.getTime() - Date.now();
  await campaignQueue.add(
    "send-campaign",
    { campaignId },
    {
      jobId: campaignId,
      delay: Math.max(0, delay),
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}

export async function removeCampaignJob(campaignId: string) {
  const job = await campaignQueue.getJob(campaignId);
  if (job) {
    await job.remove();
  }
}
