import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    
    // 获取详细的错误信息
    const errorResponse = exception.getResponse();
    let message = exception.message;
    
    // 如果错误响应是对象，且有message字段，则使用它
    if (typeof errorResponse === 'object' && errorResponse['message']) {
      message = errorResponse['message'];
    }
    
    // 记录错误日志，包括请求信息
    console.error(`[${new Date().toISOString()}] HTTP Exception: ${status} - ${message}`);
    console.error(`请求路径: ${request.method} ${request.url}`);
    console.error('查询参数:', request.query);
    
    // 响应客户端
    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
