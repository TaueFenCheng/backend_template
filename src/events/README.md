# Events 事件系统

## 概述

本模块使用 `@nestjs/event-emitter` 实现事件驱动架构，用于模块间的解耦通信。

## 目录结构

```
events/
├── listeners/
│   └── user.listener.ts    # 用户事件监听器
├── user.events.ts          # 用户事件定义
├── events.module.ts        # EventsModule
└── README.md               # 本文档
```

## 已定义的事件

### 用户事件

| 事件名 | 常量 | 触发时机 | Payload |
|--------|------|----------|---------|
| `user.registered` | `USER_EVENTS.REGISTERED` | 用户注册成功 | `UserRegisteredEvent` |
| `user.login` | `USER_EVENTS.LOGIN` | 用户登录成功 | `UserLoginEvent` |
| `user.logout` | `USER_EVENTS.LOGOUT` | 用户登出 | `UserLogoutEvent` |

### 事件 Payload 类型

```typescript
// 用户注册事件
interface UserRegisteredEvent {
  userId: number;
  email: string;
  name: string | null;
  timestamp: Date;
}

// 用户登录事件
interface UserLoginEvent {
  userId: number;
  email: string;
  ip?: string;
  timestamp: Date;
}

// 用户登出事件
interface UserLogoutEvent {
  userId: number;
  timestamp: Date;
}
```

## 使用方式

### 1. 发送事件（Emitter）

在服务中注入 `EventEmitter2` 并发送事件：

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { USER_EVENTS, UserRegisteredEvent } from '../events/user.events';

@Injectable()
export class AuthService {
  constructor(private eventEmitter: EventEmitter2) {}

  async register(dto: RegisterDto) {
    const user = await this.createUser(dto);
    
    // 发送事件
    const event: UserRegisteredEvent = {
      userId: user.id,
      email: user.email,
      name: user.name,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(USER_EVENTS.REGISTERED, event);
    
    return user;
  }
}
```

### 2. 监听事件（Listener）

创建监听器使用 `@OnEvent` 装饰器：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_EVENTS } from '../user.events';
import type { UserRegisteredEvent } from '../user.events';

@Injectable()
export class UserListener {
  private readonly logger = new Logger(UserListener.name);

  @OnEvent(USER_EVENTS.REGISTERED)
  handleUserRegistered(event: UserRegisteredEvent) {
    this.logger.log(`用户注册成功: ID=${event.userId}`);
    // 可以在这里执行其他逻辑：
    // - 发送欢迎邮件
    // - 记录日志到数据库
    // - 通知管理员
  }
}
```

### 3. @OnEvent 选项

```typescript
@OnEvent(USER_EVENTS.REGISTERED, {
  async: true,           // 异步处理
  priority: 1,           // 执行优先级（数字越小越先执行）
  suppressErrors: false, // 是否抑制错误
})
async handleUserRegistered(event: UserRegisteredEvent) {
  // 异步处理逻辑
}
```

## 当前监听器功能

### UserListener

| 监听事件 | 处理逻辑 |
|----------|----------|
| `user.registered` | 输出注册日志 |
| `user.login` | 输出登录日志（含IP） |
| `user.logout` | 输出登出日志 |

## 扩展事件

### 添加新事件

1. **定义事件常量和类型**

在 `user.events.ts` 中添加：

```typescript
export const USER_EVENTS = {
  REGISTERED: 'user.registered',
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  PASSWORD_CHANGED: 'user.passwordChanged',  // 新事件
};

export interface UserPasswordChangedEvent {
  userId: number;
  timestamp: Date;
}
```

2. **发送事件**

```typescript
this.eventEmitter.emit(USER_EVENTS.PASSWORD_CHANGED, {
  userId: user.id,
  timestamp: new Date(),
});
```

3. **添加监听器**

```typescript
@OnEvent(USER_EVENTS.PASSWORD_CHANGED)
handlePasswordChanged(event: UserPasswordChangedEvent) {
  this.logger.log(`用户修改密码: ID=${event.userId}`);
  // 发送邮件通知等
}
```

### 添加新监听器

创建新的监听器文件：

```typescript
// listeners/order.listener.ts
@Injectable()
export class OrderListener {
  private readonly logger = new Logger(OrderListener.name);

  @OnEvent('order.created')
  handleOrderCreated(event: OrderCreatedEvent) {
    this.logger.log(`订单创建: ID=${event.orderId}`);
  }
}
```

然后在 `events.module.ts` 中注册：

```typescript
@Module({
  providers: [UserListener, OrderListener],  // 添加新监听器
  exports: [UserListener, OrderListener],
})
export class EventsModule {}
```

## 事件 vs 直接调用对比

### 直接调用（耦合）

```typescript
// ❌ 直接依赖多个服务
@Injectable()
export class AuthService {
  constructor(
    private emailService: EmailService,
    private logService: LogService,
    private notificationService: NotificationService,
  ) {}

  async register(user: RegisterDto) {
    const newUser = await this.createUser(user);
    await this.emailService.sendWelcomeEmail(newUser);    // 直接调用await this.logService.logRegistration(newUser);      // 直接调用
    await this.notificationService.notifyAdmin(newUser);   // 直接调用
  }
}
```

**问题：**
- AuthService 依赖太多服务
- 添加新功能需要修改 AuthService
- 模块紧密耦合

### 事件驱动（解耦）

```typescript
// ✅ 使用事件，解耦模块
@Injectable()
export class AuthService {
  constructor(private eventEmitter: EventEmitter2) {}

  async register(user: RegisterDto) {
    const newUser = await this.createUser(user);
    this.eventEmitter.emit('user.registered', newUser);  // 只发事件
    // 不关心谁来处理
  }
}

// EmailListener 监听事件发送邮件
// LogListener 监听事件记录日志
// NotificationListener 监听事件通知管理员
// 添加新功能只需添加新监听器，无需修改 AuthService
```

**好处：**
- 模块完全解耦
- 扩展只需添加监听器
- 易于维护和测试

## EventEmitter vs BullMQ 对比

| 特性 | EventEmitter | BullMQ |
|------|-------------|--------|
| 持久化 | ❌ 无 | ✅ Redis持久化 |
|可靠性 | 进程内，重启丢失 | 持久化，可靠 |
| 复杂度 | 简单 | 需要 Redis |
| 跨服务 | ❌ 不支持 | ✅ 支持 |
| 适用场景 | 单服务内解耦 | 跨服务/需要可靠性 |

**选择建议：**
- 单服务内模块解耦 → EventEmitter
- 跨服务/需要可靠性 → BullMQ

## NestJS 官方文档

- [Event Emitter](https://docs.nestjs.com/techniques/events)

## 相关文件

- [src/auth/auth.service.ts](../auth/auth.service.ts) - 发送用户事件
- [src/app.module.ts](../app.module.ts) - EventEmitterModule 配置