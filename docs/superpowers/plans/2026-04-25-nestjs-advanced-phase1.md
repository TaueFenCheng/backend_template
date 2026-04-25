# NestJS 高级特性集成 - 阶段 1：基础设施

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 集成配置管理 (@nestjs/config) 和日志系统 (Pino)，为后续功能提供基础设施。

**Architecture:** 使用 @nestjs/config 统一管理环境变量，使用 nestjs-pino 提供结构化日志，两者均作为全局模块配置。

**Tech Stack:** NestJS 11, @nestjs/config, nestjs-pino, pino-http

---

## 文件结构

```
src/
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── jwt.config.ts
│   ├── config.module.ts
│   └── config.validation.ts
├── common/
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   └── filters/
│       └── http-exception.filter.ts (修改)
```

---

### Task 1: 安装基础设施依赖

- [ ] **Step 1: 安装 @nestjs/config 和 nestjs-pino**

```bash
pnpm add @nestjs/config nestjs-pino pino-http pino-pretty
```

---

### Task 2: 创建配置验证 Schema

**Files:**
- Create: `src/config/config.validation.ts`

- [ ] **Step 1: 创建环境变量验证 Schema**

```typescript
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('7d'),
});
```

---

### Task 3: 创建各模块配置文件

**Files:**
- Create: `src/config/app.config.ts`
- Create: `src/config/database.config.ts`
- Create: `src/config/redis.config.ts`
- Create: `src/config/jwt.config.ts`

- [ ] **Step 1: 创建 app.config.ts**

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
});
```

- [ ] **Step 2: 创建 database.config.ts**

```typescript
export default () => ({
  url: process.env.DATABASE_URL,
});
```

- [ ] **Step 3: 创建 redis.config.ts**

```typescript
export default () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
});
```

- [ ] **Step 4: 创建 jwt.config.ts**

```typescript
export default () => ({
  secret: process.env.JWT_SECRET,
  expiration: process.env.JWT_EXPIRATION || '7d',
});
```

---

### Task 4: 创建 ConfigModule

**Files:**
- Create: `src/config/config.module.ts`

- [ ] **Step 1: 创建 ConfigModule**

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configValidationSchema } from './config.validation';
import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import jwtConfig from './jwt.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      validationSchema: configValidationSchema,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
```

---

### Task 5: 配置 Pino Logger

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 更新 main.ts 配置 Logger**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('BackendNestJS API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

---

### Task 6: 创建 Pino LoggerModule

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: 在 AppModule 中配置 LoggerModule**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { ConfigModule as AppConfigModule } from './config/config.module';

@Module({
  imports: [
    AppConfigModule,
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: 'SYS:standard',
          },
        },
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
    }),
    PrismaModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

### Task 7: 创建日志拦截器

**Files:**
- Create: `src/common/interceptors/logging.interceptor.ts`

- [ ] **Step 1: 创建 LoggingInterceptor**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.info(`${method} ${url} ${Date.now() - now}ms`);
      }),
    );
  }
}
```

---

### Task 8: 更新环境变量文件

**Files:**
- Modify: `.env`

- [ ] **Step 1: 添加新的环境变量**

```
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://tangjiaqiang@localhost:5432/backendnestjs?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=7d
```

---

### Task 9: 更新 PrismaService 使用配置

**Files:**
- Modify: `src/prisma/prisma.service.ts`

- [ ] **Step 1: 使用 ConfigService**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get<string>('database.url'),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

### Task 10: 更新 QueueModule 使用配置

**Files:**
- Modify: `src/queue/queue.module.ts`

- [ ] **Step 1: 使用 ConfigService 配置 Redis**

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { QueueController } from './queue.controller';

@Module({
  imports: [
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

### Task 11: 验证构建

- [ ] **Step 1: 构建项目**

Run: `pnpm run build`
Expected: 构建成功

- [ ] **Step 2: 启动服务**

Run: `pnpm start:dev`
Expected: 服务启动成功，日志格式变为 Pino JSON 格式

---

### Task 12: 提交代码

- [ ] **Step 1: 提交基础设施集成**

```bash
git add src/config/ src/common/ src/prisma/ src/queue/ src/main.ts src/app.module.ts .env package.json pnpm-lock.yaml
git commit -m "feat: add config management and pino logging system"
```