# NestJS 模块系统详解

## 模块四大属性

```typescript
@Module({
  imports: [],      // 导入其他模块
  controllers: [],  // 控制器（处理请求）
  providers: [],    // 服务（业务逻辑）
  exports: [],      // 导出服务（供其他模块使用）
})
export class MyModule {}
```

---

## 1. imports - 导入其他模块

**作用：** 引入其他模块导出的服务，使本模块能使用它们。

```typescript
@Module({
  imports: [
    PrismaModule,     // 使用 PrismaService 数据库服务
    ConfigModule,     // 使用 ConfigService 配置服务
    AuthModule,       // 使用 AuthService 认证服务
  ],
})
```

**规则：**
- 只能使用其他模块 `exports` 导出的服务
- 导入后，本模块的 providers 和 controllers 可以注入这些服务

---

## 2. controllers - 控制器

**作用：** 处理 HTTP 请求，定义 API 端点。

```typescript
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}  // 注入服务

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);  // 调用服务处理业务
  }
}
```

**特点：**
- 接收请求参数
- 调用 provider 处理业务逻辑
- 返回响应给客户端
- 不应该包含复杂业务逻辑

---

## 3. providers - 服务提供者

**作用：** 定义可注入的服务，处理业务逻辑、数据库操作等。

```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,  // 注入其他服务
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // 业务逻辑
    const user = await this.prisma.user.findUnique(...);
    const token = this.jwt.sign(...);
    return { token };
  }
}
```

**常见 providers 类型：**

| 类型 | 说明 | 示例 |
|------|------|------|
| `@Injectable()` | 服务类（最常见） | `providers: [AuthService]` |
| `useFactory` | 工厂函数动态创建 | `{ provide: 'X', useFactory: () => {} }` |
| `useClass` | 类别名 | `{ provide: 'X', useClass: Y }` |
| `useValue` | 固定值 | `{ provide: 'X', useValue: { a: 1 } }` |

---

## 4. exports - 导出服务

**作用：** 将本模块的服务导出，供其他模块导入使用。

```typescript
@Module({
  providers: [AuthService, JwtModule],
  exports: [AuthService, JwtModule],  // 导出后其他模块可用
})
export class AuthModule {}
```

**使用导出的服务：**

```typescript
// 其他模块导入 AuthModule 后，可注入 AuthService
@Module({
  imports: [AuthModule],  // 导入 AuthModule
  providers: [UserService],
})
export class UserModule {}

// UserService 可以注入 AuthService
@Injectable()
export class UserService {
  constructor(private auth: AuthService) {}  // ✅ 可注入
}
```

---

## 模块关系图示

```
┌─────────────────────────────────────────────────────────────┐
│                      AppModule                               │
│  imports: [AuthModule, PrismaModule, QueueModule]            │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │   AuthModule    │    │  PrismaModule   │                 │
│  │                 │    │                 │                 │
│  │ providers:      │    │ providers:      │                 │
│  │   AuthService   │    │   PrismaService │                 │
│  │                 │    │                 │                 │
│  │ exports:        │    │ exports:        │                 │
│  │   AuthService ✓ │───▶│   PrismaService ✓│                │
│  │                 │    │                 │                 │
│  │ imports:        │    │                 │                 │
│  │   PrismaModule  │◀───│                 │                 │
│  └─────────────────┘    └─────────────────┘                 │
│                                                             │
│  AuthModule 导入 PrismaModule → 能用 PrismaService           │
│  PrismaModule 导出 PrismaService → 其他模块可用              │
└─────────────────────────────────────────────────────────────┘
```

---

## 导入模块后如何使用

导入模块后，通过**依赖注入**在 providers 和 controllers 中使用其导出的服务。

### 使用步骤

```
1. 模块A exports: [ServiceA]
   ↓ 导出服务
2. 模块B imports: [模块A]
   ↓ 导入模块
3. 服务B constructor(private service: ServiceA)
   ↓ 注入服务
4. this.service.method()
   ↓ 调用服务方法
```

### 在 providers 中注入

```typescript
// auth.module.ts
@Module({
  imports: [PrismaModule],  // 导入 PrismaModule
  providers: [AuthService], // AuthService 可以注入 PrismaService
})

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,  // ✅ 注入导入模块导出的服务
  ) {}

  async register(dto: RegisterDto) {
    // 使用导入的服务
    return this.prisma.user.create({
      data: { email: dto.email, password: dto.password }
    });
  }
}
```

### 在 controllers 中注入

```typescript
// auth.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],  // Controller 也能注入
  providers: [AuthService],
})

// auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,     // ✅ 注入本模块的 provider
    private prisma: PrismaService, // ✅ 注入导入模块导出的服务
  ) {}

  @Get('users')
  getUsers() {
    return this.prisma.user.findMany();  // 直接使用
  }
}
```

---

## 关键规则

| 规则 | 说明 |
|------|------|
| **只有导出的才能用** | 模块必须 `exports` 导出服务，否则导入也用不了 |
| **constructor 注入** | 通过 `private xxx: ServiceName` 注入 |
| **导入关系传递** | 导入 A 模块，A 导出 B 服务 → 可注入 B |

### 错误示例

```typescript
// ❌ 没有导出 PrismaService
@Module({
  providers: [PrismaService],
  // 缺少 exports: [PrismaService]
})
export class PrismaModule {}

// 其他模块导入后无法注入 PrismaService
@Module({
  imports: [PrismaModule],
  providers: [AuthService],
})
export class AuthModule {}

// ❌ 报错：Cannot find provider PrismaService
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}  // 错误！
}
```

### 正确示例

```typescript
// ✅ 导出 PrismaService
@Module({
  providers: [PrismaService],
  exports: [PrismaService],  // 必须导出
})
export class PrismaModule {}
```

---

## 项目实例分析

### AuthModule 完整示例

```typescript
// auth.module.ts
@Module({
  imports: [
    PrismaModule,                     // 导入 → 使用数据库服务
    ConfigModule,                     // 导入 → 使用配置服务
  ],
  controllers: [AuthController],      // 控制器 → 处理 /auth/* 请求
  providers: [AuthService, JwtStrategy], // 服务 → 认证逻辑
  exports: [AuthService, JwtModule],  // 导出 → 其他模块可注入认证服务
})
export class AuthModule {}
```

**属性说明：**

| 属性 | 内容 | 作用 |
|------|------|------|
| imports | PrismaModule | AuthService 能操作数据库 |
| imports | ConfigModule | 获取 JWT 密钥配置 |
| controllers | AuthController | 处理注册、登录、profile 请求 |
| providers | AuthService | 用户注册/登录/token生成逻辑 |
| providers | JwtStrategy | Passport JWT 验证策略 |
| exports | AuthService | 其他模块可注入认证服务 |

### AuthService 使用导入的服务

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,    // 来自 PrismaModule
    private jwt: JwtService,          // 来自 JwtModule
    private config: ConfigService,    // 来自 ConfigModule
  ) {}

  async register(dto: RegisterDto) {
    // 使用 PrismaService（来自导入的 PrismaModule）
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashedPassword }
    });
    
    // 使用 ConfigService（来自导入的 ConfigModule）
    const secret = this.config.get<string>('jwt.secret');
    
    // 使用 JwtService（来自 JwtModule）
    const token = this.jwt.sign(payload, { secret });
    
    return { token, user };
  }
}
```

---

## 常见注入的服务类型

```typescript
@Injectable()
export class MyService {
  constructor(
    // 1. 其他模块导出的服务
    private prisma: PrismaService,       // 数据库操作
    private auth: AuthService,           // 认证服务
    private config: ConfigService,       // 配置服务
    
    // 2. 本模块的其他 providers
    private helper: HelperService,       // 同模块服务
    
    // 3. 第三方模块的服务
    private jwt: JwtService,             // JWT 服务
  ) {}
}
```

---

## 属性总结表格

| 属性 | 作用 | 方向 |比喻 |
|------|------|------|------|
| `imports` | 引入其他模块的服务 | 进（接收） | 买（引入需要的服务） |
| `controllers` | 处理 HTTP 请求 | 横向（请求→响应） | 门面（接待请求） |
| `providers` | 业务逻辑服务 | 内部（处理逻辑） | 工人（干活） |
| `exports` | 导出服务供其他模块用 | 出（分享） | 卖（分享服务给他人） |

---

## NestJS 官方文档链接

- [Modules](https://docs.nestjs.com/modules) - 模块系统
- [Controllers](https://docs.nestjs.com/controllers) - 控制器
- [Providers](https://docs.nestjs.com/providers) - 服务提供者
- [Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers) - 自定义 Provider
- [Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules) - 动态模块

## 相关资源

- [NestJS GitHub](https://github.com/nestjs/nest)
- [NestJS 官方文档](https://docs.nestjs.com)
- [NestJS 中文文档](https://docs.nestjs.cn)