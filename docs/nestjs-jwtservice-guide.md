# NestJS JwtService 使用指南

## 概述

`JwtService` 是 NestJS JWT 模块提供的服务，用于**生成和验证 JWT Token**。

```typescript
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}
}
```

---

## 主要方法

### 1. sign() - 生成 Token

**作用：** 根据 payload 生成 JWT Token。

```typescript
sign(payload: object, options?: SignOptions): string
```

**基本使用：**

```typescript
const payload = { sub: userId, email: user.email };
const token = this.jwt.sign(payload);
// 返回: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**带选项使用：**

```typescript
const token = this.jwt.sign(payload, {
  secret: 'my-secret',           // 自定义密钥
  expiresIn: '1h',               // 过期时间
  algorithm: 'HS256',            // 算法
  issuer: 'my-app',              // 签发者
  audience: 'users',             // 受众
});
```

---

### 2. verify() - 验证 Token

**作用：** 验证 Token 是否有效，返回解码后的 payload。

```typescript
verify(token: string, options?: VerifyOptions): object
```

**基本使用：**

```typescript
try {
  const payload = this.jwt.verify(token);
  console.log(payload.sub, payload.email);
  // Token 有效
} catch (error) {
  // Token 无效或已过期
  throw new UnauthorizedException('Invalid token');
}
```

**带选项验证：**

```typescript
const payload = this.jwt.verify(token, {
  secret: 'my-secret',
  algorithms: ['HS256'],
  issuer: 'my-app',
  audience: 'users',
});
```

---

### 3. decode() - 解码 Token（不验证）

**作用：** 解码 Token 获取 payload，**不进行签名验证**。

```typescript
decode(token: string, options?: DecodeOptions): object | string
```

**使用示例：**

```typescript
const payload = this.jwt.decode(token);
console.log(payload.sub, payload.email);
// 即使 Token 无效也能解码（不安全）
```

**注意：** `decode()` 不验证签名，仅用于查看 Token 内容，**不要用于认证**。

---

## 方法对比

| 方法 | 验证签名 | 用途 | 安全性 |
|------|---------|------|--------|
| `sign()` | - | 生成 Token | - |
| `verify()` | ✅ 是 | 认证验证 | ✅ 安全 |
| `decode()` | ❌ 否 | 查看内容 | ❌ 不安全 |

---

## SignOptions 常用选项

```typescript
interface SignOptions {
  expiresIn?: string | number;   // 过期时间
  algorithm?: Algorithm;         // 算法
  secret?: string;               // 密钥（覆盖模块配置）
  issuer?: string;               // 签发者
  audience?: string;             // 受众
  subject?: string;              // 主题
  notBefore?: string | number;   // 生效时间
  jwtid?: string;                // JWT ID
}
```

| 选项 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `expiresIn` | string \| number | 过期时间 | `'1h'`, `3600` |
| `algorithm` | string | 签名算法 | `'HS256'` |
| `secret` | string | 密钥 | `'my-secret'` |
| `issuer` | string | 签发者 | `'my-app'` |
| `audience` | string | 受众 | `'users'` |

---

## VerifyOptions 常用选项

```typescript
interface VerifyOptions {
  secret?: string;               // 密钥
  algorithms?: Algorithm[];      // 允许的算法
  issuer?: string | string[];    // 验证签发者
  audience?: string | string[];  // 验证受众
  subject?: string;              // 验证主题
  maxAge?: string | number;      // 最大年龄
  ignoreExpiration?: boolean;    // 忽略过期检查（不推荐）
}
```

---

## expiresIn 时间格式

| 格式 | 说明 | 示例 |
|------|------|------|
| 数字 | 秒数 | `3600` = 1小时 |
| 字符串+单位 | 时间描述 | `'1h'` = 1小时 |
| 字符串+天 | 天数 | `'7d'` = 7天 |
| 字符串+毫秒 | 毫秒 | `'100ms'` |

```typescript
// 数字格式（秒）
this.jwt.sign(payload, { expiresIn: 3600 });   // 1小时
this.jwt.sign(payload, { expiresIn: 86400 });  // 1天

// 字符串格式
this.jwt.sign(payload, { expiresIn: '1h' });   // 1小时
this.jwt.sign(payload, { expiresIn: '7d' });   // 7天
this.jwt.sign(payload, { expiresIn: '30m' });  // 30分钟
this.jwt.sign(payload, { expiresIn: '1y' });   // 1年
```

---

## 算法类型

### 对称算法（HMAC）- 最常用

```typescript
'HS256'  // HMAC SHA-256（最常用）
'HS384'  // HMAC SHA-384
'HS512'  // HMAC SHA-512
```

### 非对称算法（RSA）- 更安全

```typescript
'RS256'  // RSA SHA-256
'RS384'  // RSA SHA-384
'RS512'  // RSA SHA-512
```

---

## 完整使用示例

### 用户登录生成 Token

```typescript
@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    
    // 生成 Token
    const payload = { 
      sub: user.id,           // 用户ID（标准字段）
      email: user.email,      // 其他信息
      role: user.role 
    };
    
    const token = this.jwt.sign(payload, {
      secret: this.config.get('jwt.secret'),
      expiresIn: '7d',
    });
    
    return { accessToken: token, user };
  }
}
```

### 验证 Token

```typescript
async validateToken(token: string) {
  try {
    const payload = this.jwt.verify(token, {
      secret: this.config.get('jwt.secret'),
    });
    return payload;
  } catch (error) {
    throw new UnauthorizedException('Invalid token');
  }
}
```

### 解码 Token（查看内容）

```typescript
getTokenInfo(token: string) {
  // 不验证签名，仅查看内容
  const payload = this.jwt.decode(token) as any;
  return {
    userId: payload.sub,
    email: payload.email,
    issuedAt: new Date(payload.iat * 1000),    // 签发时间
    expiresAt: new Date(payload.exp * 1000),   // 过期时间
  };
}
```

---

## JWT Payload 标准字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `sub` | Subject（主体，通常是用户ID） | `123` |
| `iat` | Issued At（签发时间） | `1714032000` |
| `exp` | Expiration（过期时间） | `1714636800` |
| `iss` | Issuer（签发者） | `'my-app'` |
| `aud` | Audience（受众） | `'users'` |
| `jti` | JWT ID（唯一标识） | `'abc123'` |

---

## 项目中的实际使用

```typescript
// src/auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private generateToken(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };
    
    const secret = this.config.get<string>('jwt.secret') || 'default-secret';
    const token = this.jwt.sign(payload, {
      secret,
      expiresIn: 86400, // 1 day in seconds
    });
    
    return { accessToken: token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async validateUser(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
```

---

## 错误处理

### 常见错误类型

```typescript
try {
  const payload = this.jwt.verify(token);
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    // Token 已过期
    throw new UnauthorizedException('Token expired');
  }
  if (error.name === 'JsonWebTokenError') {
    // Token 无效
    throw new UnauthorizedException('Invalid token');
  }
  if (error.name === 'NotBeforeError') {
    // Token 未生效
    throw new UnauthorizedException('Token not active yet');
  }
  throw new UnauthorizedException('Authentication failed');
}
```

---

## 最佳实践

### 1. 使用环境变量存储密钥

```typescript
// ❌ 不要硬编码
const token = this.jwt.sign(payload, { secret: 'hardcoded-secret' });

// ✅ 从配置读取
const token = this.jwt.sign(payload, { 
  secret: this.config.get('jwt.secret') 
});
```

### 2. 设置合理的过期时间

```typescript
// ❌ 过期时间太长
expiresIn: '1y'  // 1年，不安全

// ✅ 合理的过期时间
expiresIn: '1h'  // 1小时，安全
expiresIn: '7d'  // 7天，适中
```

### 3. Payload 不要包含敏感信息

```typescript
// ❌ 包含密码
const payload = { sub: user.id, password: user.password };

// ✅ 只包含必要信息
const payload = { sub: user.id, email: user.email, role: user.role };
```

### 4. 使用 verify 而不是 decode 进行认证

```typescript
// ❌ 不验证签名
const payload = this.jwt.decode(token);

// ✅ 验证签名
const payload = this.jwt.verify(token);
```

---

## NestJS 官方文档链接

- [JWT Authentication](https://docs.nestjs.com/security/authentication#jwt-token)
- [jsonwebtoken库](https://github.com/auth0/node-jsonwebtoken)

---

## 总结

| 方法 | 作用 | 返回值 | 安全性 |
|------|------|--------|--------|
| `sign()` | 生成 JWT Token | string | - |
| `verify()` | 验证 Token 签名和有效期 | object | ✅ 安全 |
| `decode()` | 解码 Token（不验证） | object | ❌ 不安全 |

**一句话：JwtService 用于生成 Token（sign）、验证 Token（verify）、解码 Token（decode）。认证时必须使用 verify()。**