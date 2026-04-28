import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('form-queue')
export class QueueProcessor extends WorkerHost {
  async process(job: Job) {
    console.log(`Processing job ${job.id} with data:`, job.data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`Job ${job.id} completed`);
    return { success: true, jobId: job.id };
  }
}
