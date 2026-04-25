# Redis 消息队列集成设计

## 概述

使用 BullMQ 为 NestJS 项目集成 Redis 消息队列，搭建通用队列基础架构。

## 技术选型

- **BullMQ**: NestJS 官方推荐的 Redis 队列库
- **@nestjs/bullmq**: NestJS 官方集成包
- **Redis**: localhost:6379，无密码

## 文件结构

```
src/queue/
├── queue.module.ts        # 队列模块配置
├── queue.service.ts       # 队列生产者（发送任务）
├── queue.processor.ts     # 队列消费者（处理任务）
```

## 功能设计

### 生产者 (QueueService)
- `addJob(data)` 方法添加任务到队列

### 消费者 (QueueProcessor)
- 监听队列，处理任务
- 打印处理日志作为示例

### API 接口
- `POST /queue` 触发添加任务

## 配置

- Redis 连接：`localhost:6379`
- 队列名称：`form-queue`