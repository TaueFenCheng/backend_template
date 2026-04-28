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
        details = exceptionResponse;
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
