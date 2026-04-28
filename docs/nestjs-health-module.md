# NestJS Health 模块集成指南

本模块基于 `@nestjs/terminus` 实现，用于服务健康检查，适用于 Kubernetes 探针场景。

## 安装依赖

```bash
pnpm add @nestjs/terminus
```

## 模块结构

```
src/health/
├── health.module.ts        # 模块定义
├── health.controller.ts    # 健康检查端点
└── indicators/
    ├── prisma.health.ts    # PostgreSQL 健康检查
    └── redis.health.ts     # Redis 健康检查
```

## 端点说明

| 路径 | 类型 | 检查内容 | 用途 |
|------|------|----------|------|
| `/health` | Liveness | 内存堆使用 (< 300MB) | Kubernetes livenessProbe |
| `/ready` | Readiness | 数据库 + Redis 连接 | Kubernetes readinessProbe |

## 自定义健康指示器

### Prisma 健康检查

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Prisma health check failed';
      return indicator.down({ message });
    }
  }
}
```

### Redis 健康检查

```typescript
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
```

## 控制器实现

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prisma.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
```

## 响应格式

Terminus 返回标准健康检查响应格式：

**健康状态 (200)**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

**不健康状态 (503)**
```json
{
  "status": "error",
  "error": {
    "database": { "status": "down", "message": "Connection refused" }
  }
}
```

## Kubernetes 配置示例

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## 参考资料

- [NestJS Terminus 官方文档](https://docs.nestjs.com/recipes/health-checks)
- [Kubernetes 探针配置](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/)