# 全局响应包装器设计

## 概述

为 NestJS 项目添加统一的全局响应格式包装器，所有 API 响应遵循固定格式。

## 响应格式

### 成功响应
```json
{
  "code": 0,
  "data": { ... },
  "message": "success"
}
```

### 失败响应
```json
{
  "code": 10001,
  "data": { "field": "email", "reason": "格式不正确" },
  "message": "INVALID_PARAM",
  "details": "邮箱格式验证失败"
}
```

## 技术方案

使用 NestJS 标准模式实现：

- **成功响应**：通过 `Interceptor` 拦截并包装返回值
- **失败响应**：通过 `Exception Filter` 捕获异常并格式化
- **业务异常**：自定义 `BusinessException` 类，包含错误码和详情
- **错误码管理**：集中定义在枚举文件中

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

## 集成方式

在 `main.ts` 中全局注册：
- `app.useGlobalInterceptors(new ResponseInterceptor())`
- `app.useGlobalFilters(new HttpExceptionFilter())`