from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, List, Optional
import os
import logging
import tensorflow as tf
import json
from datetime import datetime

router = APIRouter()
logger = logging.getLogger("ml_service")

# 模型目录
MODEL_DIR = os.path.join(os.getcwd(), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# 模型信息文件
MODEL_INFO_FILE = os.path.join(MODEL_DIR, "model_info.json")

# 初始化模型信息
if not os.path.exists(MODEL_INFO_FILE):
    with open(MODEL_INFO_FILE, "w") as f:
        json.dump({
            "models": [],
            "last_updated": str(datetime.now())
        }, f)

@router.get("/info")
async def get_model_info() -> Dict:
    """
    获取已加载模型的信息
    """
    try:
        if os.path.exists(MODEL_INFO_FILE):
            with open(MODEL_INFO_FILE, "r") as f:
                model_info = json.load(f)
            return model_info
        else:
            return {
                "models": [],
                "last_updated": str(datetime.now())
            }
    except Exception as e:
        logger.error(f"获取模型信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取模型信息失败: {str(e)}")

@router.post("/update")
async def update_model_info(model_info: Dict) -> Dict:
    """
    更新模型信息
    """
    try:
        with open(MODEL_INFO_FILE, "w") as f:
            model_info["last_updated"] = str(datetime.now())
            json.dump(model_info, f)
        return {"status": "success", "message": "模型信息已更新"}
    except Exception as e:
        logger.error(f"更新模型信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新模型信息失败: {str(e)}")

@router.post("/upload")
async def upload_model(
    file: UploadFile = File(...),
    model_name: str = None,
    model_type: str = None,
    description: str = None
) -> Dict:
    """
    上传新模型
    """
    if not model_name:
        model_name = file.filename
        
    if not model_type:
        model_type = "unknown"
    
    try:
        # 创建模型目录
        model_path = os.path.join(MODEL_DIR, model_name)
        os.makedirs(model_path, exist_ok=True)
        
        # 保存模型文件
        file_path = os.path.join(model_path, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 更新模型信息
        model_info = await get_model_info()
        model_info["models"].append({
            "name": model_name,
            "type": model_type,
            "path": model_path,
            "description": description,
            "uploaded_at": str(datetime.now())
        })
        
        await update_model_info(model_info)
        
        return {
            "status": "success",
            "message": f"模型 {model_name} 上传成功",
            "file_name": file.filename,
            "model_path": model_path
        }
    except Exception as e:
        logger.error(f"上传模型失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"上传模型失败: {str(e)}") 