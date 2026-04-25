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