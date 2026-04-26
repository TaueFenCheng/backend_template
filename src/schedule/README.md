# Schedule 定时任务模块

## 概述

本模块使用 `@nestjs/schedule` 实现定时任务功能，支持 Cron 表达式、固定间隔、延迟执行等多种定时方式。

## 目录结构

```
schedule/
├── schedule.module.ts      # 定时任务模块
├── schedule.service.ts     # 定时任务服务
├── schedule.controller.ts  # API 控制器（动态管理任务）
└── README.md               # 本文档
```

## 安装

```bash
pnpm add @nestjs/schedule
```

## 配置

### AppModule 配置

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),  // 启用定时任务模块
    ScheduleModule,            // 自定义模块
  ],
})
export class AppModule {}
```

---

## 核心装饰器

### @Cron - Cron 表达式定时

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

// 使用预定义常量
@Cron(CronExpression.EVERY_MINUTE)
handleEveryMinute() {
  // 每分钟执行
}

// 使用自定义表达式
@Cron('0 0 2 * * *')
handleDailyCleanup() {
  // 每天凌晨2点执行
}

// 带选项
@Cron(CronExpression.EVERY_HOUR, {
  name: 'hourlyTask',         // 任务名称
  timeZone: 'Asia/Shanghai',  // 时区
})
handleHourly() {
  // 每小时执行
}
```

### @Interval - 固定间隔执行

```typescript
import { Interval } from '@nestjs/schedule';

@Interval(30000)  // 每30秒执行
handleInterval() {
  // 固定间隔执行
}

@Interval(5000, { name: 'fastTask' })
handleFastInterval() {
  // 每5秒执行，带名称
}
```

### @Timeout - 延迟执行一次

```typescript
import { Timeout } from '@nestjs/schedule';

@Timeout(5000)  // 启动后5秒执行一次
handleStartup() {
  // 应用启动后执行一次
}

@Timeout(10000, { name: 'delayedTask' })
handleDelayed() {
  // 10秒后执行一次，带名称
}
```

---

## Cron 表达式格式

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─ 星期几 (0-7, 0和7都是周日)
│ │ │ │ └─── 月份 (1-12)
│ │ │ └───── 日期 (1-31)
│ │ └─────── 小时 (0-23)
│ └───────── 分钟 (0-59)
└─────────── 秒 (0-59, 可选)
```

### 常用表达式

| 表达式 | 说明 |
|--------|------|
| `* * * * * *` | 每秒 |
| `0 * * * * *` | 每分钟 |
| `0 0 * * * *` | 每小时 |
| `0 0 2 * * *` | 每天凌晨2点 |
| `0 0 8 * * 1` | 每周一早上8点 |
| `0 0 0 1 * *` | 每月1号零点 |
| `0 30 9 * * 1-5` | 工作日早上9:30 |

### NestJS 预定义常量

```typescript
CronExpression.EVERY_MINUTE        // 每分钟
CronExpression.EVERY_HOUR          // 每小时
CronExpression.EVERY_DAY_AT_1AM    // 每天凌晨1点
CronExpression.EVERY_WEEK          // 每周
CronExpression.EVERY_WEEKDAY       // 每个工作日
CronExpression.EVERY_WEEKEND       // 每个周末
CronExpression.EVERY_30_MINUTES    // 每30分钟
CronExpression.EVERY_10_SECONDS    // 每10秒
CronExpression.EVERY_5_MINUTES     // 每5分钟
CronExpression.MONDAY_TO_FRIDAY_AT // 工作日特定时间
```

---

## 项目已定义的任务

| 任务名称 | 类型 | 执行时间 | 说明 |
|----------|------|----------|------|
| `everyMinuteTask` | Cron | 每分钟 | 示例定时任务 |
| `everyHourTask` | Cron | 每小时 | 清理临时数据等 |
| `dailyCleanupTask` | Cron | 每天凌晨2点 | 清理过期数据 |
| `intervalTask` | Interval | 每30秒 | 固定间隔任务 |
| `startupTask` | Timeout | 启动后5秒 | 启动时执行一次 |

---

## SchedulerRegistry 动态管理

### 注入 SchedulerRegistry

```typescript
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ScheduleService {
  constructor(private schedulerRegistry: SchedulerRegistry) {}
}
```

### 获取任务

```typescript
// 获取 Cron 任务
const job = this.schedulerRegistry.getCronJob('myTask');

// 获取所有 Cron 任务
const jobs = this.schedulerRegistry.getCronJobs();

// 获取 Interval 任务列表
const intervals = this.schedulerRegistry.getIntervals();

// 获取 Timeout 任务列表
const timeouts = this.schedulerRegistry.getTimeouts();
```

### 动态添加任务

```typescript
addCronJob(name: string, expression: string) {
  const job = new CronJob(expression, () => {
    this.logger.log(`任务 ${name} 执行`);
  });
  
  this.schedulerRegistry.addCronJob(name, job);
  job.start();
}
```

### 控制任务

```typescript
// 启动任务
const job = this.schedulerRegistry.getCronJob(name);
job.start();

// 停止任务
job.stop();

// 删除任务
this.schedulerRegistry.deleteCronJob(name);

// 添加 Interval
this.schedulerRegistry.addInterval(name, callback, delay);

// 删除 Interval
this.schedulerRegistry.deleteInterval(name);
```

---

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/schedule/cron-jobs` | GET | 获取所有定时任务 |
| `/schedule/intervals` | GET | 获取所有间隔任务 |
| `/schedule/timeouts` | GET | 获取所有超时任务 |
| `/schedule/cron/:name` | POST | 动态添加定时任务 |
| `/schedule/cron/:name/start` | POST | 启动定时任务 |
| `/schedule/cron/:name/stop` | POST | 停止定时任务 |
| `/schedule/cron/:name` | DELETE | 删除定时任务 |

### 使用示例

```bash
# 获取所有定时任务
GET /schedule/cron-jobs

# 动态添加定时任务
POST /schedule/cron/myTask?expression=0 * * * * *

# 停止定时任务
POST /schedule/cron/everyMinuteTask/stop

# 启动定时任务
POST /schedule/cron/everyMinuteTask/start

# 删除定时任务
DELETE /schedule/cron/myTask
```

---

## 常见使用场景

| 场景 | 定时任务 | 建议 |
|------|----------|------|
| 清理过期数据 | 每天凌晨 | `@Cron('0 0 2 * * *')` |
| 发送提醒通知 | 每小时 | `@Cron(CronExpression.EVERY_HOUR)` |
| 数据统计报表 | 每天/每周 | `@Cron('0 0 8 * * 1')` |
| 健康检查 | 每5分钟 | `@Interval(300000)` |
| Token 刷新 | 每10分钟 | `@Interval(600000)` |
| 缓存预热 | 启动时 | `@Timeout(5000)` |

---

## 对比其他方案

| 特性 | @nestjs/schedule | BullMQ | 外部工具 |
|------|------------------|--------|----------|
| 复杂度 | 简单 | 中等 | 高 |
| 存储 | 内存 | Redis持久化 | 外部系统 |
|可靠性 | 重启丢失 | 持久化 | 高 |
| 分布式 | ❌ 不支持 | ✅ 支持 | ✅ 支持 |
| 动态管理 | ✅ 支持 | ✅ 支持 | ✅ 支持 |

### 选择建议

- **单服务定时任务** → `@nestjs/schedule`
- **重要任务/分布式** → `BullMQ`
- **复杂调度/跨服务** → 外部工具

---

## CronJob 属性和方法

```typescript
const job = this.schedulerRegistry.getCronJob('myTask');

// 属性
job.running          // 是否运行中
job.nextDate()       // 下次执行时间
job.lastDate()       // 上次执行时间

// 方法
job.start()          // 启动
job.stop()           // 停止
job.setTime(newTime) // 设置新时间
```

---

## 最佳实践

### 1. 任务命名

```typescript
@Cron(CronExpression.EVERY_HOUR, {
  name: 'cleanup-expired-tokens',  // 有意义的名称
})
handleCleanup() {}
```

### 2. 错误处理

```typescript
@Cron(CronExpression.EVERY_HOUR)
async handleTask() {
  try {
    await this.doSomething();
  } catch (error) {
    this.logger.error(`任务执行失败: ${error.message}`);
    // 可选择发送告警通知
  }
}
```

### 3. 避免重复执行

```typescript
private isRunning = false;

@Cron(CronExpression.EVERY_MINUTE)
async handleTask() {
  if (this.isRunning) {
    this.logger.warn('任务正在执行，跳过本次');
    return;
  }
  
  this.isRunning = true;
  try {
    await this.processTask();
  } finally {
    this.isRunning = false;
  }
}
```

### 4. 使用 Logger 记录

```typescript
private readonly logger = new Logger(ScheduleService.name);

@Cron(CronExpression.EVERY_HOUR)
handleHourly() {
  this.logger.log('开始执行定时任务');
  // ...
  this.logger.log('定时任务执行完成');
}
```

---

## NestJS 官方文档

- [Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling)

---

## 相关文件

- [schedule.module.ts](schedule.module.ts) - 模块配置
- [schedule.service.ts](schedule.service.ts) - 定时任务服务
- [schedule.controller.ts](schedule.controller.ts) - API 控制器
- [../app.module.ts](../app.module.ts) - AppModule 配置