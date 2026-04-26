<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">NestJS Backend 项目 - 集成多种高级功能的完整后端模板</p>

## 项目特性

- **Swagger API 文档** - 自动生成 API 文档，访问 `/docs`
- **DTO 验证** - 使用 class-validator 进行请求验证
- **全局响应包装** - 统一响应格式 `{ code, data, message, details }`
- **Prisma ORM** - PostgreSQL 数据库集成
- **BullMQ 消息队列** - Redis 消息队列支持
- **配置管理** - @nestjs/config + Joi 验证，支持命名空间配置
- **Pino 日志** - 结构化 JSON 日志，开发环境美化输出
- **JWT 认证** - 用户注册、登录、Token 认证
- **API 限流** - IP 限流保护（100 请求/分钟）
- **事件系统** - @nestjs/event-emitter 实现模块间解耦通信

## 技术栈

- NestJS 11
- TypeScript
- Prisma 6.x
- PostgreSQL
- Redis + BullMQ
- JWT + Passport
- Swagger/OpenAPI
- Pino Logger
- EventEmitter2

## 项目设置

### 环境变量

创建 `.env` 文件：

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://用户名@localhost:5432/数据库名?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
```

### 安装依赖

```bash
pnpm install
```

### 数据库设置

```bash
# 创建 PostgreSQL 数据库
createdb backendnestjs

# 运行 Prisma 迁移
pnpm prisma migrate dev

# 生成 Prisma Client
pnpm prisma generate
```

## 运行项目

```bash
# 开发模式
pnpm start:dev

# 生产模式
pnpm start:prod
```

## API 端点

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/` | GET | Hello World | 无 |
| `/docs` | GET | Swagger 文档 | 无 |
| `/forms` | GET | 获取所有记录 | 无 |
| `/submit` | POST | 提交表单 | 无 |
| `/queue` | POST | 添加队列任务 | 无 |
| `/auth/register` | POST | 用户注册 | 无 |
| `/auth/login` | POST | 用户登录 | 无 |
| `/auth/profile` | GET | 用户信息 | JWT |

## Swagger 文档

启动项目后访问：`http://localhost:3000/docs`

认证端点需要在 Swagger UI 中点击 "Authorize" 按钮，输入 JWT Token。

## 配置系统

配置采用命名空间方式管理：

```typescript
// 获取配置
this.config.get<string>('jwt.secret');
this.config.get<string>('database.url');
this.config.get<number>('app.port');
```

命名规则：`xxxConfig` → 命名空间 `xxx`

详见 [docs/nestjs-config-system.md](docs/nestjs-config-system.md)

## 目录结构

```
src/
├── auth/           # JWT 认证模块
├── config/         # 配置管理
├── common/
│   ├── decorators/ # 自定义装饰器
│   ├── filters/    # 异常过滤器
│   ├── guards/     # 认证守卫
│   └── interceptors/ # 拦截器
├── events/         # 事件系统
│   ├── listeners/  # 事件监听器
│   └── user.events.ts # 用户事件定义
├── prisma/         # Prisma 服务
├── queue/          # BullMQ 消息队列
├── app.module.ts   # 主模块
├── app.controller.ts
├── app.service.ts
└── main.ts         # 入口文件
```

## 依赖安装记录

```bash
# Swagger
pnpm add @nestjs/swagger

# Prisma
pnpm add prisma @prisma/client
pnpm prisma init

# BullMQ
pnpm add bullmq @nestjs/bullmq

# 配置验证
pnpm add @nestjs/config joi

# 日志
pnpm add nestjs-pino pino-pretty

# JWT 认证
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt

# 限流
pnpm add @nestjs/throttler

# 事件系统
pnpm add @nestjs/event-emitter eventemitter2
```

## 运行测试

```bash
# 单元测试
pnpm test

# e2e 测试
pnpm test:e2e

# 测试覆盖率
pnpm test:cov
```

## 文档资源

- [NestJS 官方文档](https://docs.nestjs.com)
- [Prisma 文档](https://www.prisma.io/docs)
- [BullMQ 文档](https://docs.bullmq.io)
- [配置系统说明](docs/nestjs-config-system.md)

## License

MIT