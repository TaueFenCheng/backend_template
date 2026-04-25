# NestJS 高级特性集成 - 阶段 2：安全防护

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 集成 JWT 认证系统和速率限制，实现用户注册登录、Token 验证和 API 限流。

**Architecture:** 使用 @nestjs/jwt 和 @nestjs/passport 实现 JWT 认证，bcrypt 加密密码，Prisma 存储 User 表；使用 @nestjs/throttler 实现 IP 级别的速率限制。

**Tech Stack:** NestJS 11, @nestjs/jwt, @nestjs/passport, passport-jwt, bcrypt, @nestjs/throttler

---

## 文件结构

```
src/
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
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   └── interceptors/
│       └── logging.interceptor.ts (已存在)
prisma/
├── schema.prisma (修改，添加 User model)
```

---

### Task 1: 安装认证和速率限制依赖

- [ ] **Step 1: 安装依赖包**

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/throttler
pnpm add -D @types/passport-jwt @types/bcrypt
```

---

### Task 2: 扩展 Prisma Schema 添加 User 模型

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 添加 User model**

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique @db.VarChar(100)
  password  String   @db.VarChar(255)
  name      String?  @db.VarChar(50)
  role      String   @default("user") @db.VarChar(20)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

- [ ] **Step 2: 创建迁移**

```bash
npx prisma migrate dev --name add_user_table
npx prisma generate
```

---

### Task 3: 创建认证 DTO

**Files:**
- Create: `src/auth/dto/register.dto.ts`
- Create: `src/auth/dto/login.dto.ts`

- [ ] **Step 1: 创建 RegisterDto**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com', description: '用户邮箱' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: '密码 (6-50字符)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @ApiProperty({ example: 'John Doe', description: '用户名称', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;
}
```

- [ ] **Step 2: 创建 LoginDto**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: '用户邮箱' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: '密码' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
```

---

### Task 4: 创建 AuthService

**Files:**
- Create: `src/auth/auth.service.ts`

- [ ] **Step 1: 创建 AuthService**

```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.expiration'),
    });
    return { accessToken: token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async validateUser(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
```

---

### Task 5: 创建 JWT Strategy

**Files:**
- Create: `src/auth/jwt.strategy.ts`

- [ ] **Step 1: 创建 JwtStrategy**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    const user = await this.auth.validateUser(payload.sub);
    if (!user) {
      return null;
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
```

---

### Task 6: 创建 JWT Auth Guard

**Files:**
- Create: `src/common/guards/jwt-auth.guard.ts`

- [ ] **Step 1: 创建 JwtAuthGuard**

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

---

### Task 7: 创建 Current User Decorator

**Files:**
- Create: `src/common/decorators/current-user.decorator.ts`

- [ ] **Step 1: 创建 CurrentUser 装饰器**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

---

### Task 8: 创建 AuthController

**Files:**
- Create: `src/auth/auth.controller.ts`

- [ ] **Step 1: 创建 AuthController**

```typescript
import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
```

---

### Task 9: 创建 AuthModule

**Files:**
- Create: `src/auth/auth.module.ts`

- [ ] **Step 1: 创建 AuthModule**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.expiration'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

---

### Task 10: 配置速率限制

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: 在 AppModule 中添加 ThrottlerModule**

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule,
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
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    QueueModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

---

### Task 11: 更新 Swagger 配置添加 Bearer Auth

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 确认 Swagger 已配置 addBearerAuth**

main.ts 中已经有 `addBearerAuth()`，无需修改。

---

### Task 12: 验证构建

- [ ] **Step 1: 构建项目**

Run: `pnpm run build`
Expected: 构建成功

- [ ] **Step 2: 启动服务并测试**

Run: `pnpm start:dev`
Test: 
- POST /auth/register
- POST /auth/login
- GET /auth/profile (with Bearer token)

---

### Task 13: 提交代码

- [ ] **Step 1: 提交认证和速率限制集成**

```bash
git add src/auth/ src/common/guards/ src/common/decorators/ src/app.module.ts prisma/ package.json pnpm-lock.yaml docs/
git commit -m "feat: add JWT authentication and rate limiting"
```