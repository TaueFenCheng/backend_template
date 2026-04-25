import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { QueueJobDto } from './dto/queue-job.dto';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  @ApiOperation({ summary: 'Add job to queue' })
  @ApiResponse({ status: 201, description: 'Job added successfully' })
  async addJob(@Body() dto: QueueJobDto) {
    const job = await this.queueService.addJob(dto);
    return { jobId: job.id, data: job.data };
  }
}