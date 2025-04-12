from fastapi import APIRouter, HTTPException, Body
from typing import Dict, List, Any
import logging
import numpy as np
from sklearn.ensemble import IsolationForest
import os
import tensorflow as tf

router = APIRouter()
logger = logging.getLogger("ml_service")

# 默认异常检测模型
default_model = None

def load_default_model():
    """加载默认异常检测模型"""
    global default_model
    if default_model is None:
        default_model = IsolationForest(
            contamination=0.1, 
            random_state=42
        )
        logger.info("加载默认异常检测模型: Isolation Forest")

@router.post("/anomaly")
async def detect_anomalies(data: Dict[str, List[Any]] = Body(...)) -> Dict:
    """
    检测流量数据中的异常
    
    参数:
    - features: 要分析的流量特征
    
    返回:
    - anomalies: 异常索引列表
    - scores: 异常分数列表
    """
    try:
        if "features" not in data or not data["features"]:
            return {"anomalies": [], "scores": []}
        
        features = data["features"]
        
        # 提取数值特征
        numerical_features = []
        for packet in features:
            # 基本特征提取
            protocol_num = 0
            if packet.get("protocol"):
                if packet["protocol"].lower() == "tcp":
                    protocol_num = 1
                elif packet["protocol"].lower() == "udp":
                    protocol_num = 2
                elif packet["protocol"].lower() == "icmp":
                    protocol_num = 3
                    
            tcp_flags = 0
            if packet.get("tcpFlags"):
                flags = packet["tcpFlags"]
                if "SYN" in flags: tcp_flags |= 1
                if "ACK" in flags: tcp_flags |= 2
                if "FIN" in flags: tcp_flags |= 4
                if "RST" in flags: tcp_flags |= 8
                if "PSH" in flags: tcp_flags |= 16
                if "URG" in flags: tcp_flags |= 32
                
            # 创建特征向量
            feature_vector = [
                packet.get("length", 0),
                packet.get("sourcePort", 0),
                packet.get("destinationPort", 0),
                protocol_num,
                tcp_flags
            ]
            numerical_features.append(feature_vector)
            
        # 转换为NumPy数组
        feature_array = np.array(numerical_features)
        
        # 加载默认模型
        load_default_model()
        
        # 训练并预测
        default_model.fit(feature_array)
        predictions = default_model.predict(feature_array)
        scores = default_model.decision_function(feature_array)
        
        # 检测异常 (-1表示异常)
        anomalies = [i for i, pred in enumerate(predictions) if pred == -1]
        normalized_scores = -scores  # 分数越高表示越异常
        
        return {
            "anomalies": anomalies,
            "scores": normalized_scores.tolist()
        }
        
    except Exception as e:
        logger.error(f"异常检测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"异常检测失败: {str(e)}")

@router.post("/batch")
async def batch_predict(data: Dict[str, List[Any]] = Body(...)) -> Dict:
    """
    批量预测接口，同时执行异常检测和攻击分类
    
    参数:
    - packets: 数据包列表
    
    返回:
    - anomalies: 异常索引列表
    - classifications: 分类结果列表
    """
    try:
        if "packets" not in data or not data["packets"]:
            return {
                "anomalies": [],
                "classifications": [],
                "status": "success",
                "message": "没有数据包需要分析"
            }
        
        # 这里将数据转换为features格式，然后调用其他接口
        # 在实际实现中应该有更高效的处理方式
        
        # 先调用异常检测
        anomaly_result = await detect_anomalies({"features": data["packets"]})
        
        # 调用攻击分类
        # 导入攻击分类函数
        from app.routes.attack import classify_traffic
        classification_result = await classify_traffic({"features": data["packets"]})
        
        return {
            "anomalies": anomaly_result.get("anomalies", []),
            "scores": anomaly_result.get("scores", []),
            "classifications": classification_result.get("classifications", []),
            "probabilities": classification_result.get("probabilities", []),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"批量预测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"批量预测失败: {str(e)}") 