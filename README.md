# 网络流量监控与分析系统

本系统旨在实现网络流量的实时捕获、分析与可视化，支持基础系统指标监控、异常检测与攻击识别。

## 系统架构

系统采用分布式架构：
- 后端由 NestJS 提供统一接口
- 数据存储使用 PostgreSQL
- 流量分析由 Python + TensorFlow 实现
- 前端使用 React + ECharts 完成数据展示

## 目录结构

```
- src/                    # NestJS后端代码
  - capture/              # 流量捕获模块
  - analysis/             # 流量分析模块
  - traffic/              # 流量展示模块
  - metrics/              # 系统指标监控模块
  - prisma/               # 数据库访问服务
  - config/               # 配置文件

- ml_service/             # Python机器学习服务
  - app/                  # FastAPI应用
  - models/               # 预训练模型
  - scripts/              # 训练脚本
  - requirements.txt      # Python依赖

- frontend/               # 前端React应用
```

## 启动步骤

### 1. 准备环境

确保安装了以下工具：
- Node.js 16+
- Python 3.8+
- PostgreSQL 13+
- tshark (Wireshark命令行工具)

### 2. 启动后端服务

```bash
# 安装依赖
npm install

# 生成Prisma客户端
npx prisma generate

# 启动开发服务器
npm run start:dev
```

### 3. 启动Python分析服务

#### 使用启动脚本(推荐)
```bash
# 进入机器学习服务目录
cd ml_service

# 使用启动脚本(自动创建目录并检查依赖)
python start.py --install
```

#### 或手动启动
```bash
# 进入机器学习服务目录
cd ml_service

# 创建并激活虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 手动创建必要目录
mkdir -p models app/routes

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 环境变量配置

创建.env文件，配置以下变量：

```
DATABASE_URL="postgresql://user:password@localhost:5432/networkmonitoring"
ML_SERVICE_URL="http://localhost:8000"
ML_SERVICE_TIMEOUT=30000
ML_SERVICE_RETRY_ATTEMPTS=3
ML_SERVICE_RETRY_DELAY=1000
CAPTURE_INTERFACE="eth0"  # 替换为你的网络接口名
```

## API文档

启动服务后，可访问以下地址查看API文档：

- NestJS API: http://localhost:3000/api
- 机器学习服务API: http://localhost:8000/docs

## 故障排除

### Python机器学习服务启动问题

1. TensorFlow兼容性问题
   - 如果遇到TensorFlow相关错误，尝试降级到兼容版本:
   ```bash
   pip install tensorflow==2.10.0
   ```

2. 端口占用
   - 如果8000端口被占用，可以指定其他端口:
   ```bash
   python start.py --port 8080
   ```

3. 依赖安装失败
   - 对于Windows用户，某些依赖可能需要安装C++构建工具
   - 对于特定平台的预编译wheel包，可访问 https://www.lfd.uci.edu/~gohlke/pythonlibs/

### NestJS后端连接问题

1. 检查ML_SERVICE_URL环境变量是否正确设置
2. 确保Python服务已启动并可访问
3. 检查日志中的错误信息: `npm run start:dev > backend.log 2>&1`

Prometheus启动
prometheus.exe --config.file=prometheus.yml --web.listen-address=":9091"

prisma客户端生成
npx prisma generate
npx prisma db push


编号 | 设备描述 | 建议
4 | (WLAN) | ✅ 无线网卡，笔记本通常使用这个
10 | (以太网 2) | 💡 有线网，若使用网线时选这个
11 | (以太网) | 💡 有线网，可能是主板网卡
5 / 6 | VMware Network Adapter | ❌ 虚拟机专用，忽略
9 | Loopback | ❌ 回环接口，忽略
12 | USBPcap | ❌ USB设备，不用
13~18 | ciscodump、wifidump.exe等 | ❌ 插件，排除