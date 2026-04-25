# Redis 消息队列集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 BullMQ 为 NestJS 项目集成 Redis 消息队列，搭建通用队列基础架构。

**Architecture:** 使用 @nestjs/bullmq 官方集成包，创建队列模块、生产者服务和消费者处理器，提供 POST /queue API 触发任务。

**Tech Stack:** NestJS 11, BullMQ, @nestjs/bullmq, Redis

---

## 文件结构

```
src/queue/
├── queue.module.ts        # 队列模块配置
├── queue.service.ts       # 队列生产者
├── queue.processor.ts     # 队列消费者
├── queue.controller.ts    # API 接口
├── dto/
│   └── queue-job.dto.ts   # 任务数据 DTO
```

---

### Task 1: 安装 BullMQ 依赖

- [ ] **Step 1: 安装 @nestjs/bullmq 和 bullmq**

```bash
pnpm add @nestjs/bullmq bullmq
```

---

### Task 2: 创建队列模块

**Files:**
- Create: `src/queue/queue.module.ts`

- [ ] **Step 1: 创建 QueueModule**

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { QueueController } from './queue.controller';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'form-queue',
    }),
  ],
  controllers: [QueueController],
  providers: [QueueService, QueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}
```

---

### Task 3: 创建队列服务（生产者）

**Files:**
- Create: `src/queue/queue.service.ts`

- [ ] **Step 1: 创建 QueueService**

```typescript
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
```

---

### Task 4: 创建队列处理器（消费者）

**Files:**
- Create: `src/queue/queue.processor.ts`

- [ ] **Step 1: 创建 QueueProcessor**

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('form-queue')
export class QueueProcessor extends WorkerHost {
  async process(job: Job) {
    console.log(`Processing job ${job.id} with data:`, job.data);
    // 模拟处理逻辑
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`Job ${job.id} completed`);
    return { success: true, jobId: job.id };
  }
}
```

---

### Task 5: 创建任务 DTO

**Files:**
- Create: `src/queue/dto/queue-job.dto.ts`

- [ ] **Step 1: 创建 QueueJobDto**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class QueueJobDto {
  @ApiProperty({ example: 'John Doe', description: '用户名称' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: '用户邮箱' })
  email: string;

  @ApiProperty({ example: 'Hello World', description: '消息内容' })
  message: string;
}
```

---

### Task 6: 创建队列控制器

**Files:**
- Create: `src/queue/queue.controller.ts`

- [ ] **Step 1: 创建 QueueController**

```typescript
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
```

---

### Task 7: 注册队列模块到 AppModule

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: 导入 QueueModule**

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

### Task 8: 验证构建并启动服务

- [ ] **Step 1: 构建项目**

Run: `pnpm run build`
Expected: 构建成功，无错误

- [ ] **Step 2: 启动服务验证**

Run: `pnpm start:dev`
Expected: 服务启动成功，连接 Redis

---

### Task 9: 提交代码

- [ ] **Step 1: 提交 Redis 消息队列集成**

```bash
git add src/queue/ src/app.module.ts package.json pnpm-lock.yaml docs/
git commit -m "feat: integrate Redis queue with BullMQ"
```