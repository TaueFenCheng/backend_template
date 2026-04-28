import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly queueService: QueueService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const response = await this.queueService.ping();
      if (response === 'PONG') {
        return indicator.up();
      }

      return indicator.down({ message: `Unexpected redis ping response: ${response}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redis health check failed';
      return indicator.down({ message });
    }
  }
}
