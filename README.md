# 🏭 生成式 AI 實務決策流程 - 互動式教學平台

**交通大學工業工程系碩士班 | 教學用途**

> 從 Prompt 設計 → 模型選型 → 硬體與部署選型 → 工廠整合案例
> 讓學生在課堂中透過互動操作，建立 AI 工程決策的完整思維框架。

---

## 🚀 快速啟動

### 1. 安裝依賴
```bash
pip install flask
```

### 2. 初始化資料庫
```bash
python database/init_db.py
```

### 3. 啟動應用程式
```bash
python app.py
```

### 4. 開啟瀏覽器
```
http://localhost:5000
```

---

## 📁 專案目錄結構

```
Prompt teach/
├── app.py                     # Flask 主應用（路由 + API + 評分邏輯）
├── config.py                  # 設定檔（密鑰、路徑、評分權重）
├── requirements.txt           # Python 依賴（只需 flask）
├── README.md                  # 本文件
│
├── database/
│   ├── init_db.py             # 初始化腳本（Schema + Seed Data）
│   └── ai_teaching.db         # SQLite 資料庫（執行後自動生成）
│
├── static/
│   ├── css/
│   │   └── custom.css         # 自訂樣式（動畫、拖拉、Model Card 等）
│   └── js/
│       ├── main.js            # 共用 JS（Toast、測驗渲染、答案收集）
│       ├── unit_a.js          # 單元 A（五要素、角色結構、改寫遊戲）
│       ├── unit_b.js          # 單元 B（選型流程、Model Card、PK）
│       ├── unit_c.js          # 單元 C（部署比較、模擬器、成本試算）
│       └── case.js            # 整合案例（4步驟提案）
│
└── templates/
    ├── base.html              # 基底模板（導覽、進度條、Toast）
    ├── index.html             # 首頁 Dashboard
    ├── teacher.html           # 教師管理面板
    ├── unit_a/
    │   └── index.html         # 單元 A（6個分頁）
    ├── unit_b/
    │   └── index.html         # 單元 B（5個分頁）
    ├── unit_c/
    │   └── index.html         # 單元 C（6個分頁）
    └── case/
        ├── index.html         # 整合案例（4個步驟）
        └── certificate.html   # 完成證書（可列印）
```

---

## 🎓 課堂使用方式

### 教師操作流程

1. **課前準備**（5分鐘）
   ```bash
   python database/init_db.py  # 重置/初始化資料庫
   python app.py               # 啟動服務
   ```

2. **開啟投影**：`http://localhost:5000`

3. **課堂模式切換**：
   - 教學模式（預設）：顯示提示，適合說明概念
   - 挑戰模式：隱藏提示，適合學生獨立練習

4. **學生個別操作**：同一台機器可多人用（不同瀏覽器 Session）

5. **課後管理**：`http://localhost:5000/teacher`
   - 查看完成人數統計
   - 匯出學生答案 CSV
   - 一鍵重置全班資料

### 推薦教學順序

```
首頁 Dashboard → 單元A → 單元B → 單元C → 整合案例 → 證書
（約 3-4 小時課程）
```

### 分段教學建議

| 時段 | 內容 | 重點活動 |
|------|------|---------|
| 第1節（60分） | 單元A | A-1五要素、A-1.5角色結構、A-2改寫遊戲 |
| 第2節（60分） | 單元B | B-1選型流程、B-2 Model Card 解剖、B-3 PK |
| 第3節（45分） | 單元C | C-1比較、C-2決策模擬器、C-4成本試算 |
| 第4節（75分） | 整合案例 | 步驟1-4完整設計 + 小組討論 |

---

## ✨ 功能完整清單

### 單元 A：Prompt 核心原理
- [x] A-1 Prompt 五要素互動卡（點開展開、好壞比較）
- [x] A-1.5 角色結構（System/User/Assistant）
  - [x] 角色卡片說明
  - [x] 三版本比較實驗
  - [x] 拖拉分類練習（點選式）
  - [x] 角色分層設計模板
  - [x] 角色誤區提醒（5項）
  - [x] 角色結構小測驗（5題）
- [x] A-2 Prompt 改寫遊戲（提示標籤 + 即時評分）
- [x] A-3 同題對比實驗（4個版本切換 + Chart.js 比較圖）
- [x] A-4 常見誤區（8項警示卡）
- [x] A-5 小測驗（5題：是非 + 單選 + 排序）

### 單元 B：模型挑選與 Model Card
- [x] B-1 選型六步驟流程（點開展開 + 工廠場景 + 誤判）
- [x] B-2 Model Card 解剖台（3個模型 + 標記類別 + 即時回饋）
- [x] B-3 模型 PK（任務情境 + 選型表單 + Rubric 評分）
- [x] B-4 常見誤區（5項）
- [x] B-5 小測驗（5題：單選 + 配對 + 情境題）

### 單元 C：硬體與部署選型
- [x] C-1 三方案比較（雲端/混合/地端卡片 + 決策矩陣）
- [x] C-2 決策模擬器（6個條件滑桿/選項 → 推薦方案）
- [x] C-3 記憶體估算互動器（參數量/精度/context → GPU 建議）
- [x] C-4 成本試算工具（雲端 vs 地端月成本 + 損益平衡）
- [x] C-5 常見誤區（5項）
- [x] C-6 小測驗（5題）

### 整合案例：工廠設備異常通報助手
- [x] 情境說明（6個條件 + 異常資料預覽）
- [x] 步驟1：Prompt 設計（五要素 + 角色分層）
- [x] 步驟2：模型選型（卡片比較 + 選型表單）
- [x] 步驟3：部署方案（條件輸入 + PoC 計畫）
- [x] 步驟4：總結提案（摘要 + 誤區清單 + 驗證計畫）
- [x] 即時評分（每步驟 0-100 分）

### 系統功能
- [x] 首頁 Dashboard（學習路徑 + 進度條 + 徽章）
- [x] 課堂模式切換（教學 / 挑戰）
- [x] 學生姓名設定
- [x] 全局進度追蹤（SQLite）
- [x] 徽章系統（4個徽章 + 完成證書）
- [x] 教師面板（統計 + 匯出 + 重置）
- [x] 完成證書（可列印）

---

## 🗄️ 資料庫結構

| 資料表 | 用途 |
|--------|------|
| `users` | Session 使用者 |
| `lesson_progress` | 課程進度 |
| `quiz_attempts` | 測驗作答紀錄 |
| `prompt_exercises` | Prompt 改寫練習 |
| `prompt_role_exercises` | 角色分類練習 |
| `model_selection_exercises` | 模型 PK 結果 |
| `deployment_simulations` | 部署方案模擬 |
| `final_case_submissions` | 整合案例提案 |
| `quiz_questions` | 測驗題庫（Seed） |
| `model_cards` | 模型卡資料（Seed） |
| `factory_anomalies` | 工廠異常資料（Seed，20筆）|
| `role_classification_fragments` | 角色分類練習題（Seed，8筆）|
| `prompt_versions` | Prompt 版本比較資料（Seed）|

---

## 🔧 常見問題

**Q: 資料庫找不到？**
```bash
python database/init_db.py
```

**Q: Port 5000 被佔用？**
```python
# 修改 app.py 最後一行
app.run(debug=True, host='0.0.0.0', port=5001)
```

**Q: 如何重置所有學生資料？**
- 方法1：瀏覽器 `http://localhost:5000/teacher` → 輸入 `RESET_ALL`
- 方法2：刪除 `database/ai_teaching.db` 後重新 `python database/init_db.py`

---

## 📝 技術棧

| 層次 | 技術 |
|------|------|
| Backend | Python 3.8+ / Flask |
| Database | SQLite（標準庫，無需安裝）|
| Frontend | HTML5 + Tailwind CSS（CDN）|
| 互動 | jQuery（CDN）|
| 圖表 | Chart.js（CDN）|
| 圖示 | Font Awesome（CDN）|

**不需要外部 API，可完全本地端運行。**

---

*教學用途。本地端運行，不依賴外部 API。*
*交通大學工業工程系碩士班 - 生成式 AI 實務決策流程*
