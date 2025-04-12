from fastapi import APIRouter, HTTPException
from typing import Dict
import tensorflow as tf
import numpy as np
import pandas as pd
import sklearn
import os
import logging
import time

router = APIRouter()
logger = logging.getLogger("ml_service")

@router.get("/health")
async def health_check() -> Dict:
    """
    健康检查接口，返回服务状态和环境信息
    """
    try:
        # 检查依赖库
        tf_version = tf.__version__
        np_version = np.__version__
        pd_version = pd.__version__
        sklearn_version = sklearn.__version__
        
        # 检查模型目录
        model_path = os.path.join(os.getcwd(), "models")
        has_models = os.path.exists(model_path)
        
        return {
            "status": "ok",
            "timestamp": time.time(),
            "environment": {
                "tensorflow": tf_version,
                "numpy": np_version,
                "pandas": pd_version,
                "scikit-learn": sklearn_version,
            },
            "models_available": has_models,
        }
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"服务异常: {str(e)}") 