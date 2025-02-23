// src/common/constants/error-code.constants.ts
export enum ErrorCode {
  SUCCESS = 0,          // 成功
  PARAM_ERROR = 1001,   // 参数错误
  UNAUTHORIZED = 1002,  // 未授权
  FORBIDDEN = 1003,     // 无权限
  NOT_FOUND = 1004,     // 资源不存在
  INTERNAL_ERROR = 9999 // 系统错误
}

// 错误码与消息的映射
export const ErrorMessage = {
  [ErrorCode.SUCCESS]: '成功',
  [ErrorCode.PARAM_ERROR]: '参数错误',
  [ErrorCode.UNAUTHORIZED]: '未授权访问',
  [ErrorCode.FORBIDDEN]: '无权限操作',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.INTERNAL_ERROR]: '系统异常，请稍后重试'
};