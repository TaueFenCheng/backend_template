import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(@InjectQueue('form-queue') private queue: Queue) {}

  async addJob(data: any) {
    const job = await this.queue.add('process-form', data);
    return job;
  }
}