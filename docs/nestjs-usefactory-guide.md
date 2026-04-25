# NestJS useFactory 工厂函数详解

## 概述

`useFactory` 是 NestJS 的工厂函数模式，用于动态创建配置或服务实例。工厂函数在**模块初始化时执行一次**，返回值作为该模块的配置。

## 基本语法

```typescript
useFactory: (...依赖注入的参数) => {
  // 执行逻辑
  return 配置对象或实例;
}
```

## 三种注册方式对比

| 方式 | 语法 | 适用场景 |
|------|------|----------|
| 静态注册 | `register()` | 配置值固定不变 |
| 异步注册 | `registerAsync()` | 需要依赖其他服务 |
| 工厂函数 | `useFactory` | 动态逻辑 + 依赖注入 |

## 工作流程

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],    // 1. 先导入需要的模块
  inject: [ConfigService],    // 2. 注入需要的服务作为参数
  useFactory: (config) => {   // 3. 工厂函数接收注入的服务
    // 4. 执行逻辑，动态计算配置
    const secret = config.get('jwt.secret');
    return {                   // 5. 返回配置对象
      secret,
      signOptions: { expiresIn: 86400 }
    };
  }
})
```

执行顺序：
1. NestJS 加载模块
2. 根据 `imports` 导入依赖模块
3. 根据 `inject` 注入服务
4. 执行 `useFactory` 函数
5. 返回值作为模块配置

## 常见用例

### 1. JWT 模块动态配置

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('jwt.secret') || 'default-secret',
    signOptions: {
      expiresIn: 86400, // 1 day in seconds
    },
  }),
})
```

### 2. 数据库连接动态配置

```typescript
TypeOrmModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('database.host'),
    port: config.get('database.port'),
    username: config.get('database.username'),
    password: config.get('database.password'),
    database: config.get('database.name'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: config.get('database.synchronize') === 'true',
  }),
})
```

### 3. Redis 缓存配置

```typescript
CacheModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    store: redisStore,
    host: config.get('redis.host'),
    port: config.get('redis.port'),
    ttl: 3600,
  }),
})
```

### 4. 条件性服务实现

```typescript
{
  provide: 'StorageService',
  useFactory: (config: ConfigService) => {
    const storageType = config.get('storage.type');
    if (storageType === 's3') {
      return new S3StorageService(
        config.get('s3.bucket'),
        config.get('s3.region')
      );
    }
    return new LocalStorageService(config.get('storage.localPath'));
  },
  inject: [ConfigService],
}
```

### 5. 组合多个依赖

```typescript
{
  provide: AuthService,
  useFactory: (
    userRepository: UserRepository,
    jwtService: JwtService,
    logger: Logger,
    config: ConfigService
  ) => {
    return new AuthService(
      userRepository,
      jwtService,
      logger,
      config.get('auth.tokenExpiry')
    );
  },
  inject: [UserRepository, JwtService, Logger, ConfigService],
}
```

### 6. 异步工厂函数

```typescript
{
  provide: 'AsyncConfig',
  useFactory: async (config: ConfigService) => {
    // 可以执行异步操作
    const dbConnection = await connectToDatabase();
    const redisClient = await createRedisClient();
    
    return {
      db: dbConnection,
      redis: redisClient,
      secret: config.get('app.secret'),
    };
  },
  inject: [ConfigService],
}
```

## 与 useClass、useValue、useExisting 对比

| 方式 | 说明 | 执行时机 |
|------|------|----------|
| `useClass` | 直接使用类实例化 | 每次注入时创建 |
| `useValue` | 使用固定值 | 模块定义时确定 |
| `useFactory` | 使用工厂函数动态创建 | 模块初始化时执行 |
| `useExisting` | 使用已有别名 | 引用现有 Provider |

```typescript
// useClass - 类实例
{ provide: Logger, useClass: PinoLogger }

// useValue - 固定值
{ provide: 'API_KEY', useValue: '12345' }

// useFactory - 动态创建
{ provide: 'Config', useFactory: () => ({ env: process.env.NODE_ENV }) }

// useExisting - 别名引用
{ provide: 'AliasLogger', useExisting: Logger }
```

## 最佳实践

### 1. 错误处理

```typescript
useFactory: (config: ConfigService) => {
  const secret = config.get<string>('jwt.secret');
  if (!secret) {
    throw new Error('JWT_SECRET is required in environment');
  }
  return { secret };
}
```

### 2. 默认值处理

```typescript
useFactory: (config: ConfigService) => ({
  ttl: config.get<number>('cache.ttl') || 3600,
  maxSize: config.get<number>('cache.maxSize') || 100,
})
```

### 3. 环境判断

```typescript
useFactory: (config: ConfigService) => {
  const isProduction = config.get('NODE_ENV') === 'production';
  return {
    secret: isProduction 
      ? config.get('jwt.secret') 
      : 'dev-secret',
    expiresIn: isProduction ? 3600 : 86400,
  };
}
```

## NestJS 官方文档链接

- [Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules) - 动态模块配置
- [Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers) - 自定义 Provider
- [Configuration](https://docs.nestjs.com/techniques/configuration) - 配置管理
- [JWT Authentication](https://docs.nestjs.com/security/authentication) - JWT 认证
- [Database](https://docs.nestjs.com/techniques/database) - 数据库集成
- [Caching](https://docs.nestjs.com/techniques/caching) - 缓存系统

## 相关资源

- [NestJS GitHub](https://github.com/nestjs/nest)
- [NestJS 官方文档](https://docs.nestjs.com)
- [NestJS 中文文档](https://docs.nestjs.cn)
- [Awesome NestJS](https://github.com/nestjs/awesome-nestjs) - 资源汇总