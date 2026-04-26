# BullMQ 消息队列

## 概述

本项目使用 BullMQ + Redis 实现消息队列，用于异步任务处理。

## 架构组成

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Controller  │────▶│ QueueService│────▶│    Redis    │
│             │     │  (生产者)    │     │   (存储)    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │QueueProcessor│
                                        │  (消费者)    │
                                        └─────────────┘
```

## 目录结构

```
queue/
├── dto/
│   └── queue-job.dto.ts  # 任务数据 DTO
├── queue.module.ts      # BullMQ 模块配置
├── queue.service.ts     # 任务生产者
├── queue.processor.ts   # 任务消费者
├── queue.controller.ts  # API 控制器
└── README.md            # 本文档
```

## 核心组件

### 1. QueueModule - 模块配置

配置 Redis 连接和队列注册：

```typescript
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
        },
      }),
    }),
    // 注册队列
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

### 2. QueueJobDto - 任务数据定义

```typescript
export class QueueJobDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'Hello World' })
  message: string;
}
```

### 3. QueueService - 任务生产者

```typescript
@Injectable()
export class QueueService {
  constructor(@InjectQueue('form-queue') private queue: Queue) {}

  async addJob(data: any) {
    // 添加任务到 Redis 队列
    const job = await this.queue.add('process-form', data);
    return job;
  }
}
```

### 4. QueueProcessor - 任务消费者

```typescript
@Processor('form-queue')
export class QueueProcessor extends WorkerHost {
  async process(job: Job) {
    // BullMQ 自动调用此方法！
    console.log(`Processing job ${job.id} with data:`, job.data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`Job ${job.id} completed`);
    return { success: true, jobId: job.id };
  }
}
```

**重要：`process()` 方法由 BullMQ Worker 自动调用，无需手动调用。**

## 工作流程

```
1. POST /queue请求
   ↓
2. QueueController.addJob() 接收请求
   ↓
3. QueueService.addJob() 添加任务到队列
   ↓
4. BullMQ 将任务存入 Redis
   ↓
5. QueueProcessor Worker 监听队列（自动运行）
   ↓
6. process(job) 自动被调用处理任务
   ↓
7. 任务完成，标记为 completed
```

## process() 方法调用机制

| 组件 | 调用方式 | 说明 |
|------|----------|------|
| `QueueService.addJob()` | **手动调用** | Controller/Service 中调用 |
| `QueueProcessor.process()` | **自动调用** | BullMQ Worker 自动触发 |

**调用时机：**
- 任务添加到队列后立即触发
- 任务重试时再次触发
- Worker 启动后持续监听队列

## API 使用

### 添加队列任务

```bash
POST /queue
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello World"
}
```

### 响应

```json
{
  "code": 0,
  "data": {
    "jobId": "1",
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "message": "Hello World"
    }
  },
  "message": "success"
}
```

## Queue 常用方法

| 方法 | 作用 | 示例 |
|------|------|------|
| `add(name, data)` | 添加任务 | `queue.add('job', data)` |
| `add(name, data, options)` | 添加任务带选项 | `queue.add('job', data, { delay: 5000 })` |
| `getJob(id)` | 获取任务 | `queue.getJob('1')` |
| `getWaiting()` | 获取等待中的任务 | `queue.getWaiting()` |
| `getActive()` | 获取正在处理的任务 | `queue.getActive()` |
| `getCompleted()` | 获取已完成的任务 | `queue.getCompleted()` |
| `getFailed()` | 获取失败的任务 | `queue.getFailed()` |
| `pause()` | 暂停队列 | `queue.pause()` |
| `resume()` | 恢复队列 | `queue.resume()` |
| `empty()` | 清空队列 | `queue.empty()` |

## Job 选项

```typescript
await this.queue.add('process-form', data, {
  delay: 5000,           // 延迟5秒执行
  attempts: 3,           // 失败后重试3次
  backoff: 2000,         // 重试间隔2秒
  priority: 1,           // 优先级（数字越小优先级越高）
  removeOnComplete: true, // 完成后自动删除
  removeOnFail: false,   // 失败后不删除（便于排查）
  lifo: true,            // 后进先出
});
```

## Job 属性

```typescript
interface Job {
  id: string;            // 任务ID
  name: string;          // 任务名称
  data: any;             // 任务数据
  opts: JobOptions;      // 任务选项
  progress: number;      // 进度（0-100）
  returnvalue: any;      // 返回值
  stacktrace: string[];  // 错误堆栈
  timestamp: number;     // 创建时间
  processedOn: number;   // 处理时间
  finishedOn: number;    // 完成时间
}
```

## Processor 进阶用法

### 处理多个任务类型（示例）

```typescript
@Processor('form-queue')
export class QueueProcessor extends WorkerHost {
  async process(job: Job) {
    switch (job.name) {
      case 'process-form':
        return this.processForm(job.data);
      case 'send-email':
        return this.sendEmail(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async processForm(data: QueueJobDto) {
    // 处理表单数据
    console.log(`处理表单: ${data.name}, ${data.email}`);
  }

  private async sendEmail(data: any) {
    // 发送邮件逻辑
  }
}
```

### 进度更新

```typescript
async process(job: Job) {
  job.updateProgress(10);  // 更新进度
  // ... 处理步骤1
  
  job.updateProgress(50);
  // ... 处理步骤2
  
  job.updateProgress(100);
  // ... 完成
}
```

### 错误处理

```typescript
@Processor('form-queue')
export class QueueProcessor extends WorkerHost {
  async process(job: Job) {
    try {
      // 处理任务
      return { success: true };
    } catch (error) {
      // 记录错误日志
      job.log(`Error: ${error.message}`);
      // 抛出错误，任务会自动重试（如果配置了 attempts）
      throw error;
    }
  }
}
```

## Redis 配置

### 环境变量

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 配置文件

```typescript
// src/config/redis.config.ts
export default () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});
```

### Redis 连接选项

```typescript
connection: {
  host: 'localhost',
  port: 6379,
  password: 'xxx',        // 密码（如有）
  db: 0,                  // 数据库编号
  tls: {},                // TLS 配置（生产环境）
}
```

## BullMQ vs EventEmitter 对比

| 特性 | BullMQ (Redis) | EventEmitter |
|------|----------------|--------------|
| 存储 | Redis 持久化 | 内存（进程内） |
| 可靠性 | 高，重启不丢失 | 低，重启丢失 |
| 跨服务 | ✅ 支持 | ❌ 不支持 |
| 任务管理 | ✅ 状态、进度、重试 | ❌ 无 |
| 复杂度 | 需要 Redis | 简单 |
| 适用场景 | 重要任务、跨服务 | 模块解耦 |

## 选择建议

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 发送邮件 | BullMQ | 重要任务，需要可靠性 |
| 数据处理 | BullMQ | 可能耗时，需要异步 |
| 报表生成 | BullMQ | 大任务，需要进度跟踪 |
| 模块解耦 | EventEmitter | 简单通知，不需要持久化 |
| 日志记录 | EventEmitter | 快速、轻量 |

## 常见使用场景

| 场景 | 任务名称 | 处理内容 |
|------|----------|----------|
| 发送邮件 | `send-email` | SMTP 发送邮件 |
| 处理图片 | `process-image` | 缩略图生成、压缩 |
| 生成报表 | `generate-report` | PDF/Excel 生成 |
| 数据同步 | `sync-data` | 跨服务数据同步 |
| 批量处理 | `batch-process` | 批量数据处理 |

## 监控和调试

### 查看队列状态

```typescript
// 获取队列统计
const counts = await queue.getJobCounts();
console.log(counts);
// { waiting: 5, active: 2, completed: 100, failed: 3 }

// 查看特定任务
const job = await queue.getJob('1');
console.log(job.progress);  // 进度
console.log(job.state);     // 状态
```

### Bull Board（可视化监控）

安装依赖：

```bash
pnpm add @bull-board/express @bull-board/api
```

## NestJS 官方文档

- [BullMQ Module](https://docs.nestjs.com/techniques/queues)
- [BullMQ 官方文档](https://docs.bullmq.io)

## 相关文件

- [queue.module.ts](queue.module.ts) - 模块配置
- [queue.service.ts](queue.service.ts) - 任务生产者
- [queue.processor.ts](queue.processor.ts) - 任务消费者
- [queue.controller.ts](queue.controller.ts) - API 控制器
- [dto/queue-job.dto.ts](dto/queue-job.dto.ts) - 任务 DTO
- [../config/redis.config.ts](../config/redis.config.ts) - Redis 配置