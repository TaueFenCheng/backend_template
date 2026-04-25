# NestJS 配置系统说明

## 配置链路

```
.env → config/*.config.ts → ConfigModule → ConfigService.get('namespace.key')
```

## 文件结构

### 1. 环境变量文件 `.env`

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://tangjiaqiang@localhost:5432/backendnestjs?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=7d
```

### 2. 配置文件 `src/config/*.config.ts`

每个配置文件定义一个命名空间：

```typescript
// src/config/jwt.config.ts
export default () => ({
  secret: process.env.JWT_SECRET,
  expiration: process.env.JWT_EXPIRATION || '7d',
});
```

```typescript
// src/config/app.config.ts
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
});
```

```typescript
// src/config/database.config.ts
export default () => ({
  url: process.env.DATABASE_URL,
});
```

```typescript
// src/config/redis.config.ts
export default () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});
```

### 3. ConfigModule 注册 `src/config/config.module.ts`

```typescript
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

## 命名规则

NestJS ConfigModule 自动将配置文件转换为命名空间：

| 导入变量名 | 去掉 Config 后缀 | 命名空间 |
|-----------|----------------|---------|
| `appConfig` | `app` | `app` |
| `databaseConfig` | `database` | `database` |
| `redisConfig` | `redis` | `redis` |
| `jwtConfig` | `jwt` | `jwt` |

## 使用方式

在服务中注入 `ConfigService` 并获取配置：

```typescript
constructor(private config: ConfigService) {}

// 获取配置
const secret = this.config.get<string>('jwt.secret');
const port = this.config.get<number>('app.port');
const dbUrl = this.config.get<string>('database.url');
const redisHost = this.config.get<string>('redis.host');
```

格式：`ConfigService.get('命名空间.属性名')`

## 自定义命名空间

如果想使用自定义命名空间名称，可以使用 `registerAs`：

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('JWT', () => ({
  secret: process.env.JWT_SECRET,
  expiration: process.env.JWT_EXPIRATION || '7d',
}));
```

然后访问：`this.config.get('JWT.secret')`

## 配置验证

`configValidation.ts` 使用 Joi 定义验证 schema，确保必要的环境变量存在：

```typescript
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('7d'),
});
```

## 依赖

```bash
pnpm add @nestjs/config joi
```