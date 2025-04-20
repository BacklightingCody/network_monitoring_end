import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const { type, data } = metadata;
    
    // 只针对Query参数进行处理，且有值时才进行
    if (type === 'query' && data) {
      console.log(`验证管道接收到参数 ${data}:`, value);
      
      // 对于必需的参数，我们需要检查是否存在
      // 但是因为大多数查询参数都有默认值，所以不再强制检查所有参数
      
      // 日期类型参数的特殊检查
      if ((data === 'startTime' || data === 'endTime') && value !== undefined) {
        try {
          const date = new Date(value);
          if (date.toString() === 'Invalid Date') {
            throw new BadRequestException(`无效的日期格式: ${data}=${value}`);
          }
        } catch (error) {
          console.error(`日期格式验证失败: ${data}=${value}`, error);
          throw new BadRequestException(`参数错误: ${data}=${value}, ${error.message}`);
        }
      }
      
      // 数字类型参数的特殊检查
      if ((data === 'page' || data === 'limit') && value !== undefined) {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          console.error(`数字格式验证失败: ${data}=${value}`);
          throw new BadRequestException(`参数错误: ${data} 必须是一个有效的数字`);
        }
      }
    }
    
    return value;
  }
}
