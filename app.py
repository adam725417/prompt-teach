"""
app.py - AI 教學平台主應用程式
生成式 AI 實務決策流程：Prompt → 模型選型 → 硬體與部署選型
交通大學工業工程系碩士班教學平台

執行方式：python app.py
"""
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import sqlite3
import json
import os
import uuid
from datetime import datetime
from functools import wraps

# 初始化 Flask
app = Flask(__name__)
app.secret_key = 'ai-teaching-nycu-ieem-2024'

# 資料庫路徑
DATABASE = os.path.join(os.path.dirname(__file__), 'database', 'ai_teaching.db')

# ==============================================================
# 資料庫輔助函數
# ==============================================================

def get_db():
    """取得資料庫連線（每次 request 使用獨立連線）"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def query_db(query, args=(), one=False):
    """執行查詢並回傳結果"""
    conn = get_db()
    try:
        cur = conn.execute(query, args)
        rv = cur.fetchall()
        conn.commit()
        return (rv[0] if rv else None) if one else rv
    finally:
        conn.close()

def execute_db(query, args=()):
    """執行寫入操作"""
    conn = get_db()
    try:
        cur = conn.execute(query, args)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()

def ensure_db():
    """確保資料庫存在，不存在則自動初始化"""
    if not os.path.exists(DATABASE):
        from database.init_db import init_database
        init_database()

def get_or_create_user():
    """取得或建立 Session 使用者"""
    ensure_db()
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    user_id = session['user_id']

    # 確保使用者存在於 DB
    user = query_db("SELECT * FROM users WHERE id = ?", [user_id], one=True)
    if not user:
        execute_db(
            "INSERT INTO users (id, name, mode) VALUES (?, ?, ?)",
            [user_id, session.get('user_name', '學生'), 'guided']
        )
    return user_id

def get_user_progress(user_id):
    """取得使用者的學習進度"""
    progress_rows = query_db(
        "SELECT unit, lesson, completed, score FROM lesson_progress WHERE user_id = ?",
        [user_id]
    )
    progress = {}
    for row in progress_rows:
        key = f"{row['unit']}_{row['lesson']}"
        progress[key] = {'completed': row['completed'], 'score': row['score']}
    return progress

def mark_lesson_complete(user_id, unit, lesson, score=0):
    """標記課程完成"""
    existing = query_db(
        "SELECT id FROM lesson_progress WHERE user_id = ? AND unit = ? AND lesson = ?",
        [user_id, unit, lesson], one=True
    )
    if existing:
        execute_db(
            "UPDATE lesson_progress SET completed = 1, score = ?, completed_at = ? WHERE id = ?",
            [score, datetime.now().isoformat(), existing['id']]
        )
    else:
        execute_db(
            "INSERT INTO lesson_progress (user_id, unit, lesson, completed, score, completed_at) VALUES (?, ?, ?, 1, ?, ?)",
            [user_id, unit, lesson, score, datetime.now().isoformat()]
        )

# ==============================================================
# 首頁 / Dashboard
# ==============================================================

@app.route('/')
def index():
    """首頁 Dashboard"""
    user_id = get_or_create_user()
    progress = get_user_progress(user_id)
    user = query_db("SELECT * FROM users WHERE id = ?", [user_id], one=True)

    # 計算完成單元數
    completed_units = set()
    for key, val in progress.items():
        if val['completed']:
            unit = key.split('_')[0]
            completed_units.add(unit)

    # 計算整體進度百分比（共 4 大單元：A, B, C, case）
    overall_progress = min(int(len(completed_units) / 4 * 100), 100)

    return render_template('index.html',
        user_id=user_id,
        user_name=user['name'] if user else '學生',
        user_mode=user['mode'] if user else 'guided',
        progress=progress,
        completed_units=list(completed_units),
        overall_progress=overall_progress
    )

@app.route('/set-mode', methods=['POST'])
def set_mode():
    """切換教學模式"""
    data = request.get_json()
    mode = data.get('mode', 'guided')
    user_id = get_or_create_user()
    execute_db("UPDATE users SET mode = ? WHERE id = ?", [mode, user_id])
    session['mode'] = mode
    return jsonify({'success': True, 'mode': mode})

@app.route('/set-name', methods=['POST'])
def set_name():
    """設定使用者名稱"""
    data = request.get_json()
    name = data.get('name', '學生')
    user_id = get_or_create_user()
    execute_db("UPDATE users SET name = ? WHERE id = ?", [name, user_id])
    session['user_name'] = name
    return jsonify({'success': True, 'name': name})

# ==============================================================
# 單元 A：Prompt 核心原理
# ==============================================================

@app.route('/unit-a')
def unit_a():
    """單元 A 主頁面（含所有子模組）"""
    user_id = get_or_create_user()
    progress = get_user_progress(user_id)
    user = query_db("SELECT mode FROM users WHERE id = ?", [user_id], one=True)
    mode = user['mode'] if user else 'guided'

    # 取得 Prompt 版本比較資料
    pv_row = query_db("SELECT data FROM prompt_versions WHERE id = 'MAIN'", one=True)
    prompt_versions = json.loads(pv_row['data']) if pv_row else {}

    # 取得角色分類練習題
    fragments = query_db("SELECT * FROM role_classification_fragments ORDER BY id")
    fragments_list = [dict(f) for f in fragments]

    # 取得角色相關測驗題
    role_quizzes = []
    quiz_rows = query_db("SELECT data FROM quiz_questions WHERE unit = 'A_role' ORDER BY id")
    for row in quiz_rows:
        role_quizzes.append(json.loads(row['data']))

    # 取得 A 單元測驗題
    a_quizzes = []
    quiz_rows = query_db("SELECT data FROM quiz_questions WHERE unit = 'A' ORDER BY id")
    for row in quiz_rows:
        a_quizzes.append(json.loads(row['data']))

    tab = request.args.get('tab', 'a1')

    return render_template('unit_a/index.html',
        user_id=user_id,
        mode=mode,
        progress=progress,
        prompt_versions=json.dumps(prompt_versions, ensure_ascii=False),
        fragments=json.dumps(fragments_list, ensure_ascii=False),
        role_quizzes=json.dumps(role_quizzes, ensure_ascii=False),
        a_quizzes=json.dumps(a_quizzes, ensure_ascii=False),
        active_tab=tab
    )

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    """提交測驗答案"""
    user_id = get_or_create_user()
    data = request.get_json()
    unit = data.get('unit')
    answers = data.get('answers', [])  # [{question_id, answer}]

    # 批次評分
    correct = 0
    total = len(answers)
    results = []

    for ans in answers:
        q_row = query_db("SELECT data FROM quiz_questions WHERE id = ?", [ans['question_id']], one=True)
        if not q_row:
            continue
        q = json.loads(q_row['data'])

        is_correct = check_answer(q, ans['answer'])
        score = 100 // total if is_correct else 0

        answer_val = json.dumps(ans['answer'], ensure_ascii=False) if isinstance(ans['answer'], (list, dict)) else (ans['answer'] or '')
        execute_db("""
            INSERT INTO quiz_attempts (user_id, unit, question_id, answer, is_correct, score)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [user_id, unit, ans['question_id'], answer_val, int(is_correct), score])

        if is_correct:
            correct += 1

        # 配對題：將正確答案格式化為可讀字串
        correct_answer = q.get('answer')
        if q.get('type') == 'matching':
            correct_answer = '；'.join([f"{p['item']} → {p['match']}" for p in q.get('pairs', [])])

        results.append({
            'question_id': ans['question_id'],
            'is_correct': is_correct,
            'explanation': q.get('explanation', ''),
            'correct_answer': correct_answer
        })

    # 計算總分
    total_score = int(correct / total * 100) if total > 0 else 0

    # 標記課程完成
    lesson_map = {'A': 'A5', 'A_role': 'A15', 'B': 'B5', 'C': 'C6'}
    lesson = lesson_map.get(unit, unit)
    mark_lesson_complete(user_id, unit[0] if unit != 'A_role' else 'A', lesson, total_score)

    return jsonify({
        'success': True,
        'score': total_score,
        'correct': correct,
        'total': total,
        'results': results
    })

def check_answer(question, user_answer):
    """判斷答案是否正確"""
    q_type = question.get('type')
    correct = question.get('answer')

    if q_type in ['true_false', 'single_choice', 'scenario']:
        return str(user_answer).lower() == str(correct).lower()
    elif q_type == 'ordering':
        if isinstance(user_answer, list) and isinstance(correct, list):
            return user_answer == correct
        return False
    elif q_type == 'matching':
        if isinstance(user_answer, dict) and user_answer:
            correct_pairs = {p['item']: p['match'] for p in question.get('pairs', [])}
            return user_answer == correct_pairs
        return False
    return False

@app.route('/api/role-exercise/submit', methods=['POST'])
def submit_role_exercise():
    """提交角色分類練習"""
    user_id = get_or_create_user()
    data = request.get_json()
    user_answers = data.get('answers', {})  # {fragment_id: role}

    # 對照正確答案
    fragments = query_db("SELECT id, correct_role, explanation FROM role_classification_fragments")
    correct_count = 0
    total = len(fragments)
    feedback = []

    for frag in fragments:
        frag_id = frag['id']
        user_role = user_answers.get(frag_id, '')
        is_correct = user_role == frag['correct_role']
        if is_correct:
            correct_count += 1
        feedback.append({
            'id': frag_id,
            'is_correct': is_correct,
            'correct_role': frag['correct_role'],
            'explanation': frag['explanation']
        })

    score = int(correct_count / total * 100) if total > 0 else 0

    # 儲存到 DB
    execute_db("""
        INSERT INTO prompt_role_exercises (user_id, exercise_id, user_answers, correct_count, total_count, score)
        VALUES (?, ?, ?, ?, ?, ?)
    """, [user_id, 'ROLE_DRAG_01', json.dumps(user_answers), correct_count, total, score])

    mark_lesson_complete(user_id, 'A', 'A15', score)

    return jsonify({
        'success': True,
        'score': score,
        'correct': correct_count,
        'total': total,
        'feedback': feedback
    })

@app.route('/api/prompt-exercise/submit', methods=['POST'])
def submit_prompt_exercise():
    """提交 Prompt 改寫練習"""
    user_id = get_or_create_user()
    data = request.get_json()

    # 計算得分（根據五要素完整性）
    flags = {
        'has_goal': data.get('has_goal', False),
        'has_context': data.get('has_context', False),
        'has_constraints': data.get('has_constraints', False),
        'has_format': data.get('has_format', False),
        'has_evaluation': data.get('has_evaluation', False)
    }

    # 每個要素 20 分
    score = sum(20 for v in flags.values() if v)

    # 生成 AI 助教回饋（規則化）
    feedback = generate_prompt_feedback(flags, score)

    # 儲存到 DB
    execute_db("""
        INSERT INTO prompt_exercises
        (user_id, exercise_id, original_prompt, improved_prompt,
         has_goal, has_context, has_constraints, has_format, has_evaluation, score, feedback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, [user_id, data.get('exercise_id', 'EX01'),
          data.get('original_prompt', ''),
          data.get('improved_prompt', ''),
          int(flags['has_goal']), int(flags['has_context']),
          int(flags['has_constraints']), int(flags['has_format']),
          int(flags['has_evaluation']), score, feedback])

    mark_lesson_complete(user_id, 'A', 'A2', score)

    return jsonify({
        'success': True,
        'score': score,
        'flags': flags,
        'feedback': feedback
    })

def generate_prompt_feedback(flags, score):
    """規則化生成 Prompt 改寫回饋"""
    missing = []
    if not flags['has_goal']: missing.append('任務目標（Goal）')
    if not flags['has_context']: missing.append('背景資料（Context）')
    if not flags['has_constraints']: missing.append('規則限制（Constraints）')
    if not flags['has_format']: missing.append('輸出格式（Output Format）')
    if not flags['has_evaluation']: missing.append('評估標準（Evaluation）')

    if score == 100:
        return "🎉 完美！五大要素全部到位，這個 Prompt 結構清晰，可以直接用於工程部署！"
    elif score >= 80:
        return f"👍 非常好！只差一點點就完美了。缺少的要素：{', '.join(missing)}。補上後可以大幅提升輸出穩定性。"
    elif score >= 60:
        return f"📝 不錯的開始！建議補充：{', '.join(missing)}。記得：格式定義最容易被忽略但最影響串接！"
    elif score >= 40:
        return f"⚠️ 基礎框架有了，但還不夠完整。還需要：{', '.join(missing)}。多了這些，模型才知道「怎麼做」和「做成什麼樣」。"
    else:
        return f"💡 好的起點！但目前 Prompt 還不夠結構化。需要加入：{', '.join(missing)}。Prompt 不是聊天，是工程設計！"

# ==============================================================
# 單元 B：Hugging Face 模型挑選
# ==============================================================

@app.route('/unit-b')
def unit_b():
    """單元 B 主頁面"""
    user_id = get_or_create_user()
    progress = get_user_progress(user_id)
    user = query_db("SELECT mode FROM users WHERE id = ?", [user_id], one=True)
    mode = user['mode'] if user else 'guided'

    # 取得模型卡資料
    model_rows = query_db("SELECT data FROM model_cards ORDER BY id")
    models = [json.loads(row['data']) for row in model_rows]

    # 取得 B 單元測驗題
    b_quizzes = []
    quiz_rows = query_db("SELECT data FROM quiz_questions WHERE unit = 'B' ORDER BY id")
    for row in quiz_rows:
        b_quizzes.append(json.loads(row['data']))

    tab = request.args.get('tab', 'b1')

    return render_template('unit_b/index.html',
        user_id=user_id,
        mode=mode,
        progress=progress,
        models=json.dumps(models, ensure_ascii=False),
        b_quizzes=json.dumps(b_quizzes, ensure_ascii=False),
        active_tab=tab
    )

@app.route('/api/model-selection/submit', methods=['POST'])
def submit_model_selection():
    """提交模型選型 PK 練習"""
    user_id = get_or_create_user()
    data = request.get_json()

    selected = data.get('selected_model', '')
    reason_selected = data.get('reason_selected', '')
    reason_rejected = data.get('reason_rejected', '')
    risk = data.get('risk_assessment', '')
    next_steps = data.get('next_steps', '')
    task_id = data.get('task_id', 'TASK_01')

    suggestion = generate_model_suggestion(selected)

    execute_db("""
        INSERT INTO model_selection_exercises
        (user_id, task_id, selected_model, reason_selected, reason_rejected,
         risk_assessment, next_steps, score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, [user_id, task_id, selected, reason_selected, reason_rejected, risk, next_steps, 0])

    mark_lesson_complete(user_id, 'B', 'B3', 80)

    return jsonify({
        'success': True,
        'suggestion': suggestion
    })

def generate_model_suggestion(selected):
    """根據所選模型給出專業建議"""
    suggestions = {
        'MODEL_A': {
            'verdict': '✅ 本情境的推薦選擇',
            'color': 'green',
            'summary': 'Breeze-7B-Instruct 在這個情境下是最平衡的選擇。Apache 2.0 授權無商用疑慮，繁體中文能力是三者中最優，7B 模型 FP16 約 14GB 可直接在 RTX 3090（24GB）上運行，無需量化就能維持完整精度。',
            'tips': [
                '用 20–50 筆真實工廠異常訊息做小樣本測試，重點驗證 JSON 格式輸出的穩定性',
                '若遇到設備專有術語辨識不準，可考慮用 LoRA 微調加入工廠術語語料',
                '部署時搭配 vLLM 或 Ollama 可進一步提升每日 300 次查詢的吞吐量'
            ]
        },
        'MODEL_B': {
            'verdict': '⚠️ 能力強但有硬體門檻',
            'color': 'yellow',
            'summary': 'Qwen2.5-14B-Instruct 的中文能力（MMLU 79.9%、原生 JSON 輸出）確實是三者中最強，選擇理由充分。但核心問題是：FP16 推論需要約 28GB VRAM，超出單張 RTX 3090（24GB）的上限，必須進行 INT4 量化才能部署。',
            'tips': [
                '使用 INT4 量化（約 9GB）讓模型能在 RTX 3090 上運行，建議用 llama.cpp 或 bitsandbytes',
                '量化後務必用你的工廠任務資料重新測試 JSON 格式符合率，確認精度損失在可接受範圍',
                '若量化後繁中表現下滑明顯，可考慮回頭選 Breeze-7B——在繁中任務上差距其實不大'
            ]
        },
        'MODEL_C': {
            'verdict': '💡 部署成本最低，但繁中是弱點',
            'color': 'blue',
            'summary': 'Phi-3-mini 的 MIT 授權和極低的硬體需求確實有吸引力，在英文邏輯推理上表現也超出同量級模型（MT-Bench 8.38）。但本情境的核心任務是繁體中文工廠術語摘要，而 Phi-3-mini 的中文訓練資料極少，在繁中任務上輸出品質不穩定。',
            'tips': [
                '如果硬體資源真的非常受限，可以先用 Phi-3-mini 做 PoC 快速驗證系統流程可行性',
                '正式上線前，務必用真實工廠異常訊息測試繁中摘要和 JSON 輸出品質——如果達標當然繼續用',
                '若繁中效果不達標，建議轉換到 Breeze-7B（同樣輕量，但繁中能力明顯更好）'
            ]
        }
    }
    return suggestions.get(selected, {
        'verdict': '請選擇一個模型',
        'color': 'gray',
        'summary': '請先選擇候選模型後再提交。',
        'tips': []
    })

# ==============================================================
# 單元 C：硬體與部署選型
# ==============================================================

@app.route('/unit-c')
def unit_c():
    """單元 C 主頁面"""
    user_id = get_or_create_user()
    progress = get_user_progress(user_id)
    user = query_db("SELECT mode FROM users WHERE id = ?", [user_id], one=True)
    mode = user['mode'] if user else 'guided'

    # 取得 C 單元測驗題
    c_quizzes = []
    quiz_rows = query_db("SELECT data FROM quiz_questions WHERE unit = 'C' ORDER BY id")
    for row in quiz_rows:
        c_quizzes.append(json.loads(row['data']))

    tab = request.args.get('tab', 'c1')

    return render_template('unit_c/index.html',
        user_id=user_id,
        mode=mode,
        progress=progress,
        c_quizzes=json.dumps(c_quizzes, ensure_ascii=False),
        active_tab=tab
    )

@app.route('/api/deployment/simulate', methods=['POST'])
def simulate_deployment():
    """部署方案決策模擬器"""
    user_id = get_or_create_user()
    data = request.get_json()

    sensitivity = data.get('sensitivity', '中')    # 低/中/高
    latency = data.get('latency', '分鐘級')         # 即時/分鐘級/批次
    daily_queries = data.get('daily_queries', 300)
    budget = data.get('budget', '中')              # 低/中/高
    ops_capability = data.get('ops_capability', '中')  # 弱/中/強
    needs_intranet = data.get('needs_intranet', False)

    # 決策邏輯（教學版規則引擎）
    result = decide_deployment(sensitivity, latency, daily_queries, budget, ops_capability, needs_intranet)

    execute_db("""
        INSERT INTO deployment_simulations
        (user_id, sensitivity, latency, daily_queries, budget, ops_capability, needs_intranet, recommended_solution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, [user_id, sensitivity, latency, daily_queries, budget, ops_capability,
          int(needs_intranet), result['solution']])

    mark_lesson_complete(user_id, 'C', 'C2', 80)

    return jsonify({'success': True, **result})

def decide_deployment(sensitivity, latency, queries, budget, ops, intranet):
    """
    部署方案決策引擎（規則式，教學用）
    回傳建議方案、理由、風險提醒
    """
    solution = '雲端'
    reasons = []
    risks = []
    next_steps = []

    # 規則1：資料敏感度高 → 傾向地端
    if sensitivity == '高' or intranet:
        solution = '地端'
        reasons.append('資料敏感度高或需要內網整合，資料不可離開內部網路')
        risks.append('地端部署需要 GPU 硬體投資與 MLOps 維運能力')
        next_steps.append('先完成 PoC 驗證可行性後再採購設備')

    # 規則2：查詢量很高且預算充足 → 混合或地端
    elif int(queries) > 5000 and budget in ['中', '高']:
        solution = '混合'
        reasons.append(f'每日 {queries} 次查詢，雲端 API 長期費用較高，混合方案可降低成本')
        risks.append('混合架構複雜度較高，需要有能力的 DevOps 團隊維護')
        next_steps.append('先用雲端 API 做 PoC，驗證後評估地端 ROI')

    # 規則3：預算低或維運能力弱 → 雲端
    elif budget == '低' or ops == '弱':
        solution = '雲端'
        reasons.append('初期預算有限或維運能力不足，雲端 API 可快速啟動')
        risks.append('長期費用可能超過地端，且資料需傳送至外部服務')
        next_steps.append('設定用量上限，監控 API 費用，定期評估是否轉地端')

    # 規則4：即時需求 + 中等資源 → 混合或雲端
    elif latency == '即時':
        if ops == '強' and budget != '低':
            solution = '混合'
            reasons.append('即時需求 + 強維運能力，混合方案可在保護敏感資料同時達到低延遲')
        else:
            solution = '雲端'
            reasons.append('即時需求且維運資源有限，雲端 API 提供最快的部署路徑')

    # 規則5：批次處理 → 地端或雲端皆可，看預算
    elif latency == '批次':
        if budget == '低' or ops == '弱':
            solution = '雲端'
            reasons.append('批次處理 + 預算有限，雲端 API 彈性計費最划算')
        else:
            solution = '地端'
            reasons.append('批次處理可充分利用閒置 GPU，地端長期成本更低')

    # 預設
    else:
        reasons.append('中等規模查詢量，雲端 API 提供最快的啟動速度')

    # 共同風險提醒
    if solution == '雲端':
        risks.extend([
            'API 服務可能有率限或停服風險',
            '資料傳輸有暴露風險（需確認廠商合規）'
        ])
        next_steps.extend([
            '評估 OpenAI/Azure/Google 等服務的 SLA',
            '設計資料脫敏機制後再呼叫 API'
        ])
    elif solution == '地端':
        risks.extend([
            '前期硬體 CapEx 投資高（GPU 伺服器）',
            '需要 MLOps 維運能力（更新、監控、故障排除）'
        ])
        next_steps.extend([
            '先做小規模 PoC，確認效能後再採購',
            '評估量化模型（INT4）以降低硬體規格需求'
        ])
    else:  # 混合
        risks.extend([
            '架構複雜，需要維護兩套系統',
            '資料分流邏輯需仔細設計'
        ])
        next_steps.extend([
            '定義清楚哪些資料走雲端、哪些留地端',
            '確保兩套系統的介面規格一致'
        ])

    # 計算建議成本區間（教學估算）
    cost_estimate = estimate_cost(solution, int(queries))

    return {
        'solution': solution,
        'reasons': reasons[:3],
        'risks': risks[:3],
        'next_steps': next_steps[:3],
        'cost_estimate': cost_estimate
    }

def estimate_cost(solution, daily_queries):
    """估算月成本（教學版，非精確商業計價）"""
    monthly_queries = daily_queries * 30

    if solution == '雲端':
        # 假設 0.01 USD/1K tokens，平均 500 tokens/次
        token_cost = monthly_queries * 500 / 1000 * 0.01
        if token_cost < 50:
            return {'range': 'NT$ 0 ~ 1,500 / 月', 'note': '適合初期 PoC 階段', 'type': 'OpEx'}
        elif token_cost < 500:
            return {'range': f'NT$ 1,500 ~ 15,000 / 月', 'note': '注意用量成長趨勢', 'type': 'OpEx'}
        else:
            return {'range': f'NT$ 15,000+ / 月', 'note': '建議評估混合或地端方案', 'type': 'OpEx'}
    elif solution == '地端':
        return {
            'range': 'NT$ 80,000 ~ 300,000（初期硬體）+ NT$ 5,000~15,000 / 月（電費+維運）',
            'note': '一次投資，長期攤提後單次成本極低',
            'type': 'CapEx + OpEx'
        }
    else:  # 混合
        return {
            'range': 'NT$ 50,000~150,000（地端部分）+ NT$ 3,000~8,000 / 月（雲端部分）',
            'note': '成本介於純雲端和純地端之間',
            'type': 'CapEx + OpEx'
        }

# ==============================================================
# API：進度查詢
# ==============================================================

@app.route('/api/progress')
def get_progress():
    """取得使用者進度（API）"""
    user_id = get_or_create_user()
    progress = get_user_progress(user_id)

    # 取得徽章資訊
    badges = []
    units = {'A': '藍色', 'B': '紫色', 'C': '綠色'}
    for unit in units:
        unit_progress = {k: v for k, v in progress.items() if k.startswith(unit)}
        has_completed = any(v['completed'] for v in unit_progress.values())
        badges.append({'unit': unit, 'earned': has_completed})

    return jsonify({
        'progress': dict(progress),
        'badges': badges
    })

# ==============================================================
# 教師管理功能
# ==============================================================

@app.route('/teacher')
def teacher_panel():
    """教師管理面板"""
    # 統計資料
    user_count = query_db("SELECT COUNT(*) as cnt FROM users", one=True)
    quiz_count = query_db("SELECT COUNT(*) as cnt FROM quiz_attempts", one=True)

    # 各單元完成人數
    unit_completions = {}
    for unit in ['A', 'B', 'C']:
        cnt = query_db(
            "SELECT COUNT(DISTINCT user_id) as cnt FROM lesson_progress WHERE unit = ? AND completed = 1",
            [unit], one=True
        )
        unit_completions[unit] = cnt['cnt'] if cnt else 0

    return render_template('teacher.html',
        user_count=user_count['cnt'] if user_count else 0,
        quiz_count=quiz_count['cnt'] if quiz_count else 0,
        unit_completions=unit_completions
    )

@app.route('/api/teacher/reset', methods=['POST'])
def teacher_reset():
    """教師一鍵重置示範資料"""
    data = request.get_json()
    if data.get('confirm') != 'RESET_ALL':
        return jsonify({'error': '請輸入確認碼 RESET_ALL'}), 400

    tables = ['lesson_progress', 'quiz_attempts', 'prompt_exercises',
              'prompt_role_exercises', 'model_selection_exercises',
              'deployment_simulations', 'users']
    for table in tables:
        execute_db(f"DELETE FROM {table}")

    # 清除所有 session
    session.clear()

    return jsonify({'success': True, 'message': '所有學生資料已重置'})

@app.route('/api/teacher/export')
def teacher_export():
    """匯出學生答案（CSV 格式）"""
    import csv
    import io

    output = io.StringIO()
    writer = csv.writer(output)

    # 匯出測驗結果
    writer.writerow(['使用者ID', '單元', '題目ID', '答案', '是否正確', '分數', '時間'])
    rows = query_db("SELECT * FROM quiz_attempts ORDER BY attempted_at")
    for row in rows:
        writer.writerow([row['user_id'][:8], row['unit'], row['question_id'],
                         row['answer'], '✓' if row['is_correct'] else '✗',
                         row['score'], row['attempted_at']])

    from flask import Response
    return Response(
        '\ufeff' + output.getvalue(),  # BOM for Excel UTF-8
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=quiz_results.csv'}
    )

# ==============================================================
# 工廠資料 API
# ==============================================================

@app.route('/api/factory-data')
def get_factory_data():
    """取得工廠異常資料"""
    rows = query_db("SELECT * FROM factory_anomalies ORDER BY timestamp")
    return jsonify([dict(r) for r in rows])

# ==============================================================
# 應用程式啟動
# ==============================================================

if __name__ == '__main__':
    # 確保資料庫存在
    ensure_db()
    print("=" * 50)
    print("🏭 AI 教學平台 - 生成式 AI 實務決策流程")
    print("🎓 交通大學工業工程系碩士班")
    print("=" * 50)
    print("🌐 開啟瀏覽器：http://localhost:9999")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=9999)
