/**
 * case.js - 整合案例互動邏輯
 * 工廠設備異常通報助手（A+B+C 全整合）
 */

// 常見誤區清單（供步驟4選取）
var ALL_MISTAKES = [
    'Prompt：把所有指令塞在同一段 User Prompt，沒有角色分層',
    'Prompt：沒有指定輸出格式（JSON），後端無法解析',
    'Prompt：沒有設定「資料不足」的處理規則',
    'Prompt：System Prompt 與 User Prompt 規則衝突',
    'Prompt：忽略 assistant 示範訊息對格式穩定性的影響',
    '模型：只看模型大小/排行榜，沒有看 License',
    '模型：沒有確認繁體中文支援程度',
    '模型：沒有用實際工廠資料做小樣本測試',
    '部署：沒有 PoC 驗證就直接採購設備',
    '部署：忽略資料敏感度，直接用雲端 API',
    '部署：只算模型費用，沒算維運人力成本'
];

// ============================================================
// 步驟切換
// ============================================================
function showStep(stepNum) {
    $('.step-content').addClass('hidden');
    $('.step-btn').removeClass('bg-orange-500 text-white shadow-lg');
    $('.step-btn').addClass('bg-white border border-gray-200 text-gray-500');

    $('#step-' + stepNum).removeClass('hidden').addClass('fade-in');
    $('#step-btn-' + stepNum).addClass('bg-orange-500 text-white shadow-lg').removeClass('bg-white border border-gray-200 text-gray-500');

    // 更新 URL
    var url = new URL(window.location);
    url.searchParams.set('step', stepNum);
    window.history.replaceState({}, '', url);
}

// ============================================================
// 工廠異常資料預覽
// ============================================================
function renderAnomalyPreview() {
    var $preview = $('#anomaly-preview');
    if (!$preview.length) return;

    (ANOMALIES_DATA || []).slice(0, 3).forEach(function(a) {
        var lineClass = a.handled === 'Y' ? 'line-ok' : a.message.includes('壓力') || a.message.includes('溫度') ? 'line-error' : 'line-warn';
        $preview.append('<div class="' + lineClass + '">' +
            '[' + a.machine_id + '] ' + a.message.substring(0, 50) + (a.message.length > 50 ? '...' : '') +
            ' <span class="text-gray-500">(' + a.shift + '/' + a.line + ')</span>' +
            '</div>');
    });
}

// ============================================================
// 案例模型卡渲染
// ============================================================
function renderCaseModelCards() {
    var $container = $('#case-model-cards');
    if (!$container.length) return;
    $container.empty();

    (MODELS_DATA || []).forEach(function(model, idx) {
        var colors = ['blue', 'purple', 'green'];
        var c = colors[idx % colors.length];
        var licOk = model.license.includes('MIT') || model.license.includes('Apache');

        var html = '<div class="border-2 border-' + c + '-200 rounded-2xl p-4 bg-white">';
        html += '<div class="flex items-center gap-2 mb-2">';
        html += '<div class="w-7 h-7 bg-' + c + '-100 rounded-lg text-' + c + '-600 font-black text-sm flex items-center justify-center">' + String.fromCharCode(65 + idx) + '</div>';
        html += '<div class="font-bold text-sm text-gray-800">' + model.name + '</div>';
        html += '</div>';
        html += '<div class="text-xs space-y-1">';
        html += '<div class="' + (licOk ? 'text-green-600' : 'text-red-500') + '">' + (licOk ? '✅' : '❌') + ' ' + model.license.split('（')[0] + '</div>';
        html += '<div class="text-gray-600">🌏 ' + model.languages.split('（')[0] + '</div>';
        html += '<div class="text-gray-600">⚙️ ' + model.parameters + ' | ' + model.deployment_requirements.split('；')[0] + '</div>';
        html += '</div>';
        html += '<div class="mt-2 flex flex-wrap gap-1">';
        model.strengths.slice(0, 2).forEach(function(s) {
            html += '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">+' + s + '</span>';
        });
        model.weaknesses.slice(0, 1).forEach(function(w) {
            html += '<span class="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">-' + w + '</span>';
        });
        html += '</div></div>';
        $container.append(html);
    });
}

// ============================================================
// 步驟4：誤區清單 Checkboxes
// ============================================================
function renderMistakesCheckboxes() {
    var $container = $('#mistakes-checkboxes');
    if (!$container.length) return;

    ALL_MISTAKES.forEach(function(m) {
        var html = '<label class="flex items-start gap-2 cursor-pointer bg-gray-50 rounded-xl px-3 py-2 hover:bg-orange-50 transition">';
        html += '<input type="checkbox" class="mt-0.5 accent-orange-500 mistake-check" value="' + escapeHtml(m) + '">';
        html += '<span class="text-xs text-gray-700">' + escapeHtml(m) + '</span>';
        html += '</label>';
        $container.append(html);
    });
}

// ============================================================
// 提交案例步驟（僅驗證 + 標記完成，無評分）
// ============================================================
function submitCaseStep(step) {
    // 驗證必填欄位
    if (step === 1) {
        if (!$('#case-goal').val().trim()) { showToast('⚠️', '請填寫任務目標（Goal）'); return; }
        if (!$('#case-format').val().trim()) { showToast('⚠️', '請填寫輸出格式（非常重要！）'); return; }
        if (!$('#case-system').val().trim()) { showToast('⚠️', '請填寫 System Prompt'); return; }
    } else if (step === 2) {
        if (!$('input[name="case-model"]:checked').val()) { showToast('⚠️', '請選擇一個模型'); return; }
        if (!$('#case-model-reason').val().trim()) { showToast('⚠️', '請填寫 Model Card 依據'); return; }
    } else if (step === 3) {
        if (!$('input[name="case-deploy"]:checked').val()) { showToast('⚠️', '請選擇部署方案'); return; }
        if (!$('#case-poc').val().trim()) { showToast('⚠️', '請填寫 PoC 計畫'); return; }
    } else if (step === 4) {
        if (!$('#summary-prompt').val().trim() || !$('#summary-model').val().trim() || !$('#summary-deploy').val().trim()) {
            showToast('⚠️', '請填寫三個摘要欄位'); return;
        }
    }

    // 顯示完成訊息
    var $resultDiv = $('#step-' + step + '-result');
    var html = '<div class="bg-green-50 border-2 border-green-300 rounded-2xl p-5 fade-in">';
    html += '<div class="flex items-center gap-3 mb-3">';
    html += '<div class="text-3xl">✅</div>';
    html += '<div><div class="font-bold text-gray-800">步驟 ' + step + ' 完成</div>';
    html += '<div class="text-sm text-gray-500">內容已記錄，可繼續下一步或修改後重新確認</div></div>';
    html += '</div>';

    if (step < 4) {
        html += '<button onclick="showStep(' + (step + 1) + ')" class="mt-2 bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition flex items-center gap-2">';
        html += '繼續到步驟 ' + (step + 1) + ' <i class="fas fa-arrow-right"></i></button>';
    } else {
        showCompletionCard();
    }

    html += '</div>';
    $resultDiv.html(html).removeClass('hidden');
    showToast('✅', '步驟 ' + step + ' 完成！');
    $('#step-btn-' + step).addClass('ring-2 ring-green-400');
}

function showCompletionCard() {
    $('#final-score-card').removeClass('hidden').addClass('fade-in');
}

// ============================================================
// 載入範例（所有步驟）
// ============================================================
function loadCaseExample(step) {
    if (step === 1) {
        $('#case-goal').val('協助工廠班長快速理解設備異常，判斷嚴重程度並產出可供 MES 串接的 JSON 格式摘要，提升班長的決策效率');
        $('#case-context').val('輸入欄位：\n- machine_id（機台ID，如 WE-27）\n- timestamp（異常時間）\n- shift（班別：早班/午班/晚班）\n- line（產線：A線/B線/C線）\n- message（異常訊息文字）\n- recent_maintenance（最近維修紀錄，可空）');
        $('#case-constraints').val('1. 若資料不足，請回覆「資料不足，無法判斷」，不可捏造\n2. 可能原因最多列 3 項，按可能性排序\n3. 嚴重程度只能選：高/中/低\n4. 摘要控制在 50 字以內\n5. 使用繁體中文回覆');
        $('#case-format').val('{\n  "summary": "50字內的異常摘要",\n  "severity": "高|中|低",\n  "possible_causes": ["原因1", "原因2", "原因3"],\n  "action": "建議立即行動"\n}');
        $('#case-evaluation').val('好的回應：JSON 格式正確、摘要精準在 50 字內、嚴重程度判斷合理、原因具體可操作\n差的回應：格式不符、摘要過長、原因含糊、捏造資料');
        $('#case-system').val('你是工廠值班助理，專門協助分析設備異常。請遵守以下規則：\n1. 回覆必須使用繁體中文\n2. 輸出必須是 JSON 格式，不得有多餘文字\n3. 若輸入資料不足，請回覆 {"error": "資料不足，無法判斷"}\n4. 可能原因最多 3 項，不可捏造\n5. 摘要控制在 50 字以內');
        $('#case-user').val('請分析以下設備異常訊息，輸出 JSON 格式的摘要與嚴重程度分類：\n\n機台ID: {machine_id}\n班別: {shift}\n異常訊息: {message}\n最近維修: {recent_maintenance}');
        $('#case-assistant').val('{"summary": "WE-27 早班收線張力波動，超出 ±15% 閾值，疑似感測器問題", "severity": "高", "possible_causes": ["張力感測器漂移", "收線機構磨損", "原料批次差異"], "action": "暫停生產，排查感測器後復線"}');
        showToast('📝', '步驟1 範例已載入！');

    } else if (step === 2) {
        $('input[name="case-model"][value="MODEL_A"]').prop('checked', true).trigger('change');
        $('#case-model-reason').val('根據 Model Card 的具體依據：\n1. License = MIT，無商用限制，可自行部署於工廠伺服器\n2. Languages 明確包含繁體中文（zh-TW），符合班長的使用需求\n3. Deployment Requirements 為單張 RTX 3090，公司現有硬體即可支援\n4. Parameters 為 7B，推論速度在分鐘級延遲範圍內（約 3-8 秒/筆）\n5. Training Data 涵蓋工業製程相關文件，領域適配性較好');
        $('#case-model-risks').val('已知風險：7B 參數對複雜多步推理能力有限，偶爾可能誤判嚴重程度。\n應對方式：加入 few-shot 示範（Assistant Message），並設定後處理程式驗證 JSON 格式完整性；高嚴重度異常加人工複核機制。');
        $('#case-model-limitations').val('不適合需要跨機台關聯分析的複雜推理場景；若異常訊息涉及非常專業的化學品或特殊製程術語，繁中訓練資料覆蓋不足可能影響準確率。模型更新需人工介入重新部署。');
        showToast('📝', '步驟2 範例已載入！');

    } else if (step === 3) {
        $('input[name="case-deploy"][value="地端"]').prop('checked', true).trigger('change');
        $('#case-cost').val('CapEx（一次性）：工業用伺服器含 RTX 3090 約 NT$15萬\nOpEx（每月）：電費約 NT$1,500 + 維運人力 0.2 人月約 NT$3,000 = NT$4,500/月\n相較雲端 API 方案（約 NT$8,000/月），硬體約 18 個月即可回收成本');
        $('#case-risk-explain').val('主要風險：單台伺服器故障會導致服務中斷。\n緩解方案：\n1. 備援機制：舊電腦部署輕量 3B 模型作為降級備援\n2. 定期備份模型權重至 NAS\n3. 資料敏感度為中～高，純地端可完全避免雲端外洩風險，符合工廠資安政策');
        $('#case-poc').val('PoC（第1-2週）：在辦公室模擬環境部署，使用過去 30 天共 50 筆標註異常記錄測試。目標：JSON 格式正確率 ≥90%、嚴重程度分類準確率 ≥80%、高嚴重度漏報率 ≤5%。\n\n試營運（第3-4週）：僅接入 A 線 1 台機台，班長實際使用 2 週。每日記錄誤報/漏報，每週與班長開 15 分鐘回饋會，快速調整 Prompt。\n\n正式上線條件：準確率 ≥85%、班長滿意度 ≥4/5 分、連續 5 天無高嚴重度漏報，方可全線接入。');
        showToast('📝', '步驟3 範例已載入！');

    } else if (step === 4) {
        $('#summary-prompt').val('採用五要素設計（Goal/Context/Constraints/Format/Evaluation），以角色分層結構確保輸出穩定：System Prompt 固定繁中規則與 JSON 格式要求，User Prompt 代入即時異常資料變數，Assistant Message 提供 few-shot 示範以穩定格式，並明確設定資料不足時的 fallback 回覆，避免模型捏造。');
        $('#summary-model').val('選擇模型 A（TW-LLM-Chat-7B）：MIT License 可自由商用部署、繁體中文支援良好、單張 RTX 3090 即可運行符合現有硬體，7B 規模在分鐘級延遲下達可接受效能。放棄 32B 模型（硬體成本過高）及 3B 模型（繁中能力與準確率風險高）。決策完全依據 Model Card 具體欄位，非憑感覺。');
        $('#summary-deploy').val('選擇純地端部署：資料含內部製程資訊敏感度中高，須避免雲端外洩；部分場域網路不穩，離線能力是硬性需求。CapEx 約 NT$15萬，18個月回收。三階段：PoC（2週/辦公室50筆測試）→ 試營運（2週/A線單機班長實測）→ 準確率與滿意度達標後全線正式上線。');

        // 勾選應避開的常見誤區
        var goodMistakes = [
            'Prompt：把所有指令塞在同一段 User Prompt，沒有角色分層',
            'Prompt：沒有指定輸出格式（JSON），後端無法解析',
            'Prompt：沒有設定「資料不足」的處理規則',
            '模型：只看模型大小/排行榜，沒有看 License',
            '模型：沒有確認繁體中文支援程度',
            '部署：沒有 PoC 驗證就直接採購設備',
            '部署：忽略資料敏感度，直接用雲端 API'
        ];
        $('.mistake-check').each(function() {
            $(this).prop('checked', goodMistakes.indexOf($(this).val()) >= 0);
        });

        $('#summary-validation').val('準備 100 筆由班長標註好的異常測試集（含嚴重程度 ground truth），設定驗收門檻：JSON 格式正確率 ≥90%、嚴重程度分類 F1-score ≥0.80、高嚴重度漏報率 ≤5%。PoC 期間每天與班長開 15 分鐘回饋會快速迭代 Prompt，試營運後根據實際誤報案例調整 Constraints 規則。');
        showToast('📝', '步驟4 範例已載入！');
    }
}

// ============================================================
// 初始化
// ============================================================
$(document).ready(function() {
    renderAnomalyPreview();
    renderCaseModelCards();
    renderMistakesCheckboxes();

    // 初始化步驟（根據 active_step）
    showStep(typeof ACTIVE_STEP !== 'undefined' ? ACTIVE_STEP : 1);

    // 如果有已提交的資料，預填
    if (typeof SUBMISSIONS_DATA !== 'undefined') {
        Object.entries(SUBMISSIONS_DATA).forEach(function([step, sub]) {
            var d = sub.data;
            if (step === '1' || step === 1) {
                if (d.goal) $('#case-goal').val(d.goal);
                if (d.context) $('#case-context').val(d.context);
                if (d.constraints) $('#case-constraints').val(d.constraints);
                if (d.output_format) $('#case-format').val(d.output_format);
                if (d.evaluation) $('#case-evaluation').val(d.evaluation);
                if (d.system_prompt) $('#case-system').val(d.system_prompt);
                if (d.user_prompt) $('#case-user').val(d.user_prompt);
                if (d.assistant_message) $('#case-assistant').val(d.assistant_message);
            }
            if (step === '2' || step === 2) {
                if (d.selected_model) $('input[name="case-model"][value="' + d.selected_model + '"]').prop('checked', true);
                if (d.model_card_reason) $('#case-model-reason').val(d.model_card_reason);
                if (d.risks) $('#case-model-risks').val(d.risks);
                if (d.limitations) $('#case-model-limitations').val(d.limitations);
            }
            if (step === '3' || step === 3) {
                if (d.solution) $('input[name="case-deploy"][value="' + d.solution + '"]').prop('checked', true);
                if (d.cost_analysis) $('#case-cost').val(d.cost_analysis);
                if (d.risk_explanation) $('#case-risk-explain').val(d.risk_explanation);
                if (d.poc_plan) $('#case-poc').val(d.poc_plan);
            }
        });
    }
});
