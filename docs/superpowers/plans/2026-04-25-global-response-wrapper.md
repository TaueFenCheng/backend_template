# 全局响应包装器实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 NestJS 项目添加统一的全局响应格式包装器，所有 API 响应遵循 `{ code, data, message, details }` 格式。

**Architecture:** 使用 NestJS 标准 Interceptor 包装成功响应，Exception Filter 处理失败响应，自定义 BusinessException 支持业务错误码。

**Tech Stack:** NestJS 11, TypeScript, class-validator (可选)

---

## 文件结构

```
src/common/
├── interceptors/
│   └── response.interceptor.ts    # 成功响应包装
├── filters/
│   └── http-exception.filter.ts   # 失败响应包装
├── exceptions/
│   ├── business.exception.ts      # 自定义业务异常
│   └── error-code.enum.ts         # 错误码枚举定义
├── interfaces/
│   └── response.interface.ts      # 响应格式接口定义
```

---

### Task 1: 创建响应格式接口

**Files:**
- Create: `src/common/interfaces/response.interface.ts`

- [ ] **Step 1: 创建响应接口定义**

```typescript
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
  details?: string;
}

export interface ErrorDetail {
  field?: string;
  reason?: string;
  value?: any;
}
```

---

### Task 2: 创建错误码枚举

**Files:**
- Create: `src/common/exceptions/error-code.enum.ts`

- [ ] **Step 1: 创建错误码枚举定义**

```typescript
export enum ErrorCode {
  SUCCESS = 0,
  INVALID_PARAM = 10001,
  USER_NOT_FOUND = 10002,
  UNAUTHORIZED = 10003,
  FORBIDDEN = 10004,
  NOT_FOUND = 10005,
  INTERNAL_ERROR = 10006,
  DUPLICATE_ENTRY = 10007,
}

export enum ErrorType {
  SUCCESS = 'success',
  INVALID_PARAM = 'INVALID_PARAM',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
}
```

---

### Task 3: 创建业务异常类

**Files:**
- Create: `src/common/exceptions/business.exception.ts`

- [ ] **Step 1: 创建 BusinessException 类**

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorType } from './error-code.enum';
import { ErrorDetail } from '../interfaces/response.interface';

export class BusinessException extends HttpException {
  constructor(
    errorCode: ErrorCode,
    errorType: ErrorType,
    details?: string,
    errorDetail?: ErrorDetail,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code: errorCode,
        data: errorDetail || null,
        message: errorType,
        details: details,
      },
      httpStatus,
    );
  }
}
```

---

### Task 4: 创建响应拦截器

**Files:**
- Create: `src/common/interceptors/response.interceptor.ts`

- [ ] **Step 1: 创建 ResponseInterceptor**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';
import { ErrorCode, ErrorType } from '../exceptions/error-code.enum';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: ErrorCode.SUCCESS,
        data: data,
        message: ErrorType.SUCCESS,
      })),
    );
  }
}
```

---

### Task 5: 创建异常过滤器

**Files:**
- Create: `src/common/filters/http-exception.filter.ts`

- [ ] **Step 1: 创建 HttpExceptionFilter**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse, ErrorDetail } from '../interfaces/response.interface';
import { ErrorCode, ErrorType } from '../exceptions/error-code.enum';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let errorCode: number;
    let message: string;
    let details: string | undefined;
    let errorDetail: ErrorDetail | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        errorCode = responseObj.code || this.mapHttpStatusToErrorCode(status);
        message = responseObj.message || this.mapHttpStatusToErrorType(status);
        details = responseObj.details;
        errorDetail = responseObj.data || null;
      } else {
        errorCode = this.mapHttpStatusToErrorCode(status);
        message = this.mapHttpStatusToErrorType(status);
        details = exceptionResponse as string;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.INTERNAL_ERROR;
      message = ErrorType.INTERNAL_ERROR;
      details = (exception as Error).message;
    }

    const errorResponse: ApiResponse = {
      code: errorCode,
      data: errorDetail,
      message: message,
      details: details,
    };

    response.status(status).json(errorResponse);
  }

  private mapHttpStatusToErrorCode(status: number): number {
    const mapping: Record<number, number> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.INVALID_PARAM,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
    };
    return mapping[status] || ErrorCode.INTERNAL_ERROR;
  }

  private mapHttpStatusToErrorType(status: number): string {
    const mapping: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: ErrorType.INVALID_PARAM,
      [HttpStatus.UNAUTHORIZED]: ErrorType.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorType.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorType.NOT_FOUND,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorType.INTERNAL_ERROR,
    };
    return mapping[status] || ErrorType.INTERNAL_ERROR;
  }
}
```

---

### Task 6: 全局注册拦截器和过滤器

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 更新 main.ts 注册全局拦截器和过滤器**

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局响应包装
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('BackendNestJS API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

---

### Task 7: 验证构建

- [ ] **Step 1: 运行构建验证**

Run: `pnpm run build`
Expected: 构建成功，无错误

---

### Task 8: 提交代码

- [ ] **Step 1: 提交全局响应包装器实现**

```bash
git add src/common/ src/main.ts docs/superpowers/
git commit -m "feat: add global response wrapper with interceptor and exception filter"
```