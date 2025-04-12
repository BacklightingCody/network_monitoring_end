#!/usr/bin/env python
"""
Python机器学习服务测试脚本
"""
import requests
import json
import sys
import time
import argparse
from datetime import datetime

def test_health(base_url):
    """测试健康检查接口"""
    url = f"{base_url}/api/health"
    try:
        print(f"测试健康检查: {url}")
        response = requests.get(url)
        data = response.json()
        
        if response.status_code == 200 and data.get("status") == "ok":
            print("✅ 健康检查成功")
            print(f"TensorFlow版本: {data['environment']['tensorflow']}")
            print(f"NumPy版本: {data['environment']['numpy']}")
            return True
        else:
            print(f"❌ 健康检查失败: {data}")
            return False
    except Exception as e:
        print(f"❌ 健康检查异常: {str(e)}")
        return False

def test_model_info(base_url):
    """测试模型信息接口"""
    url = f"{base_url}/api/model/info"
    try:
        print(f"测试模型信息: {url}")
        response = requests.get(url)
        data = response.json()
        
        print(f"模型信息: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return True
    except Exception as e:
        print(f"❌ 获取模型信息异常: {str(e)}")
        return False

def test_anomaly_detection(base_url):
    """测试异常检测接口"""
    url = f"{base_url}/api/predict/anomaly"
    
    # 构造测试数据
    test_data = {
        "features": [
            {
                "length": 64,
                "sourcePort": 1234,
                "destinationPort": 80,
                "protocol": "TCP",
                "tcpFlags": "SYN"
            },
            {
                "length": 1500,
                "sourcePort": 5678,
                "destinationPort": 443,
                "protocol": "TCP",
                "tcpFlags": "ACK"
            },
            # 添加一个异常包
            {
                "length": 20,
                "sourcePort": 12345,
                "destinationPort": 12345,
                "protocol": "TCP",
                "tcpFlags": "SYN"
            }
        ]
    }
    
    try:
        print(f"测试异常检测: {url}")
        response = requests.post(url, json=test_data)
        data = response.json()
        
        print(f"异常检测结果: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return True
    except Exception as e:
        print(f"❌ 异常检测异常: {str(e)}")
        return False

def test_attack_classification(base_url):
    """测试攻击分类接口"""
    url = f"{base_url}/api/predict/attack"
    
    # 构造测试数据
    test_data = {
        "features": [
            {
                "length": 64,
                "sourcePort": 1234,
                "destinationPort": 80,
                "protocol": "TCP",
                "tcpFlags": "SYN"
            },
            # 添加一个看起来像DDoS的包
            {
                "length": 40,
                "sourcePort": 12345,
                "destinationPort": 80,
                "protocol": "TCP",
                "tcpFlags": "SYN"
            },
            # 添加一个看起来像端口扫描的包
            {
                "length": 64,
                "sourcePort": 1234,
                "destinationPort": 8080,
                "protocol": "TCP",
                "tcpFlags": "SYN"
            }
        ]
    }
    
    try:
        print(f"测试攻击分类: {url}")
        response = requests.post(url, json=test_data)
        data = response.json()
        
        print(f"攻击分类结果: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return True
    except Exception as e:
        print(f"❌ 攻击分类异常: {str(e)}")
        return False

def test_feature_extraction(base_url):
    """测试特征提取接口"""
    url = f"{base_url}/api/feature/extract"
    
    # 构造测试数据
    test_data = {
        "packets": [
            {
                "id": 1,
                "length": 64,
                "sourcePort": 1234,
                "destinationPort": 80,
                "protocol": "TCP",
                "tcpFlags": "SYN",
                "sourceIp": "192.168.1.1",
                "destinationIp": "10.0.0.1",
                "timestamp": datetime.now().isoformat()
            },
            {
                "id": 2,
                "length": 1500,
                "sourcePort": 5678,
                "destinationPort": 443,
                "protocol": "TCP",
                "tcpFlags": "ACK",
                "sourceIp": "192.168.1.2",
                "destinationIp": "10.0.0.2",
                "timestamp": datetime.now().isoformat()
            }
        ]
    }
    
    try:
        print(f"测试特征提取: {url}")
        response = requests.post(url, json=test_data)
        data = response.json()
        
        print(f"特征提取结果: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return True
    except Exception as e:
        print(f"❌ 特征提取异常: {str(e)}")
        return False

def test_batch_prediction(base_url):
    """测试批量预测接口"""
    url = f"{base_url}/api/predict/batch"
    
    # 构造测试数据
    test_data = {
        "packets": [
            {
                "id": 1,
                "length": 64,
                "sourcePort": 1234,
                "destinationPort": 80,
                "protocol": "TCP",
                "tcpFlags": "SYN",
                "sourceIp": "192.168.1.1",
                "destinationIp": "10.0.0.1"
            },
            # 添加一个看起来像DDoS的包
            {
                "id": 2,
                "length": 40,
                "sourcePort": 12345,
                "destinationPort": 80,
                "protocol": "TCP",
                "tcpFlags": "SYN",
                "sourceIp": "192.168.1.2",
                "destinationIp": "10.0.0.1"
            }
        ]
    }
    
    try:
        print(f"测试批量预测: {url}")
        response = requests.post(url, json=test_data)
        data = response.json()
        
        print(f"批量预测结果: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return True
    except Exception as e:
        print(f"❌ 批量预测异常: {str(e)}")
        return False

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="Python机器学习服务测试脚本")
    parser.add_argument("--url", default="http://localhost:8000", help="服务基础URL")
    parser.add_argument("--test", choices=["all", "health", "model", "anomaly", "attack", "feature", "batch"], 
                       default="all", help="要测试的接口")
    
    args = parser.parse_args()
    base_url = args.url
    
    print(f"开始测试 {base_url} 的API接口...")
    
    if args.test in ["all", "health"]:
        if not test_health(base_url):
            print("健康检查失败，终止测试")
            if args.test == "all":
                return
    
    if args.test in ["all", "model"]:
        test_model_info(base_url)
    
    if args.test in ["all", "anomaly"]:
        test_anomaly_detection(base_url)
    
    if args.test in ["all", "attack"]:
        test_attack_classification(base_url)
    
    if args.test in ["all", "feature"]:
        test_feature_extraction(base_url)
    
    if args.test in ["all", "batch"]:
        test_batch_prediction(base_url)
    
    print("测试完成")

if __name__ == "__main__":
    main() 