# NestJS BullMQ 消息队列完整指南

## 目录

1. [概述](#概述)
2. [安装与配置](#安装与配置)
3. [核心概念](#核心概念)
4. [项目代码分析](#项目代码分析)
5. [Queue API 详细说明](#queue-api-详细说明)
6. [Job API 详细说明](#job-api-详细说明)
7. [Processor 进阶用法](#processor-进阶用法)
8. [事件监听](#事件监听)
9. [多队列管理](#多队列管理)
10. [高级特性](#高级特性)
11. [最佳实践](#最佳实践)
12. [常见场景示例](#常见场景示例)

---

## 概述

BullMQ 是基于 Redis 的高性能消息队列库，NestJS 通过 `@nestjs/bullmq` 提供了优雅的集成方式。

### 为什么使用消息队列？

| 问题 | 消息队列解决方案 |
|------|-----------------|
| 同步操作耗时过长 | 异步处理，快速响应用户 |
| 任务失败需要重试 | 自动重试机制 |
| 任务需要持久化 | Redis 存储，重启不丢失 |
| 需要任务进度追踪 | 进度更新和状态管理 |
| 分布式系统通信 | 跨服务任务分发 |

### BullMQ 特性

- ✅ 基于 Redis，数据持久化
- ✅ 自动重试机制
- ✅ 任务优先级
- ✅ 延迟任务
- ✅ 进度追踪
- ✅ 分布式支持
- ✅ 丰富的 API

---

## 安装与配置

### 1. 安装依赖

```bash
# NestJS BullMQ 模块
pnpm add @nestjs/bullmq

# BullMQ 核心库
pnpm add bullmq

# Redis 客户端（自动安装）
# ioredis 会作为 bullmq 的依赖自动安装
```

### 2. Redis 配置

```env
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=         # 可选
REDIS_DB=0              # 可选
```

### 3. 配置文件

```typescript
// src/config/redis.config.ts
export default () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
});
```

### 4. 模块配置

```typescript
// src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { QueueController } from './queue.controller';

@Module({
  imports: [
    // 全局 Redis 连接配置
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          // 其他 Redis 配置
          password: config.get<string>('redis.password'),
          db: config.get<number>('redis.db'),
        },
      }),
    }),
    
    // 注册队列
    BullModule.registerQueue({
      name: 'form-queue',        // 队列名称
    }),
    
    // 可以注册多个队列
    BullModule.registerQueue(
      { name: 'email-queue' },
      { name: 'report-queue' },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService, QueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}
```

### 5. 全局配置（AppModule）

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    QueueModule,
  ],
})
export class AppModule {}
```

---

## 核心概念

### 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NestJS Application                          │
│                                                                       │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐    │
│  │  Controller  │───────▶│ QueueService │───────▶│    Queue     │    │
│  │  (接收请求)   │        │   (生产者)    │        │  (任务队列)   │    │
│  └──────────────┘        └──────────────┘        └──────────────┘    │
│                                                           │          │
│                                                           ▼          │
│                                                   ┌──────────────┐    │
│                                                   │    Redis     │    │
│                                                   │   (存储任务)  │    │
│                                                   └──────────────┘    │
│                                                           │          │
│                                                           ▼          │
│                                                   ┌──────────────┐    │
│                                                   │QueueProcessor│    │
│                                                   │   (消费者)    │    │
│                                                   └──────────────┘    │
│                                                           │          │
│                                                           ▼          │
│                                                   ┌──────────────┐    │
│                                                   │   process()  │    │
│                                                   │  (处理任务)   │    │
│                                                   └──────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 三大角色

| 角色 | 组件 | 作用 | 关键类/装饰器 |
|------|------|------|--------------|
| 生产者 | QueueService | 创建并添加任务到队列 | `@InjectQueue()`, `Queue` |
| 消费者 | QueueProcessor | 处理队列中的任务 | `@Processor()`, `WorkerHost` |
| 存储者 | Redis | 持久化任务数据 | `connection` 配置 |

### 任务生命周期

```
1. waiting     → 等待处理
2. active      → 正在处理
3. completed   → 处理成功
4. failed      → 处理失败（可重试）
5. delayed     → 延迟任务（等待执行时间）
6. prioritized → 优先队列中的任务
```

---

## 项目代码分析

### 1. DTO 定义

```typescript
// src/queue/dto/queue-job.dto.ts
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

### 2. QueueService - 生产者

```typescript
// src/queue/queue.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  // 注入队列实例
  constructor(@InjectQueue('form-queue') private queue: Queue) {}

  // 添加任务到队列
  async addJob(data: any) {
    const job = await this.queue.add('process-form', data);
    return job;
  }
}
```

**解析：**
- `@InjectQueue('form-queue')` - 注入名为 'form-queue' 的队列
- `queue.add('process-form', data)` - 添加任务，'process-form' 是任务名称
- 返回 `Job` 对象，包含任务 ID 和元数据

### 3. QueueProcessor - 消费者

```typescript
// src/queue/queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('form-queue')               // 监听 'form-queue' 队列
export class QueueProcessor extends WorkerHost {
  
  async process(job: Job) {            // 自动调用的处理方法
    console.log(`Processing job ${job.id} with data:`, job.data);
    
    // 模拟耗时操作
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    console.log(`Job ${job.id} completed`);
    
    // 返回结果会存储到 job.returnvalue
    return { success: true, jobId: job.id };
  }
}
```

**解析：**
- `@Processor('form-queue')` - 注册为队列处理器
- `extends WorkerHost` - 继承 WorkerHost，实现 `process()` 方法
- `process(job)` - BullMQ 自动调用，无需手动调用
- 返回值存储在 `job.returnvalue` 中

### 4. QueueController - API 入口

```typescript
// src/queue/queue.controller.ts
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

## Queue API 详细说明

### Queue 实例获取

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MyService {
  constructor(@InjectQueue('my-queue') private queue: Queue) {}
}
```

### 添加任务

#### 基本添加

```typescript
// 最简单的添加
const job = await this.queue.add('task-name', data);

// 返回 Job 对象
console.log(job.id);      // 任务ID
console.log(job.name);    // 任务名称 'task-name'
console.log(job.data);    // 任务数据
```

#### 带选项添加

```typescript
const job = await this.queue.add('task-name', data, {
  // 基本选项
  jobId: 'custom-id-123',       // 自定义任务ID
  priority: 1,                  // 优先级（数字越小越高）
  delay: 5000,                  // 延迟5秒执行
  
  // 重试选项
  attempts: 3,                  // 失败后重试3次
  backoff: {
    type: 'exponential',        // 指数退避
    delay: 1000,                // 初始延迟1秒
  },
  
  // 清理选项
  removeOnComplete: true,       // 完成后删除
  removeOnComplete: {           // 完成后保留最近10个
    age: 3600,                  // 1小时后删除
    count: 10,                  // 保留最近10个
  },
  removeOnFail: false,          // 失败后保留
  
  // 其他选项
  lifo: true,                   // 后进先出（优先处理新任务）
  timeout: 30000,               // 超时30秒
  stackTraceLimit: 10,          // 错误堆栈深度
  
  // 重用选项
  repeat: {
    every: 60000,               // 每1分钟重复执行
    limit: 10,                  // 最多执行10次
  },
});
```

#### 批量添加任务

```typescript
// 添加多个任务
const jobs = await this.queue.addBulk([
  { name: 'task-1', data: { id: 1 } },
  { name: 'task-2', data: { id: 2 }, opts: { priority: 1 } },
  { name: 'task-3', data: { id: 3 }, opts: { delay: 5000 } },
]);

// 返回 Job 数组
jobs.forEach(job => console.log(job.id));
```

### 获取任务

```typescript
// 获取单个任务
const job = await this.queue.getJob('job-id');
if (job) {
  console.log(job.data);
}

// 获取多个任务
const jobs = await this.queue.getJobs(['waiting', 'active'], 0, 10);
```

### 获取任务列表

```typescript
// 获取等待中的任务
const waitingJobs = await this.queue.getWaiting(0, 100);

// 获取正在处理的任务
const activeJobs = await this.queue.getActive(0, 100);

// 获取已完成的任务
const completedJobs = await this.queue.getCompleted(0, 100);

// 获取失败的任务
const failedJobs = await this.queue.getFailed(0, 100);

// 获取延迟任务
const delayedJobs = await this.queue.getDelayed(0, 100);

// 获取优先任务
const prioritizedJobs = await this.queue.getPrioritized(0, 100);

// 参数：start 起始索引, end 结束索引
```

### 获取任务数量

```typescript
// 获取各状态任务数量
const counts = await this.queue.getJobCounts();

console.log(counts);
// {
//   waiting: 5,
//   active: 2,
//   completed: 100,
//   failed: 3,
//   delayed: 10,
//   prioritized: 0
// }

// 获取特定状态数量
const waitingCount = await this.queue.getWaitingCount();
const activeCount = await this.queue.getActiveCount();
const completedCount = await this.queue.getCompletedCount();
const failedCount = await this.queue.getFailedCount();
```

### 队列控制

```typescript
// 暂停队列
await this.queue.pause();

// 恢复队列
await this.queue.resume();

// 是否暂停
const isPaused = await this.queue.isPaused();

// 清空队列（删除所有任务）
await this.queue.empty();

// 检查队列是否为空
const isEmpty = await this.queue.isEmpty();

// 获取队列名称
const name = this.queue.name;

// 获取队列状态
const state = await this.queue.getState();
```

### 重复任务

```typescript
// 添加重复任务
const repeatableJob = await this.queue.add('daily-report', data, {
  repeat: {
    every: 86400000,              // 每24小时
    startDate: new Date(),        // 开始日期
    endDate: new Date('2025-12-31'), // 结束日期（可选）
    limit: 100,                   // 最多执行100次（可选）
    jobId: 'daily-report-001',    // 任务ID模式
  },
});

// 使用 Cron 表达式
const cronJob = await this.queue.add('hourly-check', data, {
  repeat: {
    pattern: '0 * * * *',         // 每小时执行
    tz: 'Asia/Shanghai',          // 时区
  },
});

// 获取所有重复任务
const repeatableJobs = await this.queue.getRepeatableJobs();

// 删除重复任务
await this.queue.removeRepeatable('hourly-check', {
  pattern: '0 * * * *',
});
```

---

## Job API 详细说明

### Job 对象结构

```typescript
interface Job<T = any, R = any, N = string> {
  // 基本信息
  id: string;                  // 任务唯一ID
  name: N;                     // 任务名称
  data: T;                     // 任务数据
  
  // 状态信息
  progress: number | object;   // 进度（0-100 或对象）
  returnvalue: R;              // 处理完成后返回值
  
  // 时间信息
  timestamp: number;           // 创建时间戳
  processedOn: number;         // 开始处理时间戳
  finishedOn: number;          // 完成时间戳
  
  // 错误信息
  stacktrace: string[];        // 错误堆栈
  failedReason: string;        // 失败原因
  
  // 选项
  opts: JobsOptions;           // 任务选项
  attemptsMade: number;        // 已重试次数
  
  // 方法
  updateProgress(progress): Promise<void>;
  update(data): Promise<void>;
  log(message): Promise<void>;
  moveToCompleted(returnValue): Promise<void>;
  moveToFailed(error): Promise<void>;
  retry(): Promise<void>;
  discard(): Promise<void>;
  getState(): Promise<string>;
}
```

### 进度更新

```typescript
async process(job: Job) {
  // 数字进度（百分比）
  await job.updateProgress(10);    // 10%
  await job.updateProgress(50);    // 50%
  await job.updateProgress(100);   // 100%

  // 对象进度（详细信息）
  await job.updateProgress({
    step: 'processing',
    processed: 100,
    total: 500,
    percentage: 20,
    message: '正在处理数据...',
  });
}
```

### 任务日志

```typescript
async process(job: Job) {
  // 记录处理日志
  await job.log('开始处理任务');
  await job.log(`处理数据: ${JSON.stringify(job.data)}`);
  await job.log('任务处理完成');
  
  // 获取日志
  const logs = await job.getLogs();
  console.log(logs);
  // ['开始处理任务', '处理数据: {...}', '任务处理完成']
}
```

### 更新任务数据

```typescript
async process(job: Job) {
  // 更新任务数据（在处理过程中）
  await job.update({
    ...job.data,
    updatedAt: new Date(),
  });
}
```

### 任务状态检查

```typescript
async process(job: Job) {
  // 获取当前状态
  const state = await job.getState();
  // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'prioritized'
  
  // 检查是否已完成
  if (state === 'completed') {
    console.log('任务已完成');
  }
}
```

### 手动控制任务状态

```typescript
async process(job: Job) {
  // 标记完成
  await job.moveToCompleted({ success: true });
  
  // 标记失败
  await job.moveToFailed(new Error('处理失败'));
  
  // 重试任务
  await job.retry();
  
  // 丢弃任务（不再处理）
  await job.discard();
}
```

---

## Processor 进阶用法

### 处理多种任务类型

```typescript
@Processor('multi-task-queue')
export class MultiTaskProcessor extends WorkerHost {
  async process(job: Job) {
    // 根据任务名称分发处理
    switch (job.name) {
      case 'send-email':
        return this.handleSendEmail(job);
      case 'generate-report':
        return this.handleGenerateReport(job);
      case 'cleanup-data':
        return this.handleCleanupData(job);
      default:
        throw new Error(`未知的任务类型: ${job.name}`);
    }
  }

  private async handleSendEmail(job: Job<EmailData>) {
    const { to, subject, body } = job.data;
    // 发送邮件逻辑...
    return { sent: true, to };
  }

  private async handleGenerateReport(job: Job<ReportData>) {
    const { type, dateRange } = job.data;
    // 生成报表逻辑...
    return { reportId: 'xxx', url: 'yyy' };
  }

  private async handleCleanupData(job: Job<CleanupData>) {
    const { daysOld } = job.data;
    // 清理数据逻辑...
    return { deletedCount: 100 };
  }
}
```

### Processor 配置选项

```typescript
@Processor('my-queue', {
  // Worker 配置
  concurrency: 5,              // 同时处理5个任务
  limiter: {
    max: 10,                   // 每分钟最多处理10个任务
    duration: 60000,           // 限制时间窗口（毫秒）
  },
  
  // Redis 连接（覆盖全局配置）
  connection: {
    host: 'localhost',
    port: 6379,
  },
  
  // 锁定配置
  lockDuration: 30000,         // 任务锁定时长
  lockRenewTime: 15000,        // 锁定续约时间
  
  // 其他配置
  autorun: true,               // 自动启动
})
export class MyProcessor extends WorkerHost {
  async process(job: Job) {
    // 处理逻辑
  }
}
```

### 多个 Processor 处理同一队列

```typescript
// 处理器1 - 处理邮件任务
@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  async process(job: Job) {
    // 只处理邮件相关任务
  }
}

// 处理器2 - 也处理邮件队列（负载均衡）
@Processor('email-queue')
export class EmailProcessor2 extends WorkerHost {
  async process(job: Job) {
    // 另一个处理器，分担任务
  }
}
```

### 使用 @OnQueueActive 等事件装饰器

```typescript
import { Processor, WorkerHost, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bullmq';

@Processor('event-queue')
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  async process(job: Job) {
    return { result: 'success' };
  }

  // 任务开始处理时触发
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`任务开始处理: ${job.id}`);
  }

  // 任务完成时触发
  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`任务完成: ${job.id}, 结果: ${JSON.stringify(result)}`);
  }

  // 任务失败时触发
  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`任务失败: ${job.id}, 错误: ${error.message}`);
  }
}
```

---

## 事件监听

### Queue 事件

```typescript
import { Queue } from 'bullmq';

@Injectable()
export class QueueEventService {
  constructor(@InjectQueue('my-queue') private queue: Queue) {
    // 监听队列事件
    this.setupQueueEvents();
  }

  private setupQueueEvents() {
    // 任务等待中
    this.queue.on('waiting', (jobId) => {
      console.log(`任务 ${jobId} 进入等待状态`);
    });

    // 任务开始处理
    this.queue.on('active', (job) => {
      console.log(`任务 ${job.id} 开始处理`);
    });

    // 任务完成
    this.queue.on('completed', (job, result) => {
      console.log(`任务 ${job.id} 完成，结果: ${result}`);
    });

    // 任务失败
    this.queue.on('failed', (job, error) => {
      console.error(`任务 ${job.id} 失败: ${error.message}`);
    });

    // 任务进度更新
    this.queue.on('progress', (job, progress) => {
      console.log(`任务 ${job.id} 进度: ${progress}`);
    });

    // 任务被删除
    this.queue.on('removed', (job) => {
      console.log(`任务 ${job.id} 已删除`);
    });

    // 队列暂停
    this.queue.on('paused', () => {
      console.log('队列已暂停');
    });

    // 队列恢复
    this.queue.on('resumed', () => {
      console.log('队列已恢复');
    });

    // 错误事件
    this.queue.on('error', (error) => {
      console.error('队列错误:', error);
    });
  }
}
```

### Processor 事件装饰器

```typescript
import { 
  OnQueueActive, 
  OnQueueCompleted, 
  OnQueueFailed,
  OnQueuePaused,
  OnQueueResumed,
  OnQueueCleaned,
  OnQueueDrained,
  OnQueueError,
} from '@nestjs/bullmq';

@Processor('event-queue')
export class EventQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EventQueueProcessor.name);

  async process(job: Job) {
    // 处理逻辑
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`开始处理: ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`完成: ${job.id}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`失败: ${job.id} - ${error.message}`);
  }

  @OnQueuePaused()
  onPaused() {
    this.logger.log('队列已暂停');
  }

  @OnQueueResumed()
  onResumed() {
    this.logger.log('队列已恢复');
  }

  @OnQueueDrained()
  onDrained() {
    this.logger.log('队列已清空');
  }
}
```

---

## 多队列管理

### 注册多个队列

```typescript
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'email-queue' },
      { name: 'report-queue' },
      { name: 'notification-queue' },
    ),
  ],
  providers: [
    EmailQueueService,
    ReportQueueService,
    NotificationQueueService,
  ],
})
export class QueueModule {}
```

### 服务注入多个队列

```typescript
@Injectable()
export class MultiQueueService {
  constructor(
    @InjectQueue('email-queue') private emailQueue: Queue,
    @InjectQueue('report-queue') private reportQueue: Queue,
    @InjectQueue('notification-queue') private notificationQueue: Queue,
  ) {}

  async sendEmail(data: EmailData) {
    return this.emailQueue.add('send', data);
  }

  async generateReport(data: ReportData) {
    return this.reportQueue.add('generate', data);
  }

  async sendNotification(data: NotificationData) {
    return this.notificationQueue.add('notify', data);
  }
}
```

### 多个 Processor

```typescript
@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  async process(job: Job) {
    // 处理邮件
  }
}

@Processor('report-queue')
export class ReportProcessor extends WorkerHost {
  async process(job: Job) {
    // 处理报表
  }
}

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  async process(job: Job) {
    // 处理通知
  }
}
```

---

## 高级特性

### 延迟任务

```typescript
// 5秒后执行
await this.queue.add('delayed-task', data, {
  delay: 5000,
});

// 1小时后执行
await this.queue.add('hourly-task', data, {
  delay: 3600000,
});
```

### 优先级任务

```typescript
// 添加高优先级任务
await this.queue.add('urgent', data, {
  priority: 1,    // 最高优先级
});

// 添加低优先级任务
await this.queue.add('normal', data, {
  priority: 10,   // 较低优先级
});

// 优先级规则：数字越小优先级越高
```

### 重试策略

```typescript
// 固定间隔重试
await this.queue.add('retry-task', data, {
  attempts: 5,
  backoff: 2000,        // 每次重试间隔2秒
});

// 指数退避重试
await this.queue.add('retry-task', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000,        // 初始延迟1秒，之后指数增长
  },
});

// 在 process 中获取重试信息
async process(job: Job) {
  console.log(`已重试次数: ${job.attemptsMade}`);
  console.log(`最大重试次数: ${job.opts.attempts}`);
}
```

### 任务超时

```typescript
await this.queue.add('timeout-task', data, {
  timeout: 30000,       // 30秒超时
});

// process 中处理超时
async process(job: Job) {
  try {
    // 使用 AbortController 控制超时
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const result = await fetchWithAbort(url, { signal: controller.signal });
    clearTimeout(timeout);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('任务超时');
    }
    throw error;
  }
}
```

### 任务去重

```typescript
// 使用相同 jobId 去重
await this.queue.add('unique-task', data, {
  jobId: 'unique-id-123',     // 相同 jobId 不会重复添加
});

// 检查任务是否存在
const existingJob = await this.queue.getJob('unique-id-123');
if (!existingJob) {
  await this.queue.add('unique-task', data, { jobId: 'unique-id-123' });
}
```

### 批量处理与流控

```typescript
// 控制处理速率
@Processor('rate-limited-queue', {
  limiter: {
    max: 100,              // 每分钟最多处理100个
    duration: 60000,       // 时间窗口60秒
  },
})
export class RateLimitedProcessor extends WorkerHost {
  async process(job: Job) {
    // 处理逻辑
  }
}

// 并发处理
@Processor('concurrent-queue', {
  concurrency: 10,         // 同时处理10个任务
})
export class ConcurrentProcessor extends WorkerHost {
  async process(job: Job) {
    // 处理逻辑
  }
}
```

### 嵌套队列（任务链）

```typescript
@Injectable()
export class PipelineService {
  constructor(
    @InjectQueue('step1-queue') private step1Queue: Queue,
    @InjectQueue('step2-queue') private step2Queue: Queue,
    @InjectQueue('step3-queue') private step3Queue: Queue,
  ) {}

  async startPipeline(data: any) {
    // 第一步
    const job1 = await this.step1Queue.add('process', data);
    
    // 在 Processor 完成后添加第二步任务
    // 或者手动添加
  }
}

// Processor 中触发下一步
@Processor('step1-queue')
export class Step1Processor extends WorkerHost {
  constructor(@InjectQueue('step2-queue') private step2Queue: Queue) {}

  async process(job: Job) {
    const result = await this.processStep1(job.data);
    
    // 触发下一步
    await this.step2Queue.add('process', {
      ...job.data,
      step1Result: result,
    });
    
    return result;
  }
}
```

---

## 最佳实践

### 1. DTO 验证

```typescript
// dto/send-email.dto.ts
export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @MaxLength(100)
  subject: string;

  @IsString()
  @MaxLength(5000)
  body: string;
}

// queue.service.ts
async sendEmail(dto: SendEmailDto) {
  // DTO 已验证，直接使用
  return this.queue.add('send-email', dto);
}
```

### 2. 错误处理

```typescript
async process(job: Job) {
  try {
    const result = await this.handleTask(job.data);
    
    // 记录成功日志
    await job.log('任务成功完成');
    
    return result;
  } catch (error) {
    // 记录失败原因
    await job.log(`错误: ${error.message}`);
    
    // 根据错误类型决定是否重试
    if (this.isRetryableError(error)) {
      throw error;  // 抛出错误，触发重试
    } else {
      // 不可重试的错误，标记失败
      await job.moveToFailed(error, true);
      return { error: error.message };
    }
  }
}

private isRetryableError(error: Error): boolean {
  // 网络错误、超时等可重试
  return error.message.includes('timeout') ||
         error.message.includes('connection');
}
```

### 3. 进度报告

```typescript
async process(job: Job<BatchData>) {
  const { items } = job.data;
  const total = items.length;
  
  for (let i = 0; i < total; i++) {
    // 处理单个项目
    await this.processItem(items[i]);
    
    // 更新进度
    await job.updateProgress({
      processed: i + 1,
      total,
      percentage: Math.round((i + 1) / total * 100),
      currentItem: items[i].id,
    });
    
    // 记录日志
    await job.log(`已处理 ${i + 1}/${total}`);
  }
  
  return { processed: total };
}
```

### 4. 任务幂等性

```typescript
// 确保任务可以安全重复执行
async process(job: Job) {
  const { orderId } = job.data;
  
  // 检查是否已处理
  const existing = await this.checkProcessed(orderId);
  if (existing) {
    await job.log('任务已处理，跳过');
    return { skipped: true };
  }
  
  // 处理任务
  const result = await this.processOrder(orderId);
  
  // 标记已处理
  await this.markProcessed(orderId);
  
  return result;
}
```

### 5. 监控和健康检查

```typescript
@Injectable()
export class QueueMonitorService {
  constructor(@InjectQueue('main-queue') private queue: Queue) {}

  async getHealthStatus() {
    const counts = await this.queue.getJobCounts();
    const isPaused = await this.queue.isPaused();
    
    return {
      queueName: this.queue.name,
      status: isPaused ? 'paused' : 'active',
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      health: counts.failed > 100 ? 'degraded' : 'healthy',
    };
  }

  async alertOnHighFailure() {
    const counts = await this.queue.getJobCounts();
    if (counts.failed > 50) {
      // 发送告警
      await this.sendAlert(`队列失败任务过多: ${counts.failed}`);
    }
  }
}
```

---

## 常见场景示例

### 1. 邮件发送队列

```typescript
// dto/email.dto.ts
export class SendEmailDto {
  @IsEmail() to: string;
  @IsString() subject: string;
  @IsString() body: string;
  @IsOptional() @IsString() template?: string;
}

// email-queue.service.ts
@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue('email-queue') private queue: Queue) {}

  async sendEmail(dto: SendEmailDto) {
    return this.queue.add('send', dto, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });
  }

  async sendBulkEmails(recipients: string[], content: string) {
    return this.queue.addBulk(
      recipients.map(to => ({
        name: 'send',
        data: { to, subject: 'Bulk Email', body: content },
      }))
    );
  }
}

// email.processor.ts
@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  constructor(private emailService: EmailService) {}

  async process(job: Job<SendEmailDto>) {
    await job.updateProgress(10);
    
    const result = await this.emailService.send(job.data);
    
    await job.updateProgress(100);
    await job.log(`邮件发送成功: ${job.data.to}`);
    
    return result;
  }
}
```

### 2. 报表生成队列

```typescript
// report-queue.service.ts
@Injectable()
export class ReportQueueService {
  constructor(@InjectQueue('report-queue') private queue: Queue) {}

  async generateReport(params: ReportParams) {
    return this.queue.add('generate', params, {
      priority: params.urgent ? 1 : 10,
      timeout: 60000,  // 1分钟超时
    });
  }
}

// report.processor.ts
@Processor('report-queue', {
  concurrency: 3,  // 同时生成3个报表
})
export class ReportProcessor extends WorkerHost {
  async process(job: Job<ReportParams>) {
    await job.updateProgress({ step: 'querying', percentage: 10 });
    
    // 查询数据
    const data = await this.fetchData(job.data);
    await job.updateProgress({ step: 'processing', percentage: 50 });
    
    // 处理数据
    const processed = await this.processData(data);
    await job.updateProgress({ step: 'generating', percentage: 80 });
    
    // 生成报表
    const report = await this.generatePdf(processed);
    await job.updateProgress({ step: 'completed', percentage: 100 });
    
    // 存储报表URL
    return { reportId: report.id, url: report.url };
  }
}
```

### 3. 图片处理队列

```typescript
// image-queue.service.ts
@Injectable()
export class ImageQueueService {
  constructor(@InjectQueue('image-queue') private queue: Queue) {}

  async processImage(imageId: string) {
    return this.queue.add('process', { imageId }, {
      attempts: 2,
      timeout: 30000,
    });
  }

  async batchProcess(imageIds: string[]) {
    return this.queue.addBulk(
      imageIds.map(id => ({ name: 'process', data: { imageId: id } }))
    );
  }
}

// image.processor.ts
@Processor('image-queue')
export class ImageProcessor extends WorkerHost {
  async process(job: Job) {
    const { imageId } = job.data;
    
    // 下载图片
    await job.updateProgress(20);
    const image = await this.downloadImage(imageId);
    
    // 生成缩略图
    await job.updateProgress(40);
    const thumbnail = await this.createThumbnail(image);
    
    // 压缩图片
    await job.updateProgress(60);
    const compressed = await this.compressImage(image);
    
    // 上传结果
    await job.updateProgress(80);
    await this.uploadResults(imageId, thumbnail, compressed);
    
    await job.updateProgress(100);
    return { thumbnailUrl: thumbnail.url, compressedUrl: compressed.url };
  }
}
```

### 4. 数据清理队列

```typescript
// cleanup-queue.service.ts
@Injectable()
export class CleanupQueueService {
  constructor(@InjectQueue('cleanup-queue') private queue: Queue) {}

  async scheduleDailyCleanup() {
    // 每天凌晨2点执行
    return this.queue.add('cleanup', { type: 'daily' }, {
      repeat: { pattern: '0 0 2 * * *' },
      removeOnComplete: { age: 7 * 24 * 3600 },  // 保留7天
    });
  }

  async cleanupOldData(daysOld: number = 30) {
    return this.queue.add('cleanup', { daysOld }, {
      priority: 5,
      attempts: 3,
    });
  }
}

// cleanup.processor.ts
@Processor('cleanup-queue')
export class CleanupProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {}

  async process(job: Job<CleanupData>) {
    const { daysOld, type } = job.data;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 3600 * 1000);
    
    await job.updateProgress(10);
    
    // 清理临时文件
    const filesCount = await this.cleanupFiles(cutoffDate);
    await job.updateProgress(40);
    await job.log(`清理了 ${filesCount} 个临时文件`);
    
    // 清理旧数据
    const dataCount = await this.prisma.tempData.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });
    await job.updateProgress(80);
    await job.log(`清理了 ${dataCount.count} 条旧数据`);
    
    // 清理日志
    const logsCount = await this.cleanupLogs(cutoffDate);
    await job.updateProgress(100);
    
    return {
      filesDeleted: filesCount,
      dataDeleted: dataCount.count,
      logsDeleted: logsCount,
      executedAt: new Date(),
    };
  }
}
```

---

## 项目扩展建议

基于当前项目代码，建议扩展：

### 1. 扩展 QueueService

```typescript
@Injectable()
export class QueueService {
  constructor(@InjectQueue('form-queue') private queue: Queue) {}

  // 基本添加（已有）
  async addJob(data: any) {
    return this.queue.add('process-form', data);
  }

  // 扩展：带选项添加
  async addJobWithOptions(data: any, options: JobsOptions) {
    return this.queue.add('process-form', data, options);
  }

  // 扩展：获取任务状态
  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    
    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  // 扩展：获取队列统计
  async getQueueStats() {
    return {
      counts: await this.queue.getJobCounts(),
      isPaused: await this.queue.isPaused(),
    };
  }

  // 扩展：批量添加
  async addBulkJobs(datas: any[]) {
    return this.queue.addBulk(
      datas.map(data => ({ name: 'process-form', data }))
    );
  }
}
```

### 2. 扩展 Controller

```typescript
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  // 已有：添加任务
  @Post()
  async addJob(@Body() dto: QueueJobDto) {
    const job = await this.queueService.addJob(dto);
    return { jobId: job.id, data: job.data };
  }

  // 扩展：获取任务状态
  @Get(':id')
  async getJobStatus(@Param('id') id: string) {
    const status = await this.queueService.getJobStatus(id);
    if (!status) {
      throw new NotFoundException('任务不存在');
    }
    return status;
  }

  // 扩展：获取队列统计
  @Get('stats')
  async getStats() {
    return this.queueService.getQueueStats();
  }
}
```

---

## NestJS 官方文档链接

- [NestJS Queues Documentation](https://docs.nestjs.com/techniques/queues)
- [BullMQ 官方文档](https://docs.bullmq.io)
- [BullMQ GitHub](https://github.com/taskforcesh/bullmq)

---

## 相关项目文件

- [queue.module.ts](queue.module.ts) - 模块配置
- [queue.service.ts](queue.service.ts) - 任务生产者
- [queue.processor.ts](queue.processor.ts) - 任务消费者
- [queue.controller.ts](queue.controller.ts) - API 控制器
- [dto/queue-job.dto.ts](dto/queue-job.dto.ts) - 任务 DTO
- [../config/redis.config.ts](../config/redis.config.ts) - Redis 配置