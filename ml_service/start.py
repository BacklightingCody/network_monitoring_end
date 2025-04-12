#!/usr/bin/env python
"""
网络流量分析机器学习服务启动脚本
"""
import os
import sys
import subprocess
import time
import argparse

def check_dependencies():
    """检查依赖是否已安装"""
    try:
        import fastapi
        import uvicorn
        import numpy
        import tensorflow
        import sklearn
        import pandas
        return True
    except ImportError as e:
        print(f"缺少依赖: {str(e)}")
        return False

def install_dependencies():
    """安装依赖"""
    print("正在安装依赖...")
    requirements_file = os.path.join(os.path.dirname(__file__), "requirements.txt")
    
    if not os.path.exists(requirements_file):
        print("未找到requirements.txt文件")
        return False
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", requirements_file])
        print("依赖安装完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"安装依赖失败: {str(e)}")
        return False

def create_directories():
    """创建必要的目录"""
    dirs = [
        os.path.join(os.path.dirname(__file__), "models"),
        os.path.join(os.path.dirname(__file__), "app"),
        os.path.join(os.path.dirname(__file__), "app", "routes"),
    ]
    
    for dir_path in dirs:
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            print(f"创建目录: {dir_path}")

def start_service(host="0.0.0.0", port=8000, reload=True):
    """启动机器学习服务"""
    try:
        import uvicorn
        print(f"启动服务: http://{host}:{port}")
        print("API文档: http://localhost:8000/docs")
        
        uvicorn.run("app.main:app", host=host, port=port, reload=reload)
    except Exception as e:
        print(f"启动服务失败: {str(e)}")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="网络流量分析机器学习服务")
    parser.add_argument("--host", default="0.0.0.0", help="监听主机 (默认: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="监听端口 (默认: 8000)")
    parser.add_argument("--no-reload", action="store_true", help="禁用自动重载")
    parser.add_argument("--install", action="store_true", help="安装依赖")
    
    args = parser.parse_args()
    
    # 创建目录
    create_directories()
    
    # 如果指定了安装参数或检查依赖失败，则安装依赖
    if args.install or not check_dependencies():
        if not install_dependencies():
            return
    
    # 启动服务
    start_service(args.host, args.port, not args.no_reload)

if __name__ == "__main__":
    main() 