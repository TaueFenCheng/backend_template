# NestJS 高级特性集成设计

## 概述

集成 5 个 NestJS 高级特性：配置管理、日志系统、JWT认证、速率限制、健康检查。

## 分阶段实施

### 阶段 1：基础设施

#### 1. 配置管理 (@nestjs/config)

**目的：** 统一管理环境变量，支持验证和模块化。

**实现：**
- `src/config/app.config.ts` - 应用配置（端口、环境）
- `src/config/database.config.ts` - 数据库配置
- `src/config/redis.config.ts` - Redis 配置
- `src/config/jwt.config.ts` - JWT 配置
- `src/config/config.module.ts` - 配置模块

**环境变量：**
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
```

#### 2. 日志系统 (Pino)

**目的：** 结构化日志，请求追踪。

**实现：**
- `nestjs-pino` 模块
- `LoggerModule` 配置 JSON 格式日志
- 请求拦截器自动记录请求信息
- 日志级别：error, warn, info, debug

### 阶段 2：安全防护

#### 3. JWT 认证

**目的：** 用户注册登录，Token 保护路由。

**Prisma Schema 扩展：**
```prisma
model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique @db.VarChar(100)
  password String   @db.VarChar(255)
  name     String?  @db.VarChar(50)
  role     String   @default("user") @db.VarChar(20)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("users")
}
```

**实现：**
- `src/auth/auth.module.ts`
- `src/auth/auth.service.ts` - 注册、登录、密码加密(bcrypt)
- `src/auth/auth.controller.ts` - POST /auth/register, POST /auth/login
- `src/auth/jwt.strategy.ts` - JWT 验证策略
- `src/common/guards/jwt-auth.guard.ts` - 路由保护

**API：**
- `POST /auth/register` - 注册用户
- `POST /auth/login` - 登录获取 JWT
- `GET /auth/profile` - 获取当前用户信息（需认证）

#### 4. 速率限制 (@nestjs/throttler)

**目的：** 按 IP 限制请求频率，防止滥用。

**实现：**
- `ThrottlerModule` 全局配置
- 默认：100 次/分钟
- 返回 429 Too Many Requests
- 可通过装饰器自定义限制

### 阶段 3：监控运维

#### 5. 健康检查 (@nestjs/terminus)

**目的：** 提供 /health 端点监控服务状态。

**实现：**
- `src/health/health.module.ts`
- `src/health/health.controller.ts`
- 检查项：PostgreSQL、Redis、Memory

**API：**
- `GET /health` - 返回服务健康状态

**响应示例：**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

## 文件结构

```
src/
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── jwt.config.ts
│   └── config.module.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── jwt.strategy.ts
│   └── dto/
│       ├── register.dto.ts
│       └── login.dto.ts
├── common/
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   └── decorators/
│       └── current-user.decorator.ts
├── health/
│   ├── health.module.ts
│   ├── health.controller.ts
│   └── indicators/
│       ├── prisma.health.ts
│       └── redis.health.ts
├── prisma/
│   └── prisma.service.ts
├── queue/
├── app.module.ts
├── main.ts
```

## 依赖包

```json
{
  "@nestjs/config": "^3.x",
  "nestjs-pino": "^4.x",
  "pino-http": "^9.x",
  "@nestjs/jwt": "^10.x",
  "@nestjs/passport": "^10.x",
  "passport": "^0.7.x",
  "passport-jwt": "^4.x",
  "bcrypt": "^5.x",
  "@nestjs/throttler": "^6.x",
  "@nestjs/terminus": "^10.x"
}
```