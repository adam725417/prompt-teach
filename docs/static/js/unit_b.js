/**
 * unit_b.js - 單元 B 互動邏輯
 * Hugging Face 模型挑選與 Model Card
 */

// ============================================================
// 選型六步驟資料
// ============================================================
var SELECTION_STEPS = [
    {
        num: 1, icon: '🎯', title: '定義任務',
        desc: '在看任何模型之前，先把任務講清楚',
        details: '你需要什麼功能？文字生成、摘要、分類、問答、翻譯？輸入是什麼格式？輸出要什麼格式？這些問題決定了你需要哪種「模態」的模型。',
        factory: '設備異常摘要：輸入繁中短訊息 → 輸出 JSON（摘要 + 分類 + 嚴重程度）',
        mistake: '直接 Google「最好的 AI 模型」然後就選排名第一的——這不叫選型，叫抽獎',
        color: 'blue'
    },
    {
        num: 2, icon: '🧩', title: '看模態',
        desc: 'LLM / VLM / ASR / Embedding——用對工具才有效',
        details: 'LLM（大型語言模型）：文字理解與生成 | VLM（視覺語言模型）：圖像+文字 | ASR（語音識別）：聲音→文字 | Embedding：文字向量化，用於語意搜尋',
        factory: '設備異常訊息是文字任務 → 選 LLM 或 Embedding，不需要 VLM 或 ASR',
        mistake: '買了一個超強的 VLM，結果你的任務根本沒有圖片輸入，純屬浪費資源',
        color: 'purple'
    },
    {
        num: 3, icon: '⚖️', title: '看授權 License',
        desc: 'Apache 2.0 / MIT / CC BY-NC——授權決定你能不能商用',
        details: '常見授權等級：MIT / Apache 2.0（完全商用） > CC BY（署名即可商用） > CC BY-NC（非商業限制） > 自定義商業授權（需購買）',
        factory: '工廠 AI 系統通常是商業用途（對內服務算商業），CC BY-NC 的模型法律上不能用！',
        mistake: '「反正我是內部使用，不算商業」——錯！License 上寫的是 Non-Commercial 就是不行',
        color: 'red'
    },
    {
        num: 4, icon: '📋', title: '看 Model Card',
        desc: '模型的「身分證」——不看這個就直接用等於開車不看說明書',
        details: '關鍵欄位：Intended Use（設計用途）、Limitations（限制/偏誤）、Evaluation Results（評估指標）、Languages（語言支援）、Out-of-scope uses（不適用場景）',
        factory: '繁體中文任務一定要確認 Languages 欄位！很多模型繁中能力比英文差很多',
        mistake: '只看模型描述第一段「This model is powerful」就決定使用，後來才發現繁中完全亂碼',
        color: 'green'
    },
    {
        num: 5, icon: '🖥️', title: '看部署條件',
        desc: '模型能跑 ≠ 你能跑——記憶體、GPU、延遲都要對得起來',
        details: '確認：最低 GPU VRAM 需求、量化版本是否可用（INT4/INT8）、推論延遲（秒/次）、是否支援 CPU 推論（邊緣裝置）',
        factory: '7B 模型 FP16 需要約 14GB VRAM，但 INT4 量化後只需 5-6GB，可以跑在 RTX 3060',
        mistake: '看到「7B 模型」就以為 7GB 記憶體能跑——實際還要加 KV Cache、Context 等開銷',
        color: 'orange'
    },
    {
        num: 6, icon: '🧪', title: '小樣本實測',
        desc: '紙上談兵不夠，真正的任務資料才是最終裁判',
        details: '準備 20-50 筆你自己的任務資料，讓候選模型跑一遍，計算：格式符合率、摘要準確率、嚴重程度分類正確率。用數字說話，不用感覺',
        factory: '用 10 筆真實異常通報資料測試，看 JSON 格式符合率和摘要品質，再做最終決定',
        mistake: '沒有用自己的資料測試，就直接購買 GPU 設備或部署——這是最貴的錯誤',
        color: 'teal'
    }
];

// ============================================================
// B-4 常見誤區
// ============================================================
var B_MISTAKES = [
    {
        icon: '📏', title: '誤區1：只看模型大小（7B/13B/70B）',
        desc: '「70B 一定比 7B 好」是個迷思！更大的模型需要更多資源、更慢的速度，但在你的特定任務上不一定更準。適合 > 最大。'
    },
    {
        icon: '🏆', title: '誤區2：只看排行榜，不看任務場景',
        desc: 'MMLU、HellaSwag 這些 benchmark 大多是英文通用任務！繁體中文工業場景與這些 benchmark 的相關性很低，不要被排名迷惑。'
    },
    {
        icon: '⚖️', title: '誤區3：忽略 License，導致商用風險',
        desc: 'CC BY-NC 的模型用在商業產品上，法律責任自負。很多好模型都有授權限制，選之前必看！實際案例：公司被開源授權方告了，賠了一大筆。'
    },
    {
        icon: '🌏', title: '誤區4：忽略語言能力（繁中表現不一定好）',
        desc: '同一個模型，英文能力 90%，繁體中文可能只有 60%。工廠情境是繁中為主，必須實際測試繁中任務，不能只看英文 benchmark。'
    },
    {
        icon: '🧪', title: '誤區5：沒用自己的資料做小樣本測試',
        desc: '模型在公開資料集上的表現，不代表在你的工廠資料上的表現。專有術語、縮寫、設備代號——只有用真實資料測試才算數。'
    }
];

// Model Card 欄位標記類別
var LABEL_CATEGORIES = [
    { id: 'intended_use', label: '模型用途', color: 'blue' },
    { id: 'out_of_scope', label: '不適用場景', color: 'red' },
    { id: 'training_data', label: '訓練資料', color: 'purple' },
    { id: 'evaluation', label: '評估結果', color: 'green' },
    { id: 'limitations', label: '限制/偏誤', color: 'yellow' },
    { id: 'license', label: '授權', color: 'orange' },
    { id: 'deployment', label: '硬體需求', color: 'teal' },
    { id: 'languages', label: '語言支援', color: 'indigo' }
];

var currentLabelTarget = null;
var currentModelId = null;

// ============================================================
// 分頁切換
// ============================================================
function showTabB(tabId) {
    $('.tab-b-content').addClass('hidden');
    $('.tab-btn-b').removeClass('bg-purple-500 text-white shadow').addClass('text-gray-500');

    $('#tab-' + tabId).removeClass('hidden').addClass('fade-in');
    $('#tab-btn-' + tabId).addClass('bg-purple-500 text-white shadow').removeClass('text-gray-500');

    var url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
}

// ============================================================
// B-1: 選型流程渲染
// ============================================================
function renderSelectionSteps() {
    var $steps = $('#selection-steps');
    var colorMap = {
        blue: 'blue', purple: 'purple', red: 'red',
        green: 'green', orange: 'orange', teal: 'emerald'
    };

    SELECTION_STEPS.forEach(function(step) {
        var c = colorMap[step.color] || 'blue';
        var html = '<div class="decision-node bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">';
        html += '<div class="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition" onclick="toggleStep(' + step.num + ')">';
        html += '<div class="w-10 h-10 rounded-xl bg-' + c + '-100 text-' + c + '-600 flex items-center justify-center font-black text-lg flex-shrink-0">' + step.num + '</div>';
        html += '<div class="text-2xl flex-shrink-0">' + step.icon + '</div>';
        html += '<div class="flex-1">';
        html += '<h3 class="font-bold text-gray-800">' + step.title + '</h3>';
        html += '<p class="text-xs text-gray-500">' + step.desc + '</p>';
        html += '</div>';
        html += '<i class="fas fa-chevron-down text-gray-300 text-sm transition" id="step-icon-' + step.num + '"></i>';
        html += '</div>';

        // 展開內容
        html += '<div class="node-content" id="step-detail-' + step.num + '">';
        html += '<div class="px-5 pb-5 space-y-3 border-t border-gray-50">';
        html += '<div class="pt-3 text-sm text-gray-700">' + step.details + '</div>';
        html += '<div class="bg-' + c + '-50 rounded-xl p-3">';
        html += '<div class="text-xs font-bold text-' + c + '-700 mb-1">🏭 工廠場景</div>';
        html += '<p class="text-xs text-' + c + '-600">' + step.factory + '</p>';
        html += '</div>';
        html += '<div class="bg-red-50 rounded-xl p-3">';
        html += '<div class="text-xs font-bold text-red-700 mb-1">❌ 常見誤判</div>';
        html += '<p class="text-xs text-red-600">' + step.mistake + '</p>';
        html += '</div>';
        html += '</div></div></div>';

        $steps.append(html);
    });
}

function toggleStep(num) {
    var $detail = $('#step-detail-' + num);
    var $icon = $('#step-icon-' + num);
    var isOpen = !$detail.hasClass('node-content') || $detail.css('max-height') !== '0px';

    if ($detail.css('max-height') === '0px' || $detail.css('max-height') === '') {
        $detail.css('max-height', '500px').css('opacity', '1');
        $icon.css('transform', 'rotate(180deg)');
    } else {
        $detail.css('max-height', '0').css('opacity', '0');
        $icon.css('transform', '');
    }
}

// ============================================================
// B-2: Model Card 解剖台
// ============================================================
function renderModelSelector() {
    var $sel = $('#model-selector');
    MODELS_DATA.forEach(function(model, idx) {
        var colors = ['blue', 'purple', 'green'];
        var c = colors[idx % colors.length];
        var html = '<button onclick="loadModelCard(\'' + model.id + '\')" id="mc-btn-' + model.id + '" class="mc-btn px-4 py-2 rounded-xl text-sm font-medium border-2 border-gray-200 text-gray-500 hover:border-' + c + '-400 hover:text-' + c + '-600 transition">';
        html += model.name + '</button>';
        $sel.append(html);
    });
}

function loadModelCard(modelId) {
    currentModelId = modelId;
    var model = MODELS_DATA.find(m => m.id === modelId);
    if (!model) return;

    // 更新按鈕狀態
    $('.mc-btn').removeClass('border-blue-400 text-blue-600 border-purple-400 text-purple-600 border-green-400 text-green-600 bg-blue-50 bg-purple-50 bg-green-50');
    var colors = { MODEL_A: 'blue', MODEL_B: 'purple', MODEL_C: 'green' };
    var c = colors[modelId] || 'blue';
    $('#mc-btn-' + modelId).addClass('border-' + c + '-400 text-' + c + '-600 bg-' + c + '-50');

    // 更新標題
    $('#model-card-title').text(model.name);

    // 渲染 Model Card 內容
    var sections = [
        { key: 'intended_use', title: '🎯 Intended Use（設計用途）', content: model.intended_use, correct: 'intended_use' },
        { key: 'license', title: '⚖️ License（授權條款）', content: model.license, correct: 'license' },
        { key: 'languages', title: '🌏 Supported Languages（語言支援）', content: model.languages, correct: 'languages' },
        { key: 'evaluation', title: '📊 Evaluation Results（評估結果）', content: model.evaluation, correct: 'evaluation' },
        { key: 'limitations', title: '⚠️ Limitations & Biases（限制與偏誤）', content: model.limitations, correct: 'limitations' },
        { key: 'out_of_scope', title: '🚫 Out-of-scope Uses（不適用場景）', content: model.out_of_scope, correct: 'out_of_scope' },
        { key: 'deployment', title: '💻 Technical Requirements（硬體需求）', content: model.deployment_requirements, correct: 'deployment' },
        { key: 'training_data', title: '📚 Training Data（訓練資料）', content: '基於公開網路文本與特定領域語料（詳見完整文件）', correct: 'training_data' }
    ];

    var $content = $('#model-card-content');
    $content.empty();

    // 模型基本資訊頭部
    var headerHtml = '<div class="bg-gray-50 rounded-xl p-4 mb-4">';
    headerHtml += '<div class="flex items-start gap-3">';
    headerHtml += '<div class="flex-1">';
    headerHtml += '<h2 class="font-bold text-lg text-gray-900">' + model.name + '</h2>';
    headerHtml += '<div class="flex flex-wrap gap-2 mt-1">';
    headerHtml += '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">' + model.modality + '</span>';
    headerHtml += '<span class="text-xs bg-' + (model.license.includes('MIT') || model.license.includes('Apache') ? 'green' : 'red') + '-100 text-' + (model.license.includes('MIT') || model.license.includes('Apache') ? 'green' : 'red') + '-700 px-2 py-0.5 rounded-full">⚖️ ' + model.license.split('（')[0] + '</span>';
    headerHtml += '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">⚙️ ' + model.parameters + '</span>';
    headerHtml += '</div></div></div></div>';
    $content.append(headerHtml);

    sections.forEach(function(sec) {
        var html = '<div class="model-card-section mb-3" id="mcs-' + sec.key + '" data-correct="' + sec.correct + '" onclick="selectCardSection(\'' + sec.key + '\')">';
        html += '<div class="text-xs font-bold text-gray-600 mb-1">' + sec.title + '</div>';
        html += '<p class="text-sm text-gray-700">' + escapeHtml(sec.content) + '</p>';
        html += '<div class="labeled-badge hidden mt-1 text-xs"></div>';
        html += '</div>';
        $content.append(html);
    });

    // 顯示回饋區
    $('#labeling-feedback').addClass('hidden');
}

function selectCardSection(sectionKey) {
    // 先清除之前的選取狀態
    $('.model-card-section').removeClass('labeled ring-2 ring-purple-300');
    $('#mcs-' + sectionKey).addClass('labeled ring-2 ring-purple-300');
    currentLabelTarget = sectionKey;
    showToast('👆', '已選取段落，點擊右側類別按鈕標記');
}

function renderLabelButtons() {
    var $btns = $('#label-buttons');
    LABEL_CATEGORIES.forEach(function(cat) {
        var colorMap = {
            blue: 'blue', red: 'red', purple: 'purple', green: 'green',
            yellow: 'yellow', orange: 'orange', teal: 'teal', indigo: 'indigo'
        };
        var c = colorMap[cat.color] || 'blue';
        var html = '<button onclick="applyLabel(\'' + cat.id + '\', \'' + cat.label + '\', \'' + c + '\')" class="w-full text-left px-3 py-2 rounded-xl text-xs border border-gray-200 hover:border-' + c + '-400 hover:bg-' + c + '-50 hover:text-' + c + '-700 transition font-medium">';
        html += '<i class="fas fa-tag mr-1 text-' + c + '-400"></i>' + cat.label;
        html += '</button>';
        $btns.append(html);
    });
}

function applyLabel(labelId, labelText, color) {
    if (!currentLabelTarget) {
        showToast('⚠️', '請先點擊 Model Card 中的一個段落');
        return;
    }

    var $section = $('#mcs-' + currentLabelTarget);
    var correctLabel = $section.data('correct');
    var isCorrect = labelId === correctLabel;

    // 顯示標記
    var $badge = $section.find('.labeled-badge');
    $badge.html('<span class="bg-' + color + '-100 text-' + color + '-700 px-2 py-0.5 rounded-full">' + labelText + '</span>');
    $badge.removeClass('hidden');

    // 回饋
    var $feedback = $('#labeling-feedback');
    var $content = $('#labeling-feedback-content');

    if (isCorrect) {
        $section.addClass('ring-green-400').removeClass('ring-purple-300');
        $content.html('<div class="flex items-center gap-2 text-green-700">✅ <span>標記正確！「' + labelText + '」確實是這段的主要內容</span></div>');
        showToast('✅', '標記正確！');
    } else {
        $section.addClass('ring-red-400').removeClass('ring-purple-300');
        var correctCat = LABEL_CATEGORIES.find(c => c.id === correctLabel);
        $content.html('<div class="text-red-700">❌ 不太對！這段最主要的類別應該是「<strong>' + (correctCat ? correctCat.label : correctLabel) + '</strong>」。<br>你標的「' + labelText + '」也有一定道理，但不是主要分類。</div>');
        showToast('📝', '試試看其他類別');
    }

    $feedback.removeClass('hidden');
    currentLabelTarget = null;
}

// ============================================================
// B-3: 模型 PK 卡片渲染
// ============================================================
function renderPKModelCards() {
    var $container = $('#pk-model-cards');
    if (!$container.length) return;

    MODELS_DATA.forEach(function(model, idx) {
        var colors = ['blue', 'purple', 'green'];
        var c = colors[idx % colors.length];

        var html = '<div class="bg-white border-2 border-' + c + '-200 rounded-2xl p-4 card-hover">';
        html += '<div class="flex items-center gap-2 mb-3">';
        html += '<div class="w-8 h-8 bg-' + c + '-100 rounded-lg text-' + c + '-600 font-black text-sm flex items-center justify-center">' + String.fromCharCode(65 + idx) + '</div>';
        html += '<div><div class="font-bold text-sm text-gray-800">' + model.name + '</div>';
        html += '<div class="text-xs text-gray-500">' + model.parameters + ' | ' + model.modality + '</div></div>';
        html += '</div>';

        // License
        var licOk = model.license.includes('MIT') || model.license.includes('Apache');
        html += '<div class="text-xs mb-2 flex items-center gap-1"><span class="' + (licOk ? 'text-green-600' : 'text-red-500') + ' font-medium">' + (licOk ? '✅' : '❌') + ' 授權：</span><span class="text-gray-600">' + model.license.split('（')[0] + '</span></div>';

        // 語言
        html += '<div class="text-xs mb-2"><span class="text-gray-500">🌏 語言：</span><span class="text-gray-700">' + model.languages.split('（')[0] + '</span></div>';

        // 優缺點
        html += '<div class="space-y-1 mt-3">';
        model.strengths.forEach(function(s) {
            html += '<div class="text-xs text-green-700 flex items-center gap-1"><i class="fas fa-plus text-green-400 text-xs"></i>' + s + '</div>';
        });
        model.weaknesses.forEach(function(w) {
            html += '<div class="text-xs text-red-600 flex items-center gap-1"><i class="fas fa-minus text-red-400 text-xs"></i>' + w + '</div>';
        });
        html += '</div>';

        // 部署需求
        html += '<div class="mt-3 bg-gray-50 rounded-xl p-2 text-xs text-gray-500">';
        html += '<i class="fas fa-microchip text-gray-400 mr-1"></i>' + model.deployment_requirements.split('；')[0];
        html += '</div>';

        html += '</div>';
        $container.append(html);
    });
}

function submitModelPK() {
    var selected = $('input[name="model-choice"]:checked').val();
    var reasonSelected = $('#reason-selected').val().trim();
    var reasonRejected = $('#reason-rejected').val().trim();
    var risk = $('#risk-assessment').val().trim();
    var nextSteps = $('#next-steps').val().trim();

    if (!selected) { showToast('⚠️', '請先選擇一個模型'); return; }

    $.ajax({
        url: '/api/model-selection/submit', method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            task_id: 'TASK_01',
            selected_model: selected,
            reason_selected: reasonSelected,
            reason_rejected: reasonRejected,
            risk_assessment: risk,
            next_steps: nextSteps
        }),
        success: function(data) {
            var s = data.suggestion;
            var colorMap = { green: 'green', yellow: 'yellow', blue: 'blue', gray: 'gray' };
            var c = colorMap[s.color] || 'blue';

            var html = '<div class="bg-' + c + '-50 border border-' + c + '-200 rounded-2xl p-5 fade-in">';

            // 裁定標題
            html += '<div class="font-bold text-' + c + '-800 text-base mb-2">' + s.verdict + '</div>';

            // 說明段落
            html += '<p class="text-sm text-gray-700 mb-4">' + s.summary + '</p>';

            // 建議步驟
            if (s.tips && s.tips.length) {
                html += '<div class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">建議下一步</div>';
                html += '<ul class="space-y-2">';
                s.tips.forEach(function(tip, i) {
                    html += '<li class="flex items-start gap-2 text-sm text-gray-700">';
                    html += '<span class="w-5 h-5 rounded-full bg-' + c + '-100 text-' + c + '-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">' + (i + 1) + '</span>';
                    html += '<span>' + tip + '</span></li>';
                });
                html += '</ul>';
            }

            html += '</div>';
            $('#pk-feedback').html(html).removeClass('hidden');
            showToast('💡', '已收到你的選型決策！');
        },
        error: function(xhr) {
            showToast('❌', '提交失敗，請重試（' + xhr.status + '）');
        }
    });
}

// ============================================================
// B-4: 常見誤區
// ============================================================
function renderMistakesB() {
    var $grid = $('#mistakes-grid-b');
    B_MISTAKES.forEach(function(m) {
        var html = '<div class="mistake-card bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">';
        html += '<div class="text-2xl mb-2">' + m.icon + '</div>';
        html += '<h3 class="font-bold text-amber-800 text-sm mb-2">' + m.title + '</h3>';
        html += '<p class="text-xs text-gray-600">' + m.desc + '</p>';
        html += '</div>';
        $grid.append(html);
    });
}

// ============================================================
// B-5: 小測驗
// ============================================================
function renderQuizB() {
    renderQuiz(B_QUIZZES_DATA, 'quiz-container-b', 'quiz-submit-b', 'purple');
}

function submitQuizB() {
    var answers = collectAnswers(B_QUIZZES_DATA, 'quiz-container-b');
    $.ajax({
        url: '/api/quiz/submit', method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ unit: 'B', answers: answers }),
        success: function(data) {
            showQuizResult(data, 'quiz-result-b', 'purple');
            $('#quiz-result-b').removeClass('hidden');
            showToast(getScoreEmoji(data.score), '測驗得分：' + data.score + ' 分');
        }
    });
}

// ============================================================
// 案例模型卡（供 case.js 共用）
// ============================================================
function renderCaseModelCards(containerId) {
    var $container = $('#' + containerId);
    if (!$container.length) return;
    $container.empty();

    MODELS_DATA.forEach(function(model, idx) {
        var colors = ['blue', 'purple', 'green'];
        var c = colors[idx % colors.length];
        var licOk = model.license.includes('MIT') || model.license.includes('Apache');

        var html = '<div class="border-2 border-' + c + '-200 rounded-2xl p-4 bg-' + c + '-50">';
        html += '<div class="font-bold text-sm text-' + c + '-800 mb-2">' + model.display_name + '</div>';
        html += '<div class="space-y-1 text-xs">';
        html += '<div><span class="' + (licOk ? 'text-green-600' : 'text-red-500') + '">' + (licOk ? '✅' : '❌') + '</span> ' + model.license.split('（')[0] + '</div>';
        html += '<div>🌏 ' + model.languages.split('（')[0] + '</div>';
        html += '<div>⚙️ ' + model.parameters + ' | ' + model.deployment_requirements.split('；')[0] + '</div>';
        html += '</div>';
        html += '<div class="mt-2 flex flex-wrap gap-1">';
        model.strengths.slice(0, 2).forEach(function(s) {
            html += '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">+' + s + '</span>';
        });
        html += '</div></div>';
        $container.append(html);
    });
}

// ============================================================
// 初始化
// ============================================================
$(document).ready(function() {
    renderSelectionSteps();
    renderModelSelector();
    renderLabelButtons();
    renderPKModelCards();
    renderMistakesB();
    renderQuizB();

    // 預設載入第一個模型卡
    if (MODELS_DATA.length) {
        loadModelCard(MODELS_DATA[0].id);
    }
});
