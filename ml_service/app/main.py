from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log")
    ]
)

logger = logging.getLogger("ml_service")

# 创建FastAPI应用
app = FastAPI(
    title="流量分析机器学习服务",
    description="提供网络流量分析、异常检测和攻击分类的API",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境应限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入路由
from app.routes import health, model, anomaly, attack, feature

# 注册路由
app.include_router(health.router, prefix="/api", tags=["健康检查"])
app.include_router(model.router, prefix="/api/model", tags=["模型管理"])
app.include_router(anomaly.router, prefix="/api/predict", tags=["异常检测"])
app.include_router(attack.router, prefix="/api/predict", tags=["攻击分类"])
app.include_router(feature.router, prefix="/api/feature", tags=["特征提取"])

@app.on_event("startup")
async def startup_event():
    """应用启动时执行的操作"""
    logger.info("机器学习服务启动中...")
    # 这里可以添加模型预加载等操作

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行的操作"""
    logger.info("机器学习服务关闭中...")
    # 这里可以添加资源释放等操作

if __name__ == "__main__":
    # 如果直接运行此文件，则启动服务器
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True) 