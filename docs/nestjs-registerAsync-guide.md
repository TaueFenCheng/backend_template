# NestJS registerAsync 与 imports/inject详解

## registerAsync 概述

`registerAsync` 是 NestJS 动态模块的异步配置方法，用于通过工厂函数动态获取模块配置。

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],    // 导入模块，使服务可用
  inject: [ConfigService],    // 注入服务作为工厂函数参数
  useFactory: (config) => {   // 工厂函数接收注入的服务
    return { secret: config.get('jwt.secret') };
  }
})
```

---

## imports 的作用

**让导入模块导出的服务在工厂函数中可用。**

```typescript
imports: [ConfigModule]
```

### 工作原理

```
1. imports 导入 ConfigModule
   ↓
2. ConfigModule exports: [ConfigService]
   ↓
3. ConfigService 在工厂函数上下文中可用
```

### 不写 imports 的后果

```typescript
JwtModule.registerAsync({
  // ❌ 缺少 imports
  inject: [ConfigService],
  useFactory: (config) => {
    // 报错：Cannot find provider ConfigService
  }
})
```

---

## inject 的作用

**将导入的服务注入到工厂函数的参数中。**

```typescript
inject: [ConfigService]  // 注入服务
useFactory: (config: ConfigService) => {  // 参数接收注入的服务
  return { secret: config.get('jwt.secret') };
}
```

### inject 数组与参数对应关系

```typescript
inject: [ConfigService, PrismaService, Logger]  // 3个服务

useFactory: (
  config: ConfigService,    // 对应 inject[0]
  prisma: PrismaService,    // 对应 inject[1]
  logger: Logger            // 对应 inject[2]
) => {
  const secret = config.get('jwt.secret');
  const user = await prisma.user.findFirst();
  logger.log('config loaded');
}
```

---

## imports 与 inject 的关系

```
imports: [ConfigModule]     → 导入模块，使服务"可用"
        ↓
ConfigModule.exports: [ConfigService]  → 模块导出服务
        ↓
inject: [ConfigService]     → 将服务"注入"到工厂函数
        ↓
useFactory: (config) => {}  → 参数接收注入的服务
```

### 流程图示

```
┌─────────────────────────────────────────────────────────┐
│  JwtModule.registerAsync()                               │
│                                                          │
│  imports: [ConfigModule]                                 │
│      │                                                   │
│      ▼                                                   │
│  ┌─────────────────┐                                     │
│  │  ConfigModule   │                                     │
│  │  exports:       │                                     │
│  │    ConfigService│                                     │
│  └─────────────────┘                                     │
│      │                                                   │
│      ▼ ConfigService 现在可用                            │
│                                                          │
│  inject: [ConfigService]                                 │
│      │                                                   │
│      ▼                                                   │
│  useFactory: (config: ConfigService) => {                │
│      return { secret: config.get('jwt.secret') };        │
│  }                                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## register vs registerAsync

### register - 同步静态配置

```typescript
JwtModule.register({
  secret: 'hardcoded-secret',      // 固定值
  signOptions: { expiresIn: '1d' },
})
```

| 特性 | 说明 |
|------|------|
| 配置来源 | 固定值（硬编码） |
| 依赖注入 | ❌ 不支持 |
| 异步操作 | ❌ 不支持 |
| 使用场景 | 简单配置、测试 |

### registerAsync - 异步动态配置

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get('jwt.secret'),  // 动态读取
    signOptions: { expiresIn: 86400 },
  }),
})
```

| 特性 | 说明 |
|------|------|
| 配置来源 | 动态值（环境变量/服务） |
| 依赖注入 | ✅ 支持 inject |
| 异步操作 | ✅ 支持 async factory |
| 使用场景 | 生产环境、动态配置 |

---

## 对比表格

| 特性 | register | registerAsync |
|------|----------|---------------|
| 配置方式 | 静态，固定值 | 动态，工厂函数 |
| imports | 不需要 | 需要（导入依赖模块） |
| inject | 不支持 | 支持（注入服务到工厂） |
| useFactory | 不使用 | 使用（工厂函数） |
| 环境变量 | ❌ 不能读取 | ✅ 可以读取 |
| 其他服务 | ❌ 不能依赖 | ✅ 可以依赖 |

---

## 完整示例

### 单服务注入

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('jwt.secret') || 'default-secret',
    signOptions: { expiresIn: 86400 },
  }),
})
```

### 多服务注入

```typescript
JwtModule.registerAsync({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  inject: [
    ConfigService,
    PrismaService,
  ],
  useFactory: async (
    config: ConfigService,
    prisma: PrismaService,
  ) => {
    const secret = config.get('jwt.secret');
    const settings = await prisma.settings.findFirst();
    
    return {
      secret,
      signOptions: { expiresIn: settings?.tokenExpiry || 86400 },
    };
  },
})
```

### 异步工厂函数

```typescript
BullModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    // 可以执行异步操作
    const redisUrl = config.get('redis.url');
    
    return {
      connection: {
        host: config.get('redis.host'),
        port: config.get('redis.port'),
      },
    };
  },
})
```

---

## 项目中的实际使用

### AuthModule - JWT 配置

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('jwt.secret') || 'default-secret',
    signOptions: { expiresIn: 86400 },
  }),
})
```

**为什么需要 imports + inject：**
- `imports: [ConfigModule]` → ConfigService 可用
- `inject: [ConfigService]` → ConfigService 注入到工厂函数
- `useFactory` → 从 ConfigService 读取环境变量中的密钥

### QueueModule - Redis 配置

```typescript
BullModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
    },
  }),
})
```

---

## 属性总结

| 属性 | 作用 | 比喻 |
|------|------|------|
| `imports` | 导入模块，使其导出的服务在工厂函数上下文中可用 | 把食材放进厨房 |
| `inject` | 将导入的服务注入到工厂函数的参数中 | 把食材放到厨师手里 |
| `useFactory` | 工厂函数接收注入的服务，动态返回配置 | 厨师用食材做菜 |

---

## 常见错误

### 1. 缺少 imports

```typescript
JwtModule.registerAsync({
  // ❌ 缺少 imports: [ConfigModule]
  inject: [ConfigService],
  useFactory: (config) => {
    // Error: Cannot find provider ConfigService
  }
})
```

### 2. 缺少 inject

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  // ❌ 缺少 inject: [ConfigService]
  useFactory: () => {
    // ConfigService 在上下文中但无法使用，参数为空
  }
})
```

### 3. inject 与参数不匹配

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService, PrismaService],  // 2个服务
  useFactory: (config) => {  // ❌ 只有1个参数，缺少 prisma
    // PrismaService 没有被接收
  }
})
```

### 正确写法

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule, PrismaModule],
  inject: [ConfigService, PrismaService],  // 2个服务
  useFactory: (
    config: ConfigService,   // ✅ 对应 inject[0]
    prisma: PrismaService,   // ✅ 对应 inject[1]
  ) => {
    // 都可以使用
  }
})
```

---

## NestJS 官方文档链接

- [Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [Configuration](https://docs.nestjs.com/techniques/configuration)
- [JWT Authentication](https://docs.nestjs.com/security/authentication)