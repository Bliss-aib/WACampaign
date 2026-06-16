import { Queue } from "bullmq";
import { getRedis } from "./redis";

let _campaignQueue: Queue | null = null;

function getCampaignQueue(): Queue {
  if (!_campaignQueue) {
    _campaignQueue = new Queue("campaign-queue", {
      connection: getRedis(),
    });
  }
  return _campaignQueue;
}

export async function scheduleCampaign(campaignId: string, scheduledAt: Date) {
  const campaignQueue = getCampaignQueue();
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
  const campaignQueue = getCampaignQueue();
  const job = await campaignQueue.getJob(campaignId);
  if (job) {
    await job.remove();
  }
}

/**
 * FEATURE: queue a campaign to be sent immediately (no delay).
 * Used by the "Start campaign now" button.
 */
export async function startCampaignNow(campaignId: string) {
  const campaignQueue = getCampaignQueue();
  await campaignQueue.add(
    "send-campaign",
    { campaignId },
    {
      jobId: campaignId,
      delay: 0,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}
