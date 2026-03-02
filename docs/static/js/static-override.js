/**
 * static-override.js
 * GitHub Pages 靜態版本 — 攔截所有 API 呼叫，改用 localStorage 或本地邏輯處理
 * 載入時機：jQuery 載入後、其他頁面腳本前
 */
(function ($) {
    'use strict';

    // ============================================================
    // 硬編碼資料：測驗答案
    // ============================================================
    var QUIZ_DB = {
        'A_Q1':      { answer: 'false',        type: 'true_false',     explanation: '錯！Prompt 的關鍵不是長度，而是結構清楚、任務明確。雜亂的長 Prompt 反而讓模型抓不到重點。' },
        'A_Q2':      { answer: 'B',            type: 'single_choice',  explanation: '輸出格式最常被忽略！若不指定格式，後端系統無法自動解析回應，導致整個串接流程失敗。' },
        'A_Q3':      { answer: 'B',            type: 'single_choice',  explanation: '選項 B 包含角色設定、任務來源、輸出格式要求，是結構完整的 Prompt 設計。' },
        'A_Q4':      { answer: ['明確任務目標','提供背景資料','加入規則與限制','定義輸出格式','設定評估標準'], type: 'ordering', explanation: 'Prompt 設計的黃金順序：目標→資料→規則→格式→評估，層層遞進讓模型有完整的行動指南。' },
        'A_Q5':      { answer: 'false',        type: 'true_false',     explanation: '錯！沒有評估標準，你無法知道 Prompt 有沒有變好。評估是迭代改進的基礎，工程思維不能省略。' },
        'A_ROLE_Q1': { answer: 'B',            type: 'single_choice',  explanation: 'System Prompt 是「高層規則 / SOP」，適合放置不變的規則、格式要求、角色設定。本次任務的具體資料應放在 User Prompt。' },
        'A_ROLE_Q2': { answer: 'B',            type: 'single_choice',  explanation: '模型會學習並模仿 Assistant Message 的格式、語氣與結構，這是 few-shot 學習的核心機制。' },
        'A_ROLE_Q3': { answer: 'B',            type: 'single_choice',  explanation: '把所有內容都塞在 User Prompt 是最常見的誤區！分層結構讓模型清楚知道哪些是不變規則（System），哪些是本次任務（User），哪些是格式參考（Assistant）。' },
        'A_ROLE_Q4': { answer: 'false',        type: 'true_false',     explanation: '錯！歷史 Assistant 訊息會被包含在 context window 中，模型會參考它們。若早期回覆格式混亂，後續輸出也可能跟著走偏，這叫「對話歷史污染」。' },
        'A_ROLE_Q5': { answer: 'B',            type: 'single_choice',  explanation: '當需要高度格式一致性時，提供 Assistant Message 示範是最有效的方法。模型會直接模仿範例的結構輸出。' },
        'B_Q1':      { answer: 'B',            type: 'single_choice',  explanation: 'License 直接決定模型能否商業使用！許多開源模型有「非商用」限制，忽略這點可能引發法律風險。' },
        'B_Q2':      { answer: 'B',            type: 'single_choice',  explanation: '排行榜通常是英文 benchmark！繁體中文的表現差異非常大，必須查看 Model Card 的語言支援章節，或用自己的資料做小樣本測試。' },
        'B_Q3':      { answer: 'B',            type: 'single_choice',  explanation: '了解模型的限制和不適用場景，可以避免在錯誤場景中部署，節省大量試錯成本。' },
        'B_Q4':      { answer: 'all_correct',  type: 'matching',       explanation: '理解 Model Card 各欄位是工程選型的必備技能！每個欄位都有其對應的決策意義。' },
        'B_Q5':      { answer: 'A',            type: 'scenario',       explanation: 'Breeze-7B-Instruct 最合理：Apache 2.0 可商用、專為繁中優化、7B FP16 約 14GB 可在 RTX 3090（24GB）直接運行。Qwen2.5-14B 雖中文更強但 FP16 需 28GB 超出預算；Phi-3-mini 繁中能力不足；閉源 API 有製程資料外洩風險。' },
        'C_Q1':      { answer: 'C',            type: 'scenario',       explanation: '資料高度敏感 + 內網需求 → 純地端是唯一選項！雲端和混合方案都涉及資料離開內部網路的風險。' },
        'C_Q2':      { answer: 'false',        type: 'true_false',     explanation: '錯！實際記憶體需求還包含：精度（FP16 vs INT4）、KV Cache、Context Length、Batch Size。7B FP16 模型實際約需 14-16GB，量化後才能壓到 5-8GB。' },
        'C_Q3':      { answer: 'B',            type: 'single_choice',  explanation: 'PoC 初期：雲端 API 無需前期硬體投資，按量計費，快速驗證可行性。只有在規模化後才值得轉地端以降低單次成本。' },
        'C_Q4':      { answer: ['需求分析','PoC（概念驗證）','試營運（小規模上線）','正式生產部署','維運與持續優化'], type: 'ordering', explanation: '規範的導入順序能有效降低風險。跳過 PoC 直接採購設備是最常見的代價慘重的錯誤！' },
        'C_Q5':      { answer: 'false',        type: 'true_false',     explanation: '大錯特錯！維運人力（DevOps、MLOps）成本常常超過硬體本身。地端部署需要有人負責更新、監控、故障排除，這些隱形成本必須納入 TCO 計算。' }
    };

    // 角色分類練習答案
    var ROLE_DB = {
        'RF1': { role: 'system',    explanation: '這是角色設定與語言規範，屬於高層規則，放在 System Prompt' },
        'RF2': { role: 'user',      explanation: '這是本次任務描述，屬於 User Prompt' },
        'RF3': { role: 'system',    explanation: '這是不可違反的規則，屬於 System Prompt 的約束條件' },
        'RF4': { role: 'assistant', explanation: '這是格式示範，作為 few-shot 範例放在 Assistant Message' },
        'RF5': { role: 'user',      explanation: '這是本次任務的輸入資料，屬於 User Prompt' },
        'RF6': { role: 'system',    explanation: '字數限制與格式規範屬於 System Prompt 的約束條件' },
        'RF7': { role: 'assistant', explanation: '這是一個完整的 few-shot 範例對話，放在 Assistant Message' },
        'RF8': { role: 'user',      explanation: '這是具體任務要求，屬於 User Prompt' }
    };

    // 模型選型建議
    var MODEL_SUGGESTIONS = {
        'MODEL_A': {
            verdict: '✅ 本情境的推薦選擇', color: 'green',
            summary: 'Breeze-7B-Instruct 在這個情境下是最平衡的選擇。Apache 2.0 授權無商用疑慮，繁體中文能力是三者中最優，7B 模型 FP16 約 14GB 可直接在 RTX 3090（24GB）上運行，無需量化就能維持完整精度。',
            tips: ['用 20–50 筆真實工廠異常訊息做小樣本測試，重點驗證 JSON 格式輸出的穩定性', '若遇到設備專有術語辨識不準，可考慮用 LoRA 微調加入工廠術語語料', '部署時搭配 vLLM 或 Ollama 可進一步提升每日 300 次查詢的吞吐量']
        },
        'MODEL_B': {
            verdict: '⚠️ 能力強但有硬體門檻', color: 'yellow',
            summary: 'Qwen2.5-14B-Instruct 的中文能力確實最強，但 FP16 推論需要約 28GB VRAM，超出單張 RTX 3090（24GB）的上限，必須進行 INT4 量化才能部署。',
            tips: ['使用 INT4 量化（約 9GB）讓模型能在 RTX 3090 上運行，建議用 llama.cpp 或 bitsandbytes', '量化後務必用工廠任務資料重新測試 JSON 格式符合率，確認精度損失在可接受範圍', '若量化後繁中表現下滑明顯，可考慮回頭選 Breeze-7B——在繁中任務上差距其實不大']
        },
        'MODEL_C': {
            verdict: '💡 部署成本最低，但繁中是弱點', color: 'blue',
            summary: 'Phi-3-mini 的 MIT 授權和極低硬體需求有吸引力，但繁體中文訓練資料極少，在繁中工廠術語摘要任務上輸出品質不穩定。',
            tips: ['可先用 Phi-3-mini 做 PoC 快速驗證系統流程可行性', '正式上線前務必用真實工廠異常訊息測試繁中摘要品質——如果達標當然繼續用', '若繁中效果不達標，建議轉換到 Breeze-7B（同樣輕量，但繁中能力明顯更好）']
        }
    };

    // ============================================================
    // localStorage 工具
    // ============================================================
    var LS_PROGRESS = 'ai_teaching_progress';

    function getProgress() {
        try { return JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}'); }
        catch (e) { return {}; }
    }

    function markComplete(unit, lesson) {
        var p = getProgress();
        p[unit + '_' + lesson] = { completed: true, ts: Date.now() };
        localStorage.setItem(LS_PROGRESS, JSON.stringify(p));
    }

    function buildBadges() {
        var p = getProgress();
        return ['A', 'B', 'C'].map(function (u) {
            var earned = Object.keys(p).some(function (k) {
                return k.indexOf(u + '_') === 0 && p[k].completed;
            });
            return { unit: u, earned: earned };
        });
    }

    // ============================================================
    // 部署決策引擎（對應 app.py decide_deployment）
    // ============================================================
    function decideDeployment(sensitivity, latency, queries, budget, ops, intranet) {
        var solution = '雲端', reasons = [], risks = [], nextSteps = [];
        queries = parseInt(queries) || 300;

        if (sensitivity === '高' || intranet) {
            solution = '地端';
            reasons.push('資料敏感度高或需要內網整合，資料不可離開內部網路');
            risks.push('地端部署需要 GPU 硬體投資與 MLOps 維運能力');
            nextSteps.push('先完成 PoC 驗證可行性後再採購設備');
        } else if (queries > 5000 && (budget === '中' || budget === '高')) {
            solution = '混合';
            reasons.push('每日 ' + queries + ' 次查詢，雲端 API 長期費用較高，混合方案可降低成本');
            risks.push('混合架構複雜度較高，需要有能力的 DevOps 團隊維護');
            nextSteps.push('先用雲端 API 做 PoC，驗證後評估地端 ROI');
        } else if (budget === '低' || ops === '弱') {
            solution = '雲端';
            reasons.push('初期預算有限或維運能力不足，雲端 API 可快速啟動');
            risks.push('長期費用可能超過地端，且資料需傳送至外部服務');
            nextSteps.push('設定用量上限，監控 API 費用，定期評估是否轉地端');
        } else if (latency === '即時') {
            if (ops === '強' && budget !== '低') {
                solution = '混合';
                reasons.push('即時需求 + 強維運能力，混合方案可在保護敏感資料同時達到低延遲');
            } else {
                solution = '雲端';
                reasons.push('即時需求且維運資源有限，雲端 API 提供最快的部署路徑');
            }
        } else if (latency === '批次') {
            if (budget === '低' || ops === '弱') {
                solution = '雲端';
                reasons.push('批次處理 + 預算有限，雲端 API 彈性計費最划算');
            } else {
                solution = '地端';
                reasons.push('批次處理可充分利用閒置 GPU，地端長期成本更低');
            }
        } else {
            reasons.push('中等規模查詢量，雲端 API 提供最快的啟動速度');
        }

        if (solution === '雲端') {
            risks.push('API 服務可能有率限或停服風險');
            risks.push('資料傳輸有暴露風險（需確認廠商合規）');
            nextSteps.push('評估 OpenAI/Azure/Google 等服務的 SLA');
            nextSteps.push('設計資料脫敏機制後再呼叫 API');
        } else if (solution === '地端') {
            risks.push('前期硬體 CapEx 投資高（GPU 伺服器）');
            risks.push('需要 MLOps 維運能力（更新、監控、故障排除）');
            nextSteps.push('先做小規模 PoC，確認效能後再採購');
            nextSteps.push('評估量化模型（INT4）以降低硬體規格需求');
        } else {
            risks.push('架構複雜，需要維護兩套系統');
            risks.push('資料分流邏輯需仔細設計');
            nextSteps.push('定義清楚哪些資料走雲端、哪些留地端');
            nextSteps.push('確保兩套系統的介面規格一致');
        }

        var mq = queries * 30, cost;
        if (solution === '雲端') {
            var tc = mq * 500 / 1000 * 0.01;
            if (tc < 50)       cost = { range: 'NT$ 0 ~ 1,500 / 月',      note: '適合初期 PoC 階段',          type: 'OpEx' };
            else if (tc < 500) cost = { range: 'NT$ 1,500 ~ 15,000 / 月', note: '注意用量成長趨勢',            type: 'OpEx' };
            else               cost = { range: 'NT$ 15,000+ / 月',         note: '建議評估混合或地端方案',      type: 'OpEx' };
        } else if (solution === '地端') {
            cost = { range: 'NT$ 80,000 ~ 300,000（初期硬體）+ NT$ 5,000~15,000 / 月（電費+維運）', note: '一次投資，長期攤提後單次成本極低', type: 'CapEx + OpEx' };
        } else {
            cost = { range: 'NT$ 50,000~150,000（地端部分）+ NT$ 3,000~8,000 / 月（雲端部分）', note: '成本介於純雲端和純地端之間', type: 'CapEx + OpEx' };
        }

        return { solution: solution, reasons: reasons.slice(0,3), risks: risks.slice(0,3), next_steps: nextSteps.slice(0,3), cost_estimate: cost };
    }

    // ============================================================
    // 攔截 $.ajax — 核心邏輯
    // ============================================================
    var _orig = $.ajax.bind($);

    $.ajax = function (options) {
        if (typeof options === 'string') {
            options = $.extend({}, arguments[1] || {}, { url: options });
        }
        var url    = options.url || '';
        var method = (options.method || options.type || 'GET').toUpperCase();
        var raw    = options.data || {};
        var data   = (typeof raw === 'string') ? (function(){ try{ return JSON.parse(raw); }catch(e){ return {}; } }()) : raw;

        function respond(payload) {
            setTimeout(function () {
                if (typeof options.success === 'function') options.success(payload);
                if (typeof options.complete === 'function') options.complete({ responseJSON: payload }, 'success');
            }, 20);
            return { done: function(fn){ fn && setTimeout(function(){ fn(payload); }, 25); return this; }, fail: function(){ return this; } };
        }

        function ignore() {
            return { done: function(){ return this; }, fail: function(){ return this; } };
        }

        // ── GET /api/progress ──
        if (url.indexOf('/api/progress') >= 0 && method === 'GET') {
            return respond({ progress: getProgress(), badges: buildBadges() });
        }

        // ── POST /set-name ──
        if (url.indexOf('/set-name') >= 0) {
            localStorage.setItem('ai_teaching_name', data.name || '學生');
            return respond({ success: true });
        }

        // ── POST /set-mode ──
        if (url.indexOf('/set-mode') >= 0) {
            localStorage.setItem('ai_teaching_mode', data.mode || 'guided');
            return respond({ success: true });
        }

        // ── POST /api/quiz/submit ──
        if (url.indexOf('/api/quiz/submit') >= 0) {
            var unit = data.unit, answers = data.answers || [];
            var correct = 0, results = [];
            answers.forEach(function (ans) {
                var q = QUIZ_DB[ans.question_id];
                if (!q) return;
                var ok = (q.type === 'ordering')
                    ? JSON.stringify(ans.answer) === JSON.stringify(q.answer)
                    : String(ans.answer).toLowerCase() === String(q.answer).toLowerCase();
                if (ok) correct++;
                results.push({ question_id: ans.question_id, is_correct: ok, explanation: q.explanation, correct_answer: q.answer });
            });
            var score = answers.length ? Math.round(correct / answers.length * 100) : 0;
            var unitLetter = (unit === 'A_role') ? 'A' : unit.charAt(0);
            var lesson = (unit === 'A_role') ? 'A15' : (unit + '5');
            markComplete(unitLetter, lesson);
            return respond({ success: true, score: score, correct: correct, total: answers.length, results: results });
        }

        // ── POST /api/role-exercise/submit ──
        if (url.indexOf('/api/role-exercise/submit') >= 0) {
            var ua = data.answers || {}, cc = 0, fb = [];
            Object.keys(ROLE_DB).forEach(function (id) {
                var ok = ua[id] === ROLE_DB[id].role;
                if (ok) cc++;
                fb.push({ id: id, is_correct: ok, correct_role: ROLE_DB[id].role, explanation: ROLE_DB[id].explanation });
            });
            var total = Object.keys(ROLE_DB).length;
            var score = total ? Math.round(cc / total * 100) : 0;
            markComplete('A', 'A15');
            return respond({ success: true, score: score, correct: cc, total: total, feedback: fb });
        }

        // ── POST /api/prompt-exercise/submit ──
        if (url.indexOf('/api/prompt-exercise/submit') >= 0) {
            var flags = { has_goal: !!data.has_goal, has_context: !!data.has_context, has_constraints: !!data.has_constraints, has_format: !!data.has_format, has_evaluation: !!data.has_evaluation };
            var score = Object.keys(flags).filter(function(k){ return flags[k]; }).length * 20;
            var missing = [];
            if (!flags.has_goal)        missing.push('任務目標（Goal）');
            if (!flags.has_context)     missing.push('背景資料（Context）');
            if (!flags.has_constraints) missing.push('規則限制（Constraints）');
            if (!flags.has_format)      missing.push('輸出格式（Output Format）');
            if (!flags.has_evaluation)  missing.push('評估標準（Evaluation）');
            var fb;
            if (score === 100)     fb = '🎉 完美！五大要素全部到位，這個 Prompt 結構清晰，可以直接用於工程部署！';
            else if (score >= 80)  fb = '👍 非常好！缺少的要素：' + missing.join('、') + '。補上後可以大幅提升輸出穩定性。';
            else if (score >= 60)  fb = '📝 不錯的開始！建議補充：' + missing.join('、') + '。記得：格式定義最容易被忽略但最影響串接！';
            else if (score >= 40)  fb = '⚠️ 基礎框架有了，還需要加入：' + missing.join('、');
            else                   fb = '💡 好的起點！需要加入：' + missing.join('、') + '。Prompt 不是聊天，是工程設計！';
            markComplete('A', 'A2');
            return respond({ success: true, score: score, flags: flags, feedback: fb });
        }

        // ── POST /api/model-selection/submit ──
        if (url.indexOf('/api/model-selection/submit') >= 0) {
            var sug = MODEL_SUGGESTIONS[data.selected_model] || { verdict: '請選擇模型', color: 'gray', summary: '', tips: [] };
            markComplete('B', 'B3');
            return respond({ success: true, suggestion: sug });
        }

        // ── POST /api/deployment/simulate ──
        if (url.indexOf('/api/deployment/simulate') >= 0) {
            var res = decideDeployment(data.sensitivity, data.latency, data.daily_queries, data.budget, data.ops_capability, data.needs_intranet);
            res.success = true;
            markComplete('C', 'C2');
            return respond(res);
        }

        // ── 其餘 API（teacher、export 等）略過 ──
        if (url.indexOf('/api/') >= 0 || url.indexOf('/teacher') >= 0) {
            return ignore();
        }

        return _orig(options);
    };

    // 同步覆寫 $.get / $.post
    $.get = function (url, data, success) {
        if (typeof data === 'function') { success = data; data = {}; }
        return $.ajax({ url: url, method: 'GET', data: data, success: success });
    };
    $.post = function (url, data, success) {
        if (typeof data === 'function') { success = data; data = {}; }
        return $.ajax({ url: url, method: 'POST', contentType: 'application/json', data: JSON.stringify(data), success: success });
    };

    // 頁面初始化：從 localStorage 補上使用者名稱
    $(document).ready(function () {
        var name = localStorage.getItem('ai_teaching_name');
        if (name && name !== '學生') {
            $('#nav-username').text(name);
        }
    });

    console.log('[Static Override] 已載入 — API 呼叫將使用 localStorage。');

}(jQuery));
