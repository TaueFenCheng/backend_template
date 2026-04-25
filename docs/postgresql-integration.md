# PostgreSQL + Prisma 集成文档

## 概述

本项目使用 Prisma 作为 ORM，连接 PostgreSQL 数据库进行数据持久化。

## 技术选型

- **数据库**: PostgreSQL 18 (Homebrew 安装)
- **ORM**: Prisma 6.19.3
- **连接方式**: 本地连接 `localhost:5432`

## 安装

```bash
# 安装 Prisma
pnpm add prisma @prisma/client

# 初始化 Prisma
npx prisma init --datasource-provider postgresql
```

## 配置

### 环境变量 (.env)

```env
DATABASE_URL="postgresql://tangjiaqiang@localhost:5432/backendnestjs?schema=public"
```

> 注意: Homebrew 安装的 PostgreSQL 默认使用 trust 认证，用户名为系统用户名，无需密码。

### Prisma Schema (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Form {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(50)
  email     String   @db.VarChar(100)
  message   String   @db.VarChar(500)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("forms")
}
```

### 字段命名约定

- 数据库字段使用蛇形命名 (snake_case): `created_at`, `updated_at`
- Prisma 模型使用驼峰命名 (camelCase): `createdAt`, `updatedAt`
- 使用 `@map()` 映射两者
- 使用 `@@map()` 映射表名

## NestJS 集成

### PrismaService (src/prisma/prisma.service.ts)

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### PrismaModule (src/prisma/prisma.module.ts)

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 在 Service 中使用

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(createDto: CreateFormDto) {
    return this.prisma.form.create({
      data: {
        name: createDto.name,
        email: createDto.email,
        message: createDto.message,
      },
    });
  }

  async getAllForms() {
    return this.prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

## 常用命令

### 数据库迁移

```bash
# 创建并应用迁移
npx prisma migrate dev --name <migration-name>

# 应用生产迁移
npx prisma migrate deploy

# 查看迁移状态
npx prisma migrate status
```

### Prisma Studio (可视化工具)

```bash
npx prisma studio
```

### 重新生成 Client

```bash
npx prisma generate
```

## 数据库管理

### 创建数据库

```bash
# Homebrew PostgreSQL
createdb backendnestjs
```

### 查看数据库列表

```bash
psql -l
```

### 启动/停止 PostgreSQL 服务

```bash
# 启动
brew services start postgresql@18

# 停止
brew services stop postgresql@18

# 查看状态
brew services list
```

## 最佳实践

1. **使用 @Global() 装饰器** - PrismaModule 设为全局模块，避免重复导入
2. **生命周期管理** - 实现 `OnModuleInit` 和 `OnModuleDestroy` 自动连接/断开
3. **字段命名映射** - 数据库用 snake_case，代码用 camelCase，用 `@map()` 映射
4. **DTO 验证** - 使用 class-validator 验证输入，与 Prisma schema 保持一致
5. **响应类型** - 创建 ResponseDto，与 Prisma 模型类型匹配

## 问题排查

### 连接失败

1. 检查 PostgreSQL 服务是否运行: `brew services list`
2. 检查数据库是否存在: `psql -l`
3. 检查 .env 中的 DATABASE_URL 配置
4. Homebrew PostgreSQL 默认用户为系统用户名，不是 `postgres`

### Prisma Client 找不到

```bash
# 重新生成
npx prisma generate
```

### 迁移冲突

```bash
# 重置数据库（开发环境）
npx prisma migrate reset
```

## 版本说明

> **重要**: 本项目使用 Prisma 6.x，不使用 Prisma 7.x。
> Prisma 7.x 架构完全改变，需要 adapter 或 accelerateUrl 配置，
> 与标准 NestJS 集成不兼容。