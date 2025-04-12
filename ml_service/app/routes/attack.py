from fastapi import APIRouter, HTTPException, Body
from typing import Dict, List, Any
import logging
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import os
import tensorflow as tf

router = APIRouter()
logger = logging.getLogger("ml_service")

# 默认分类模型
default_classifier = None

def load_default_classifier():
    """加载默认攻击分类模型"""
    global default_classifier
    if default_classifier is None:
        default_classifier = RandomForestClassifier(
            n_estimators=100, 
            random_state=42
        )
        logger.info("加载默认攻击分类模型: Random Forest")

@router.post("/attack")
async def classify_traffic(data: Dict[str, List[Any]] = Body(...)) -> Dict:
    """
    对流量进行攻击类型分类
    
    参数:
    - features: 要分析的流量特征
    
    返回:
    - classifications: 分类结果列表
    - probabilities: 概率分布列表
    """
    try:
        if "features" not in data or not data["features"]:
            return {"classifications": [], "probabilities": []}
        
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
        num_packets = len(numerical_features)
        
        # 由于是实际环境中可能没有标签数据，我们使用基于规则的方法生成伪标签
        # 这里仅为示例，实际应用中应该用预训练好的模型
        
        classifications = []
        probabilities = []
        
        for feature in feature_array:
            packet_length = feature[0]
            src_port = feature[1]
            dst_port = feature[2]
            protocol = feature[3]
            tcp_flags = feature[4]
            
            # 简单规则检测
            is_normal = True
            is_ddos = False
            is_portscan = False
            is_other = False
            
            # DDoS特征：大量SYN包、小包
            if protocol == 1 and (tcp_flags & 1) and packet_length < 100:
                is_ddos = True
                is_normal = False
            
            # 端口扫描特征：目标是高端口、SYN包
            if dst_port > 1024 and (tcp_flags & 1) and protocol == 1:
                is_portscan = True
                is_normal = False
            
            # 分类决策
            if is_ddos:
                classifications.append('ddos')
                probabilities.append([0.1, 0.8, 0.05, 0.05])  # [normal, ddos, portscan, other]
            elif is_portscan:
                classifications.append('portscan')
                probabilities.append([0.1, 0.05, 0.8, 0.05])
            elif is_normal:
                classifications.append('normal')
                probabilities.append([0.9, 0.03, 0.03, 0.04])
            else:
                classifications.append('other')
                probabilities.append([0.2, 0.2, 0.2, 0.4])
        
        return {
            "classifications": classifications,
            "probabilities": probabilities
        }
        
    except Exception as e:
        logger.error(f"攻击分类失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"攻击分类失败: {str(e)}") 