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
    (os.platform() === 'win32' ? 'WLAN' : 'eth0'); // Windows使用接口名称，Linux使用eth0
    
  // 捕获持续时间（秒）
  defaultDuration: number = parseInt(process.env.DEFAULT_DURATION, 10) || 300000;
  
  // 输出JSON文件路径
  jsonFilePath: string = process.env.JSON_FILE_PATH || 
    path.resolve(process.cwd(), 'tmp', 'packets.json');
    
  // 批量处理大小
  batchSize: number = parseInt(process.env.BATCH_SIZE, 10) || 1000;
  
  // 处理间隔（毫秒）
  processInterval: number = parseInt(process.env.PROCESS_INTERVAL, 10) || 5000;
  
  // 捕获过滤器 - 使用更简单的语法
  // 某些Windows版本的tshark不支持复杂的逻辑运算符
  captureFilter: string = process.env.CAPTURE_FILTER || 'ip or ip6';
  
  // 捕获包的最大数量
  packetLimit: number = parseInt(process.env.PACKET_LIMIT, 10) || 0; // 0表示无限制
  
  // 默认捕获字段 - 扩展字段列表，包含更多有用信息
  defaultFields: string[] = [
    'frame.number',
    'frame.time',
    'frame.time_epoch',
    'frame.len',
    'frame.protocols',
    'eth.src',
    'eth.dst',
    'eth.type',
    'ip.version',
    'ip.src',
    'ip.dst',
    'ip.proto',
    'ip.ttl',
    'ip.len',
    'ipv6.src',
    'ipv6.dst',
    'tcp.srcport',
    'tcp.dstport',
    'tcp.flags',
    'tcp.len',
    'tcp.stream',
    'tcp.analysis',
    'udp.srcport',
    'udp.dstport',
    'udp.length',
    'http.request',
    'http.response',
    'http.host',
    'http.user_agent',
    'tls.handshake',
    'tls.record',
    'dns.qry.name',
    'dns.resp.name',
    'icmp.type',
    'data'
  ];
  
  // 获取完整的tshark命令
  getTsharkCommand(interfaceName: string, outputFile: string): string {
    // 检查是否为Windows系统
    const isWindows = process.platform === 'win32';
    
    // 检查interfaceName是否是数字索引或带有设备路径格式
    const isInterfaceIndex = /^\d+$/.test(interfaceName);
    const isDevicePath = interfaceName.includes('\\Device\\NPF_');
    
    // 基础命令构建
    let command;
    
    // Windows系统下tshark接口的处理逻辑:
    // 1. 如果是数字索引(例如"4")，直接使用 -i 4
    // 2. 如果是设备路径(例如\Device\NPF_{GUID})，加引号使用
    // 3. 如果是名称(例如"WLAN")，需要转换或使用索引号
    if (isWindows) {
      if (isInterfaceIndex) {
        // 使用索引号，无需引号
        command = `${this.tsharkPath} -i ${interfaceName}`;
      } else if (isDevicePath) {
        // 设备路径需要引号
        command = `${this.tsharkPath} -i "${interfaceName}"`;
      } else {
        // 接口名称，尝试查找对应接口或直接使用，加引号
        command = `${this.tsharkPath} -i "${interfaceName}"`;
      }
    } else {
      // Linux/Mac系统，通常使用eth0等接口名
      command = `${this.tsharkPath} -i "${interfaceName}"`;
    }
    
    console.log(`使用网络接口: ${interfaceName}, 系统类型: ${isWindows ? 'Windows' : 'Linux/Mac'}`);
    
    // 添加输出格式选项 - 使用JSON格式，并指定具体字段
    command += ' -T json';
    
    // 添加实时输出选项
    command += ' -l';
    
    // 添加捕获过滤器（如果需要）
    if (this.captureFilter) {
      command += ` -f "${this.captureFilter}"`;
    }
    
    // 限制数据包数量（如果设置了限制）
    if (this.packetLimit > 0) {
      command += ` -c ${this.packetLimit}`;
    }
    
    // 添加字段提取
    command += ' -e frame.time_epoch -e frame.time -e frame.len';
    command += ' -e eth.src -e eth.dst -e eth.type';
    command += ' -e ip.src -e ip.dst -e ip.proto -e ip.len';
    command += ' -e ipv6.src -e ipv6.dst';
    command += ' -e tcp.srcport -e tcp.dstport -e tcp.flags';
    command += ' -e udp.srcport -e udp.dstport';
    command += ' -e _ws.col.protocol';
    
    // 指定解码
    command += ' -d tcp.port==80,http -d tcp.port==443,tls';
    
    // 添加稳定性选项
    command += ' -N nmdt'; // 解析MAC、网络、域名、传输层
    
    // 使用更多高级选项以确保数据完整性
    if (isWindows) {
      // Windows特定选项
      command += ' --log-level=warning'; // 减少日志噪音
      command += ' -n'; // 不解析地址
    } else {
      // Linux/Mac特定选项
      command += ' -n'; // 不解析地址
    }
    
    // 更好的错误处理
    command += ' --print';

    // 以毫秒为单位设置捕获的数据包时间戳
    command += ' -t ad';
    
    console.log(`完整tshark命令: ${command}`);
    
    return command;
  }
}