import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class CaptureConfig {
  // tshark路径：自动检测操作系统，设置默认路径
  tsharkPath: string = process.env.TSHARK_PATH || 
    (os.platform() === 'win32' 
      ? `"D:\\Wireshark\\tshark.exe"` 
      : '/usr/bin/tshark');
      
  // 默认网络接口
  defaultInterface: string = process.env.DEFAULT_INTERFACE || 
    (os.platform() === 'win32' ? '5' : 'eth0'); // Windows使用接口索引，Linux使用接口名称
    
  // 捕获持续时间（秒）
  defaultDuration: number = parseInt(process.env.DEFAULT_DURATION, 10) || 30;
  
  // 输出JSON文件路径
  jsonFilePath: string = process.env.JSON_FILE_PATH || 
    path.resolve(process.cwd(), 'tmp', 'packets.json');
    
  // 批量处理大小
  batchSize: number = parseInt(process.env.BATCH_SIZE, 10) || 1000;
  
  // 处理间隔（毫秒）
  processInterval: number = parseInt(process.env.PROCESS_INTERVAL, 10) || 5000;
  
  // 捕获过滤器
  captureFilter: string = process.env.CAPTURE_FILTER || '';
  
  // 捕获包的最大数量
  packetLimit: number = parseInt(process.env.PACKET_LIMIT, 10) || 0; // 0表示无限制
  
  // 默认捕获字段
  defaultFields: string[] = [
    'frame.number',
    'frame.time',
    'eth.src',
    'eth.dst',
    'ip.src',
    'ip.dst',
    'tcp.srcport',
    'tcp.dstport',
    'udp.srcport',
    'udp.dstport',
    'ip.proto',
    'frame.len',
    'tcp.flags',
    'frame.protocols'
  ];
  
  // 获取完整的tshark命令
  getTsharkCommand(interfaceName: string, outputFile: string): string {
    let command = `${this.tsharkPath} -i ${interfaceName} -T json -l`;
    
    if (this.captureFilter) {
      command += ` -f "${this.captureFilter}"`;
    }
    
    if (this.packetLimit > 0) {
      command += ` -c ${this.packetLimit}`;
    }
    
    // 增加一些额外的选项来提高输出的稳定性
    command += ' --no-duplicate-keys -j "ip ip.addr tcp udp"';
    
    // 重定向输出到文件
    command += ` > ${outputFile}`;
    
    return command;
  }
}