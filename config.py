"""
config.py - 應用程式設定
AI 教學平台 - 生成式 AI 實務決策流程
"""
import os

# 基礎設定
SECRET_KEY = 'ai-teaching-nycu-ieem-2024'
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'database', 'ai_teaching.db')

# 教學模式設定
TEACHING_MODES = {
    'guided': '教學模式（顯示提示）',
    'challenge': '挑戰模式（隱藏提示）'
}

# 單元色彩對應（Tailwind 色彩類別）
UNIT_COLORS = {
    'A': 'blue',
    'B': 'purple',
    'C': 'green',
    'case': 'orange'
}

# 評分權重（整合案例）
CASE_SCORING = {
    'prompt': 25,       # Prompt 完整性
    'model': 25,        # 模型選型合理性
    'deployment': 25,   # 部署決策合理性
    'risk': 25          # 風險意識與驗證規劃
}
