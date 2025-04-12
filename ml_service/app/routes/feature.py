from fastapi import APIRouter, HTTPException, Body
from typing import Dict, List, Any
import logging
import numpy as np
import pandas as pd
from datetime import datetime
import tensorflow as tf
import os

router = APIRouter()
logger = logging.getLogger("ml_service")

@router.post("/extract")
async def extract_features(data: Dict[str, List[Any]] = Body(...)) -> Dict:
    """
    从原始流量包中提取特征
    
    参数:
    - packets: 数据包列表
    
    返回:
    - features: 提取的特征列表
    """
    try:
        if "packets" not in data or not data["packets"]:
            return {"features": []}
        
        packets = data["packets"]
        extracted_features = []
        
        # 基本特征提取，扩展更多高级特征
        for packet in packets:
            packet_id = packet.get("id")
            length = packet.get("length", 0)
            protocol = packet.get("protocol", "")
            src_ip = packet.get("sourceIp", "")
            dst_ip = packet.get("destinationIp", "")
            src_port = packet.get("sourcePort", 0)
            dst_port = packet.get("destinationPort", 0)
            tcp_flags = packet.get("tcpFlags", "")
            timestamp = packet.get("timestamp", datetime.now().isoformat())
            
            # 特征提取
            # 1. 基本长度特征
            is_small_packet = 1 if length < 100 else 0
            
            # 2. 协议编码
            protocol_features = {
                "is_tcp": 1 if protocol.lower() == "tcp" else 0,
                "is_udp": 1 if protocol.lower() == "udp" else 0,
                "is_icmp": 1 if protocol.lower() == "icmp" else 0
            }
            
            # 3. 端口特征
            port_features = {
                "is_http_port": 1 if dst_port == 80 or src_port == 80 else 0,
                "is_https_port": 1 if dst_port == 443 or src_port == 443 else 0,
                "is_dns_port": 1 if dst_port == 53 or src_port == 53 else 0,
                "is_high_port": 1 if dst_port > 1024 or src_port > 1024 else 0
            }
            
            # 4. TCP标志特征
            flag_features = {
                "has_syn": 1 if "SYN" in tcp_flags else 0,
                "has_ack": 1 if "ACK" in tcp_flags else 0,
                "has_fin": 1 if "FIN" in tcp_flags else 0,
                "has_rst": 1 if "RST" in tcp_flags else 0,
                "has_psh": 1 if "PSH" in tcp_flags else 0,
                "has_urg": 1 if "URG" in tcp_flags else 0,
                "syn_ack": 1 if "SYN" in tcp_flags and "ACK" in tcp_flags else 0,
            }
            
            # 组合特征
            feature = {
                "packet_id": packet_id,
                "length": length,
                "is_small_packet": is_small_packet,
                **protocol_features,
                **port_features,
                **flag_features,
                # 原始数据也保留
                "sourceIp": src_ip,
                "destinationIp": dst_ip,
                "sourcePort": src_port,
                "destinationPort": dst_port,
                "protocol": protocol,
                "timestamp": timestamp
            }
            
            extracted_features.append(feature)
            
        return {
            "features": extracted_features,
            "count": len(extracted_features)
        }
    
    except Exception as e:
        logger.error(f"特征提取失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"特征提取失败: {str(e)}") 