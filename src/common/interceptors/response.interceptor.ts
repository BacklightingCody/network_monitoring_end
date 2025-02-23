import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '../constants/error-code.constants';

interface Response<T> {
  code: number;
  data: T | null;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      // 成功响应的处理
      map((data) => ({
        code: ErrorCode.SUCCESS,
        data: this.transformData(data),
        message: ErrorMessage[ErrorCode.SUCCESS], // 使用对应的成功消息
      })),
      // 错误响应的处理
      catchError((err) => {
        const statusCode = err instanceof HttpException ? err.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const errorCode = this.getErrorCode(statusCode);
        return throwError(() => new HttpException(
          {
            code: errorCode,
            message: ErrorMessage[errorCode] || '未知错误',
            data: null,
          },
          statusCode
        ));
      })
    );
  }

  // 处理分页数据或 null 的情况
  private transformData(data: any): any {
    if (data?.hasOwnProperty('items') && data?.hasOwnProperty('meta')) {
      return {
        list: data.items,
        pagination: data.meta,
      };
    }
    return data ?? null; // 确保 data 不为 undefined
  }

  // 根据 HTTP 状态码获取错误码
  private getErrorCode(statusCode: number): ErrorCode {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.PARAM_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
