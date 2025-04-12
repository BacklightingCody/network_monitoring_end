import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PythonProcessService {
  private readonly logger = new Logger(PythonProcessService.name);
  private readonly pythonScriptsPath: string;
  
  constructor() {
    // 脚本路径
    this.pythonScriptsPath = path.join(process.cwd(), 'python_scripts');
    
    // 确保脚本目录存在
    if (!fs.existsSync(this.pythonScriptsPath)) {
      fs.mkdirSync(this.pythonScriptsPath, { recursive: true });
      this.logger.log(`创建Python脚本目录: ${this.pythonScriptsPath}`);
    }
    
    // 初始化脚本文件
    this.initPythonScripts();
  }
  
  /**
   * 初始化Python脚本文件
   */
  private initPythonScripts() {
    // 创建一个简单的异常检测脚本
    const anomalyDetectionScript = path.join(this.pythonScriptsPath, 'anomaly_detection.py');
    if (!fs.existsSync(anomalyDetectionScript)) {
      // 异常检测脚本内容
      const scriptContent = `
import sys
import json
import numpy as np
from sklearn.ensemble import IsolationForest

def detect_anomalies(data):
    """使用Isolation Forest检测异常"""
    # 提取特征
    features = np.array([[
        x['length'],
        x['sourcePort'],
        x['destinationPort'],
        protocol_to_number(x['protocol']),
        tcp_flags_to_number(x['tcpFlags']),
    ] for x in data])
    
    # 使用Isolation Forest
    clf = IsolationForest(
        contamination=0.1,  # 预期异常比例
        random_state=42
    )
    
    # 预测（-1表示异常，1表示正常）
    predictions = clf.fit_predict(features)
    
    # 返回异常索引
    anomalies = [i for i, pred in enumerate(predictions) if pred == -1]
    
    # 计算异常分数（越低表示越可能是异常）
    scores = -clf.score_samples(features)
    
    return {
        'anomalies': anomalies,
        'scores': scores.tolist()
    }

def protocol_to_number(protocol):
    """将协议转换为数字"""
    protocols = {'TCP': 1, 'UDP': 2, 'ICMP': 3}
    return protocols.get(protocol.upper() if protocol else '', 0)

def tcp_flags_to_number(flags):
    """将TCP标志转换为数字"""
    if not flags:
        return 0
    
    value = 0
    if 'SYN' in flags: value |= 1
    if 'ACK' in flags: value |= 2
    if 'FIN' in flags: value |= 4
    if 'RST' in flags: value |= 8
    if 'PSH' in flags: value |= 16
    if 'URG' in flags: value |= 32
    
    return value

if __name__ == "__main__":
    # 从stdin读取JSON数据
    input_data = json.loads(sys.stdin.read())
    
    # 调用检测函数
    result = detect_anomalies(input_data['features'])
    
    # 输出结果
    print(json.dumps(result))
`;
      
      fs.writeFileSync(anomalyDetectionScript, scriptContent);
      this.logger.log(`创建Python脚本: ${anomalyDetectionScript}`);
    }
    
    // 创建一个流量分类脚本
    const trafficClassificationScript = path.join(this.pythonScriptsPath, 'traffic_classification.py');
    if (!fs.existsSync(trafficClassificationScript)) {
      // 流量分类脚本内容
      const scriptContent = `
import sys
import json
import numpy as np
from sklearn.ensemble import RandomForestClassifier

def classify_traffic(data):
    """使用随机森林分类流量"""
    # 提取特征
    features = np.array([[
        x['length'],
        x['sourcePort'],
        x['destinationPort'],
        protocol_to_number(x['protocol']),
        tcp_flags_to_number(x['tcpFlags']),
    ] for x in data])
    
    # 简单模拟：根据特征规则进行分类
    # 实际环境中应该使用已训练好的模型
    classifications = []
    probabilities = []
    
    for feature in features:
        packet_length = feature[0]
        src_port = feature[1]
        dst_port = feature[2]
        protocol = feature[3]
        tcp_flags = feature[4]
        
        # 简单规则检测
        is_ddos = False
        is_portscan = False
        
        # 大量小包可能是DDoS
        if packet_length < 100 and (tcp_flags & 1): # SYN
            is_ddos = True
        
        # 连接到高端口可能是端口扫描
        if dst_port > 1024 and dst_port < 10000 and (tcp_flags & 1): # SYN
            is_portscan = True
        
        # 分类决策
        if is_ddos:
            classifications.append('ddos')
            probabilities.append([0.1, 0.8, 0.05, 0.05])
        elif is_portscan:
            classifications.append('portscan')
            probabilities.append([0.1, 0.05, 0.8, 0.05])
        else:
            classifications.append('normal')
            probabilities.append([0.9, 0.03, 0.03, 0.04])
    
    return {
        'classifications': classifications,
        'probabilities': probabilities
    }

def protocol_to_number(protocol):
    """将协议转换为数字"""
    protocols = {'TCP': 1, 'UDP': 2, 'ICMP': 3}
    return protocols.get(protocol.upper() if protocol else '', 0)

def tcp_flags_to_number(flags):
    """将TCP标志转换为数字"""
    if not flags:
        return 0
    
    value = 0
    if 'SYN' in flags: value |= 1
    if 'ACK' in flags: value |= 2
    if 'FIN' in flags: value |= 4
    if 'RST' in flags: value |= 8
    if 'PSH' in flags: value |= 16
    if 'URG' in flags: value |= 32
    
    return value

if __name__ == "__main__":
    # 从stdin读取JSON数据
    input_data = json.loads(sys.stdin.read())
    
    # 调用分类函数
    result = classify_traffic(input_data['features'])
    
    # 输出结果
    print(json.dumps(result))
`;
      
      fs.writeFileSync(trafficClassificationScript, scriptContent);
      this.logger.log(`创建Python脚本: ${trafficClassificationScript}`);
    }
  }
  
  /**
   * 执行Python脚本进行异常检测
   * @param packetFeatures 数据包特征
   * @returns 检测结果
   */
  async detectAnomaliesWithPython(packetFeatures: any[]): Promise<any> {
    const scriptPath = path.join(this.pythonScriptsPath, 'anomaly_detection.py');
    
    return this.executePythonScript(scriptPath, {
      features: packetFeatures
    });
  }
  
  /**
   * 执行Python脚本进行流量分类
   * @param packetFeatures 数据包特征
   * @returns 分类结果
   */
  async classifyTrafficWithPython(packetFeatures: any[]): Promise<any> {
    const scriptPath = path.join(this.pythonScriptsPath, 'traffic_classification.py');
    
    return this.executePythonScript(scriptPath, {
      features: packetFeatures
    });
  }
  
  /**
   * 执行Python脚本并返回结果
   * @param scriptPath 脚本路径
   * @param data 输入数据
   * @returns 脚本执行结果
   */
  private async executePythonScript(scriptPath: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // 启动Python进程
      const pythonProcess = spawn('python', [scriptPath]);
      
      let result = '';
      let error = '';
      
      // 收集输出
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      // 收集错误
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        this.logger.error(`Python脚本错误: ${data.toString()}`);
      });
      
      // 进程结束处理
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`Python进程退出，代码: ${code}, 错误: ${error}`);
          reject(new Error(`Python脚本执行失败: ${error}`));
          return;
        }
        
        try {
          // 解析JSON结果
          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (err) {
          this.logger.error(`解析Python输出失败: ${err.message}`);
          reject(new Error(`解析Python输出失败: ${err.message}`));
        }
      });
      
      // 发送数据到Python进程
      pythonProcess.stdin.write(JSON.stringify(data));
      pythonProcess.stdin.end();
    });
  }
} 