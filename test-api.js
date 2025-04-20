// 测试接口的小脚本
const fetch = require('node-fetch');

const baseUrl = 'http://localhost:5000';

async function testApi() {
  // 测试不同的查询参数组合
  const testCases = [
    // 基本查询，只有页码和限制
    { name: '基本查询', path: '/traffic/packets?page=1&limit=5' },
    
    // 使用正确的时间格式
    { name: '正确的时间格式', path: '/traffic/packets?page=1&limit=5&startTime=2023-01-01T00:00:00.000Z&endTime=2023-12-31T23:59:59.999Z' },
    
    // 使用完整的查询参数
    { name: '完整参数查询', path: '/traffic/packets?page=1&limit=5&protocol=TCP&sourceIp=192.168.1.1' },
    
    // 使用统计接口
    { name: '流量统计', path: '/traffic/stats' },
    
    // 使用异常记录接口
    { name: '异常记录', path: '/traffic/anomalies' },
  ];
  
  // 依次测试每个用例
  for (const testCase of testCases) {
    console.log(`\n--- 测试: ${testCase.name} ---`);
    const url = `${baseUrl}${testCase.path}`;
    console.log(`请求: ${url}`);
    
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`状态码: ${response.status}`);
        console.log('响应数据:', JSON.stringify(data, null, 2));
      } else {
        const text = await response.text();
        console.log(`状态码: ${response.status}`);
        console.log('响应文本:', text);
      }
    } catch (error) {
      console.error(`请求失败: ${error.message}`);
    }
  }
}

// 执行测试
testApi().catch(err => console.error('测试失败:', err)); 