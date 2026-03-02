/**
 * unit_a.js - 單元 A 互動邏輯
 * Prompt 核心原理
 */

// ============================================================
// Prompt 五要素資料
// ============================================================
var PROMPT_ELEMENTS = [
    {
        id: 'goal', icon: '🎯', label: '目標 Goal', color: 'blue',
        desc: '清楚定義這個 Prompt 要讓模型做什麼事',
        plain: '「你是設備工程師，分析以下異常訊息的原因」——告訴模型：它是誰、要做什麼',
        example: '機台異常分析系統：識別可能原因 + 嚴重程度',
        good: '你是工廠設備工程師，請分析下列機台異常訊息，判斷嚴重程度（高/中/低）',
        bad: '幫我看看這個機器怎麼了',
        why_bad: '沒有角色、沒有任務邊界、沒有判斷維度，模型只能猜你要什麼'
    },
    {
        id: 'context', icon: '📚', label: '資料 Context', color: 'purple',
        desc: '提供模型完成任務所需的背景資料',
        plain: '「資料不足，就不能有精準答案」——給機台ID、異常訊息、班別等具體資訊',
        example: '機台ID: WE-27；班別: 早班；異常訊息: 收線張力波動 ±15%；最近維修: 2週前',
        good: '提供具體的欄位資料、格式清楚、資料量足夠',
        bad: '就這樣，你知道的',
        why_bad: '沒有輸入資料，模型只能虛構或給泛泛的答案，完全沒有工程價值'
    },
    {
        id: 'constraints', icon: '⚖️', label: '規則 Constraints', color: 'red',
        desc: '設定模型不能做的事，或必須遵守的限制',
        plain: '「不可捏造」「若資料不足要說出來」「只能選高/中/低」——這些是底線',
        example: '若資料不足請回覆「資料不足，無法判斷」；可能原因最多 3 項；使用繁體中文',
        good: '列出明確的禁止事項和必要限制，讓模型知道邊界在哪',
        bad: '（完全沒有限制）',
        why_bad: '沒有規則，模型可能捏造資料、輸出超長答案、語言不一致，難以系統化使用'
    },
    {
        id: 'format', icon: '📐', label: '格式 Output Format', color: 'green',
        desc: '指定輸出的結構與格式，讓後端系統可以解析',
        plain: '「告訴它輸出要長什麼樣」——JSON、清單、固定欄位，後端才能串接',
        example: '{"summary": "50字內摘要", "severity": "高/中/低", "possible_causes": [], "action": "建議行動"}',
        good: '提供具體 JSON schema 或清晰格式說明，甚至直接給範例',
        bad: '告訴我分析結果就好',
        why_bad: '沒有格式指定，每次輸出格式不同，MES 系統根本無法自動解析，白做了！'
    },
    {
        id: 'evaluation', icon: '📊', label: '評估 Evaluation', color: 'orange',
        desc: '定義什麼樣的回答算好，讓你有依據判斷 Prompt 是否需要改進',
        plain: '「你怎麼知道 Prompt 有沒有變好？」——評估標準是工程迭代的基礎',
        example: '好的回應：格式正確 + 摘要精準在 50 字內 + 原因具體可操作\n差的回應：含糊描述 / 超出 3 項 / 格式不符',
        good: '定義具體的成功標準：格式符合率 > 95%、摘要長度 ≤ 50 字、嚴重程度準確',
        bad: '（沒有評估，感覺看起來可以就行了）',
        why_bad: '沒有評估，你不知道 Prompt 改了有沒有進步，只能靠感覺——這不是工程，是玄學'
    }
];

// ============================================================
// 角色結構資料
// ============================================================
var ROLE_DATA = {
    system: {
        icon: 'fas fa-shield-halved',
        label: 'System Prompt',
        subtitle: '系統提示 / 遊戲規則',
        color: 'blue',
        analogy: '就像「遊戲規則 / 工廠 SOP」',
        desc: '設定不可違反的高層規則、角色定義、輸出格式規範。每次對話都會執行，不會因為 User 的要求而改變。',
        factory_use: '設定助手角色、輸出語言、JSON 格式規範、不可捏造的規則',
        common_content: ['角色設定（你是工廠值班助理）', '輸出語言（繁體中文）', '格式規範（輸出必須是 JSON）', '底線規則（若資料不足請回覆「資料不足」）'],
        wrong_use: '把會變動的任務內容或每次不同的輸入資料放在 System Prompt 中'
    },
    user: {
        icon: 'fas fa-user',
        label: 'User Prompt',
        subtitle: '使用者提示 / 本次工單',
        color: 'green',
        analogy: '就像「本次的工單任務」',
        desc: '包含每次請求的具體任務描述和輸入資料。每一次呼叫都可以不同，是動態的部分。',
        factory_use: '本次要分析的機台ID、異常訊息、任務描述',
        common_content: ['任務描述（請分析以下異常）', '輸入資料（機台ID、異常訊息）', '本次特殊要求（可選）'],
        wrong_use: '把所有規則都塞進 User Prompt，導致每次都要重複規則且容易被忽略'
    },
    assistant: {
        icon: 'fas fa-robot',
        label: 'Assistant Message',
        subtitle: '助手訊息 / 示範範例',
        color: 'purple',
        analogy: '就像「之前做過的範例與回覆紀錄」',
        desc: '提供示範輸出（few-shot 範例）或對話歷史。模型會學習並模仿這些示範的格式和風格。',
        factory_use: '提供正確 JSON 格式的示範、歷史異常分析範例、few-shot 學習範例',
        common_content: ['格式示範（{...JSON 範例...}）', 'few-shot 對話範例', '歷史分析結果（多輪對話時）'],
        wrong_use: '完全不用 Assistant 示範，卻期待格式高度穩定和一致'
    }
};

var ROLE_VERSION_DATA = {
    A: {
        label: '版本A：全塞 User Prompt',
        color: 'red',
        description: '把所有內容（規則、任務、格式要求、示範）全部塞在 User Prompt',
        prompt: {
            system: '',
            user: '你是工廠助理，使用繁體中文，若資料不足請說「資料不足」，不可捏造。請分析設備異常，輸出JSON格式：{"summary": "摘要", "severity": "高/中/低", "possible_causes": [], "action": "建議"}。機台ID: WE-27；異常訊息: 收線張力波動 ±15%，已連續發生 3 次。',
            assistant: ''
        },
        output: '{"summary": "WE-27收線張力波動", "severity": "中", "possible_causes": ["可能是感測器", "可能是機械問題"], "action": "檢查"}',
        metrics: { stability: 55, format: 65, parseable: 70, on_task: 60 },
        issues: ['格式偶爾不穩定，規則容易被忽略', '任務與規則混在一起難以維護', '格式示範缺失，可能出現不標準 JSON']
    },
    B: {
        label: '版本B：System + User',
        color: 'yellow',
        description: '規則放 System Prompt，任務放 User Prompt',
        prompt: {
            system: '你是工廠值班助理，回覆使用繁體中文。輸出必須是 JSON 格式。若資料不足，請回覆「資料不足」，不可捏造。可能原因最多 3 項。',
            user: '請分析以下設備異常訊息：\n機台ID: WE-27\n異常訊息: 收線張力波動超過 ±15%，已連續發生 3 次',
            assistant: ''
        },
        output: '{"summary": "WE-27 早班發現收線張力反覆波動，超過 ±15% 閾值", "severity": "中", "possible_causes": ["張力感測器漂移", "收線機構磨損", "原料張力特性差異"], "action": "暫停生產，排查感測器"}',
        metrics: { stability: 78, format: 82, parseable: 85, on_task: 80 },
        issues: ['比版本A好很多，但缺乏格式示範', '格式偶爾仍有細節不一致']
    },
    C: {
        label: '版本C：三層分離 ✨ 最佳',
        color: 'green',
        description: '規則放 System、任務放 User、格式示範放 Assistant',
        prompt: {
            system: '你是工廠值班助理，回覆使用繁體中文。輸出必須是 JSON 格式。若資料不足，請回覆「資料不足」，不可捏造。可能原因最多 3 項，按機率排序。摘要不超過 50 字。',
            user: '請分析以下設備異常訊息，輸出 JSON：\n機台ID: WE-27\n班別: 早班\n異常訊息: 收線張力波動超過 ±15%，已連續發生 3 次',
            assistant: '{"summary": "WE-27 早班收線張力反覆超標，需緊急排查", "severity": "高", "possible_causes": ["張力感測器漂移", "收線滾輪磨損", "原料批次差異"], "action": "暫停生產，更換感測器後確認"}'
        },
        output: '{"summary": "WE-27 早班收線張力波動 3 次超 ±15%，疑似感測器問題", "severity": "高", "possible_causes": ["張力感測器漂移或故障", "收線滾輪磨損導致阻力不均", "原料批次張力特性偏差"], "action": "立即暫停生產，更換感測器後重新校準，確認連續 5 件正常後復線"}',
        metrics: { stability: 95, format: 97, parseable: 98, on_task: 95 },
        issues: []
    }
};

var ROLE_MISTAKES = [
    { icon: '⚠️', title: '誤區1：所有規則都塞進 User Prompt', desc: '導致每次都要重複龐大的指令，且規則容易被模型「忽略」或「混淆」，輸出不穩定' },
    { icon: '⚠️', title: '誤區2：把會變動的任務寫死在 System Prompt', desc: '每次任務都要修改 System Prompt，破壞了「規則固定 / 任務動態」的設計原則' },
    { icon: '⚠️', title: '誤區3：沒用 Assistant 示範卻期待格式穩定', desc: '不給 few-shot 範例，模型只能「猜」你要什麼格式，準確率難以保證' },
    { icon: '⚠️', title: '誤區4：System 和 User 規則互相衝突', desc: '例如 System 說「繁體中文」，User 說「回答英文」——模型不知道聽誰的，輸出亂掉' },
    { icon: '⚠️', title: '誤區5：只看單輪，不考慮對話歷史', desc: '多輪對話中，舊的 Assistant 訊息會「污染」後續輸出的格式與風格，越聊越跑偏' }
];

// ============================================================
// 常見誤區資料（A-4）
// ============================================================
var A_MISTAKES = [
    { icon: '💬', title: '誤區1：把 Prompt 當聊天，不定義任務', desc: '「幫我分析這個」這種說法在朋友之間沒問題，但對模型來說等於什麼都沒說。Prompt 是工程規格書，不是對話！' },
    { icon: '🌫️', title: '誤區2：沒有提供 Context，卻期待精準答案', desc: '「沒有輸入就沒有輸出」——你不給機台ID、異常訊息、時間背景，模型只能編造或泛化，毫無工程價值。' },
    { icon: '🔧', title: '誤區3：不指定輸出格式，後續系統無法串接', desc: '如果輸出是純文字段落，MES 系統怎麼自動解析？JSON 是你的朋友。格式不對，整個 pipeline 都白做了。' },
    { icon: '✍️', title: '誤區4：只改 wording，不改結構', desc: '把「分析」改成「請仔細分析」沒有用！真正的改進在於「加了什麼要素」，而不是「怎麼說同一件事」。' },
    { icon: '📏', title: '誤區5：沒有評估標準，不知道 Prompt 有沒有變好', desc: '沒有 benchmark 就無法迭代。你怎麼知道 v2 比 v1 好？需要設定可量測的指標，才能做工程決策。' },
    { icon: '📦', title: '誤區6：把所有指令塞在同一段 User Prompt 中', desc: '規則、資料、示範全混在一起，模型分不清哪個是「規定」哪個是「任務」，容易忽略重要規則。' },
    { icon: '⚡', title: '誤區7：System 與 User 規則衝突', desc: '「System 說繁中，User 說英文回覆」——矛盾的指令讓模型無所適從，輸出一定會出問題。' },
    { icon: '📜', title: '誤區8：忽略 Assistant 歷史訊息的影響', desc: '多輪對話中，前幾輪的 Assistant 輸出會被當成「格式示範」，若早期輸出格式混亂，後面越來越難回正軌。' }
];

// ============================================================
// 分頁切換
// ============================================================
function showTab(tabId) {
    $('.tab-content').addClass('hidden');
    $('.tab-btn').removeClass('bg-blue-500 text-white shadow');
    $('.tab-btn').addClass('text-gray-500');

    $('#tab-' + tabId).removeClass('hidden').addClass('fade-in');
    $('#tab-btn-' + tabId).addClass('bg-blue-500 text-white shadow');
    $('#tab-btn-' + tabId).removeClass('text-gray-500');

    // 更新 URL
    var url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
}

// ============================================================
// A-1: 渲染五要素卡片
// ============================================================
function renderElements() {
    var $grid = $('#elements-grid');
    PROMPT_ELEMENTS.forEach(function(el) {
        var html = '<div class="element-card bg-white border border-gray-100 rounded-2xl shadow-sm cursor-pointer card-hover overflow-hidden" onclick="toggleElement(\'' + el.id + '\')">';
        html += '<div class="p-5">';
        html += '<div class="flex items-center gap-3 mb-2">';
        html += '<div class="text-2xl">' + el.icon + '</div>';
        html += '<div>';
        html += '<h3 class="font-bold text-gray-800 text-sm">' + el.label + '</h3>';
        html += '<p class="text-xs text-gray-500">' + el.desc + '</p>';
        html += '</div>';
        html += '<i class="fas fa-chevron-down ml-auto text-gray-300 text-sm transition" id="el-icon-' + el.id + '"></i>';
        html += '</div>';
        html += '</div>';
        // 展開區域
        html += '<div class="element-detail hidden" id="el-detail-' + el.id + '">';
        html += '<div class="px-5 pb-5 space-y-3">';
        html += '<div class="bg-' + el.color + '-50 rounded-xl p-3"><div class="text-xs font-bold text-' + el.color + '-700 mb-1">💡 白話說明</div><p class="text-xs text-' + el.color + '-600">' + el.plain + '</p></div>';
        html += '<div class="bg-gray-50 rounded-xl p-3"><div class="text-xs font-bold text-gray-600 mb-1">🏭 工廠場景範例</div><code class="text-xs text-gray-700 break-words">' + escapeHtml(el.example) + '</code></div>';
        html += '<div class="grid grid-cols-2 gap-2">';
        html += '<div class="bg-green-50 rounded-xl p-3"><div class="text-xs font-bold text-green-700 mb-1">✅ 好寫法</div><p class="text-xs text-green-600">' + escapeHtml(el.good) + '</p></div>';
        html += '<div class="bg-red-50 rounded-xl p-3"><div class="text-xs font-bold text-red-600 mb-1">❌ 壞寫法</div><p class="text-xs text-red-500">' + escapeHtml(el.bad) + '</p><p class="text-xs text-gray-400 mt-1">因為：' + escapeHtml(el.why_bad) + '</p></div>';
        html += '</div></div></div>';
        html += '</div>';
        $grid.append(html);
    });
}

function toggleElement(id) {
    var $detail = $('#el-detail-' + id);
    var $icon = $('#el-icon-' + id);
    if ($detail.hasClass('hidden')) {
        $detail.removeClass('hidden').addClass('fade-in');
        $icon.css('transform', 'rotate(180deg)');
    } else {
        $detail.addClass('hidden');
        $icon.css('transform', '');
    }
}

// ============================================================
// A-1.5: 角色卡片渲染
// ============================================================
function renderRoleCards() {
    var $grid = $('#role-cards-grid');
    var roles = ['system', 'user', 'assistant'];
    var colors = { system: 'blue', user: 'green', assistant: 'purple' };

    roles.forEach(function(role) {
        var data = ROLE_DATA[role];
        var c = colors[role];

        var html = '<div class="bg-white border-2 border-' + c + '-200 rounded-2xl overflow-hidden card-hover cursor-pointer" onclick="toggleRoleCard(\'' + role + '\')">';
        html += '<div class="bg-' + c + '-50 p-4">';
        html += '<div class="flex items-center gap-2 mb-1">';
        html += '<i class="' + data.icon + ' text-' + c + '-500"></i>';
        html += '<h3 class="font-bold text-' + c + '-700">' + data.label + '</h3>';
        html += '<i class="fas fa-chevron-down ml-auto text-' + c + '-300 text-sm" id="role-icon-' + role + '"></i>';
        html += '</div>';
        html += '<div class="text-xs text-' + c + '-500 font-medium">' + data.subtitle + '</div>';
        html += '</div>';
        html += '<div class="role-detail hidden" id="role-detail-' + role + '">';
        html += '<div class="p-4 space-y-3 text-sm">';
        html += '<div class="bg-' + c + '-50 rounded-xl p-3 text-' + c + '-700 text-xs font-medium">📌 ' + data.analogy + '</div>';
        html += '<p class="text-gray-600 text-xs">' + data.desc + '</p>';
        html += '<div><div class="text-xs font-bold text-gray-700 mb-1">🏭 工廠用途</div>';
        html += '<p class="text-xs text-gray-500">' + data.factory_use + '</p></div>';
        html += '<div><div class="text-xs font-bold text-gray-700 mb-1">📝 常見放置內容</div><ul class="text-xs text-gray-500 space-y-0.5">';
        data.common_content.forEach(function(item) {
            html += '<li class="flex items-start gap-1"><i class="fas fa-circle-dot text-' + c + '-300 text-xs mt-0.5"></i>' + item + '</li>';
        });
        html += '</ul></div>';
        html += '<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700"><strong>⚠️ 錯誤用法：</strong>' + data.wrong_use + '</div>';
        html += '</div></div></div>';

        $grid.append(html);
    });
}

function toggleRoleCard(role) {
    var $detail = $('#role-detail-' + role);
    var $icon = $('#role-icon-' + role);
    if ($detail.hasClass('hidden')) {
        $detail.removeClass('hidden').addClass('fade-in');
        $icon.css('transform', 'rotate(180deg)');
    } else {
        $detail.addClass('hidden');
        $icon.css('transform', '');
    }
}

// ============================================================
// A-1.5: 版本比較實驗
// ============================================================
function showRoleVersion(ver) {
    var data = ROLE_VERSION_DATA[ver];
    if (!data) return;

    // 更新按鈕
    $('.rv-btn').removeClass().addClass('rv-btn px-4 py-2 rounded-xl text-sm border-2 border-gray-200 text-gray-500 hover:border-gray-300');
    var colorMap = { A: 'red', B: 'yellow', C: 'green' };
    var c = colorMap[ver];
    $('#rv-btn-' + ver).addClass('border-' + c + '-400 bg-' + c + '-50 text-' + c + '-600');

    // 渲染版本內容
    var $display = $('#role-version-display');
    var html = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-in">';

    // 左側：Prompt 結構
    html += '<div class="bg-gray-900 rounded-xl p-4 text-sm">';
    html += '<div class="text-xs text-gray-400 mb-2 font-medium">Prompt 結構</div>';

    var roleNames = { system: { label: 'System', color: 'blue' }, user: { label: 'User', color: 'green' }, assistant: { label: 'Assistant', color: 'purple' } };
    Object.entries(data.prompt).forEach(function([role, content]) {
        if (content) {
            var rc = roleNames[role];
            html += '<div class="mb-3">';
            html += '<div class="text-xs font-bold text-' + rc.color + '-400 mb-1"><i class="fas fa-tag mr-1"></i>' + rc.label + '</div>';
            html += '<div class="bg-gray-800 rounded-lg p-2 text-xs text-gray-300 font-mono">' + escapeHtml(content) + '</div>';
            html += '</div>';
        } else {
            html += '<div class="text-xs text-gray-600 mb-2">— ' + roleNames[role].label + '（未使用）</div>';
        }
    });
    html += '</div>';

    // 右側：指標 + 輸出
    html += '<div class="space-y-3">';
    html += '<div class="bg-white border rounded-xl p-4">';
    html += '<div class="text-xs font-bold text-gray-600 mb-3">效果指標</div>';
    var metricLabels = { stability: '格式穩定性', format: '格式正確率', parseable: '可解析性', on_task: '任務聚焦度' };
    Object.entries(data.metrics).forEach(function([key, val]) {
        var barColor = val >= 90 ? 'bg-green-400' : val >= 75 ? 'bg-blue-400' : val >= 60 ? 'bg-yellow-400' : 'bg-red-400';
        html += '<div class="mb-2">';
        html += '<div class="flex justify-between text-xs mb-1"><span class="text-gray-500">' + metricLabels[key] + '</span><span class="font-bold">' + val + '%</span></div>';
        html += '<div class="w-full bg-gray-100 rounded-full h-1.5"><div class="' + barColor + ' h-1.5 rounded-full transition-all" style="width:' + val + '%"></div></div>';
        html += '</div>';
    });
    html += '</div>';

    html += '<div class="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs font-mono text-gray-700">';
    html += '<div class="text-xs text-blue-500 mb-1 font-sans font-bold">模擬輸出：</div>';
    html += escapeHtml(data.output);
    html += '</div>';

    if (data.issues && data.issues.length) {
        html += '<div class="bg-amber-50 rounded-xl p-3">';
        data.issues.forEach(function(issue) {
            html += '<div class="text-xs text-amber-700 flex items-start gap-1 mb-1"><i class="fas fa-triangle-exclamation mt-0.5 text-xs"></i>' + issue + '</div>';
        });
        html += '</div>';
    } else {
        html += '<div class="bg-green-50 rounded-xl p-3 text-xs text-green-700"><i class="fas fa-check-circle mr-1"></i>三層分離結構：穩定、可解析、易維護！這是推薦做法 ✨</div>';
    }
    html += '</div></div>';

    $display.html(html);
}

// ============================================================
// A-1.5: 拖拉分類練習
// ============================================================
var selectedFragment = null;

function renderFragments() {
    var $pool = $('#fragments-pool');
    $pool.empty();

    FRAGMENTS_DATA.forEach(function(frag) {
        var html = '<div class="draggable fragment-item bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 cursor-pointer hover:border-blue-300 max-w-xs" data-id="' + frag.id + '" onclick="selectFragment(this)">';
        html += '<span>' + escapeHtml(frag.text.length > 60 ? frag.text.substring(0, 60) + '...' : frag.text) + '</span>';
        html += '</div>';
        $pool.append(html);
    });

    // 初始化放置區點擊事件
    $('.drop-zone').on('click', function() {
        if (selectedFragment) {
            var role = $(this).data('role');
            var fragId = $(selectedFragment).data('id');
            placeFragment(selectedFragment, this, role);
            selectedFragment = null;
        }
    });
}

function selectFragment(el) {
    if (selectedFragment) {
        $(selectedFragment).removeClass('selected ring-2 ring-blue-400 bg-blue-50');
    }
    if (selectedFragment === el) {
        selectedFragment = null;
        return;
    }
    selectedFragment = el;
    $(el).addClass('selected ring-2 ring-blue-400 bg-blue-50');
    showToast('👆', '已選取片段，點擊目標角色欄位放置');
}

function placeFragment(fragEl, zoneEl, role) {
    var colorMap = { system: 'blue', user: 'green', assistant: 'purple' };
    var c = colorMap[role] || 'gray';
    var $frag = $(fragEl).clone().removeClass('selected ring-2 ring-blue-400 bg-blue-50');
    $frag.addClass('border-' + c + '-300 bg-' + c + '-50 text-' + c + '-700');
    $frag.data('role-placed', role);
    $frag.attr('data-role-placed', role);
    $frag.off('click').on('click', function() {
        // 點擊已放置的片段，移回池子
        $(this).remove();
        var origFrag = FRAGMENTS_DATA.find(f => f.id === $(this).data('id'));
        if (origFrag) renderSingleFragment(origFrag);
    });

    // 移除 drop-target 提示
    $(zoneEl).find('.drop-target').remove();
    $(zoneEl).append($frag);

    // 移除原始片段
    $(fragEl).remove();
}

function renderSingleFragment(frag) {
    var $pool = $('#fragments-pool');
    var html = '<div class="draggable fragment-item bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 cursor-pointer hover:border-blue-300 max-w-xs" data-id="' + frag.id + '" onclick="selectFragment(this)">';
    html += '<span>' + escapeHtml(frag.text.length > 60 ? frag.text.substring(0, 60) + '...' : frag.text) + '</span>';
    html += '</div>';
    $pool.append(html);
}

function checkRoleAnswers() {
    var userAnswers = {};
    $('.drop-zone').each(function() {
        var role = $(this).data('role');
        $(this).find('.fragment-item[data-role-placed]').each(function() {
            var fragId = $(this).data('id');
            userAnswers[fragId] = role;
        });
    });

    if (Object.keys(userAnswers).length < 3) {
        showToast('⚠️', '請至少分類 3 個片段再提交');
        return;
    }

    $.ajax({
        url: '/api/role-exercise/submit', method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ answers: userAnswers }),
        success: function(data) {
            var $feedback = $('#role-feedback');
            var bgClass = data.score >= 80 ? 'bg-green-50 border-green-200' : data.score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
            var html = '<div class="' + bgClass + ' border rounded-xl p-4">';
            html += '<div class="font-bold mb-2">得分：<span class="' + getScoreColor(data.score) + '">' + data.score + '</span> / 100 分（答對 ' + data.correct + '/' + data.total + '）</div>';
            data.feedback.forEach(function(f) {
                var item = FRAGMENTS_DATA.find(fr => fr.id === f.id);
                if (item) {
                    html += '<div class="text-xs mb-2 p-2 rounded-lg ' + (f.is_correct ? 'bg-green-50' : 'bg-red-50') + '">';
                    html += (f.is_correct ? '✅' : '❌') + ' <span class="font-mono">' + escapeHtml(item.text.substring(0, 40) + '...') + '</span><br>';
                    if (!f.is_correct) html += '<span class="text-red-600">正確答案：' + f.correct_role.toUpperCase() + '</span><br>';
                    html += '<span class="text-gray-500">💡 ' + f.explanation + '</span>';
                    html += '</div>';
                }
            });
            html += '</div>';
            $feedback.html(html).removeClass('hidden').addClass('fade-in');
            showToast(data.score >= 80 ? '🎉' : '📝', '得分：' + data.score + ' 分');
        }
    });
}

function resetRoleExercise() {
    // 清空放置區
    $('.drop-zone').each(function() {
        var role = $(this).data('role');
        var $zone = $(this);
        $zone.find('.fragment-item').remove();
        if (!$zone.find('.drop-target').length) {
            $zone.append('<div class="drop-target text-xs text-' + { system: 'blue', user: 'green', assistant: 'purple' }[role] + '-300 text-center py-2">拖拉至此</div>');
        }
    });
    // 重新渲染片段
    renderFragments();
    $('#role-feedback').addClass('hidden');
    selectedFragment = null;
}

// ============================================================
// 角色誤區渲染
// ============================================================
function renderRoleMistakes() {
    var $grid = $('#role-mistakes-grid');
    ROLE_MISTAKES.forEach(function(m) {
        var html = '<div class="mistake-card bg-white rounded-xl p-3 text-sm">';
        html += '<div class="font-bold text-amber-800 mb-1">' + m.icon + ' ' + m.title + '</div>';
        html += '<p class="text-xs text-amber-700">' + m.desc + '</p>';
        html += '</div>';
        $grid.append(html);
    });
}

// ============================================================
// A-1.5: 角色測驗
// ============================================================
function renderRoleQuiz() {
    renderQuiz(ROLE_QUIZZES_DATA, 'role-quiz-container', 'role-quiz-submit', 'blue');
}

function submitRoleQuiz() {
    var answers = collectAnswers(ROLE_QUIZZES_DATA, 'role-quiz-container');
    $.ajax({
        url: '/api/quiz/submit', method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ unit: 'A_role', answers: answers }),
        success: function(data) {
            showQuizResult(data, 'role-quiz-result', 'blue');
            $('#role-quiz-result').removeClass('hidden');
            showToast(getScoreEmoji(data.score), '測驗得分：' + data.score + ' 分');
        }
    });
}

// ============================================================
// A-2: Prompt 改寫遊戲
// ============================================================
var HINT_TAGS = [
    { text: '你是工廠設備工程師', type: 'goal' },
    { text: '請輸出 JSON 格式', type: 'format' },
    { text: '若資料不足請回覆「資料不足」', type: 'constraints' },
    { text: '嚴重程度分高/中/低', type: 'format' },
    { text: '可能原因最多 3 項', type: 'constraints' },
    { text: '機台ID: WE-27', type: 'context' },
    { text: '異常訊息: 收線張力波動 ±15%', type: 'context' },
    { text: '使用繁體中文', type: 'constraints' },
    { text: '摘要控制在 50 字內', type: 'evaluation' },
    { text: '格式符合則得分', type: 'evaluation' }
];

var tagColorMap = { goal: 'blue', context: 'purple', constraints: 'red', format: 'green', evaluation: 'orange' };

function renderHintTags() {
    var $tags = $('#hint-tags');
    HINT_TAGS.forEach(function(tag) {
        var c = tagColorMap[tag.type] || 'gray';
        var html = '<span class="hint-tag cursor-pointer px-2 py-1 rounded-lg text-xs border border-' + c + '-300 bg-' + c + '-50 text-' + c + '-700 hover:bg-' + c + '-100 transition" data-text="' + escapeHtml(tag.text) + '" data-type="' + tag.type + '" onclick="addHintToPrompt(this)">';
        html += tag.text;
        html += '</span>';
        $tags.append(html);
    });
}

function addHintToPrompt(el) {
    var text = $(el).data('text');
    var type = $(el).data('type');
    var $ta = $('#improved-prompt');
    var current = $ta.val();
    $ta.val(current + (current ? '\n' : '') + text);
    analyzePrompt($ta.val());
    // 標記已使用
    $(el).addClass('opacity-50').off('click');
}

function analyzePrompt(text) {
    var lower = text.toLowerCase();

    // 判斷五要素
    var hasGoal = /工程師|助理|你是|角色|分析/.test(text);
    var hasContext = /機台|異常|訊息|id|wen|資料/.test(lower);
    var hasConstraints = /不可|不得|限制|最多|若|如果|資料不足/.test(text);
    var hasFormat = /json|格式|輸出|{}|\{/.test(lower);
    var hasEval = /評估|準確|50字|標準|得分|格式符合/.test(text);

    // 更新 flag badges
    updateFlag('flag-goal', hasGoal, '目標 ✓', '目標');
    updateFlag('flag-context', hasContext, '資料 ✓', '資料');
    updateFlag('flag-constraints', hasConstraints, '規則 ✓', '規則');
    updateFlag('flag-format', hasFormat, '格式 ✓', '格式');
    updateFlag('flag-eval', hasEval, '評估 ✓', '評估');

    // 計算得分
    var score = [hasGoal, hasContext, hasConstraints, hasFormat, hasEval].filter(Boolean).length * 20;
    updateScoreDisplay(score);
}

function updateFlag(id, active, activeText, inactiveText) {
    var $flag = $('#' + id);
    if (active) {
        $flag.text(activeText).removeClass('text-gray-400 border-blue-200').addClass('bg-green-100 text-green-700 border-green-300');
    } else {
        $flag.text(inactiveText).removeClass('bg-green-100 text-green-700 border-green-300').addClass('text-gray-400 border-blue-200');
    }
}

function updateScoreDisplay(score) {
    var $bar = $('#prompt-score-bar');
    var $display = $('#prompt-score-display');
    var $hint = $('#prompt-score-hint');

    $display.text(score + ' / 100').removeClass('text-gray-300 text-red-400 text-yellow-500 text-green-600');

    var msgs = {
        0: '開始輸入 Prompt，系統即時分析五要素',
        20: '💡 有點開始了！試著補充更多要素...',
        40: '📝 還不錯！缺少的要素會讓模型猜你的意圖',
        60: '👍 已經有樣子了！再補充格式或評估標準',
        80: '✨ 很棒！再加一個要素就完美了',
        100: '🎉 五要素全滿！這個 Prompt 結構完整可部署'
    };

    var colors = { 0: 'bg-gray-300', 20: 'bg-red-400', 40: 'bg-yellow-400', 60: 'bg-blue-400', 80: 'bg-blue-500', 100: 'bg-green-500' };
    var textColors = { 0: 'text-gray-300', 20: 'text-red-400', 40: 'text-yellow-500', 60: 'text-blue-600', 80: 'text-blue-600', 100: 'text-green-600' };

    $bar.css('width', score + '%').removeClass().addClass('h-2 rounded-full transition-all duration-500 ' + (colors[score] || 'bg-blue-400'));
    $display.addClass(textColors[score] || 'text-blue-600');
    $hint.text(msgs[score] || '');
}

function submitPromptExercise() {
    var text = $('#improved-prompt').val().trim();
    if (!text) { showToast('⚠️', '請先輸入你的改寫 Prompt'); return; }

    var lower = text.toLowerCase();
    var flags = {
        has_goal: /工程師|助理|你是|角色|分析/.test(text),
        has_context: /機台|異常|訊息|id|資料/.test(lower),
        has_constraints: /不可|不得|限制|最多|若|如果|資料不足/.test(text),
        has_format: /json|格式|輸出|{}|\{/.test(lower),
        has_evaluation: /評估|準確|50字|標準|得分/.test(text)
    };
    flags.improved_prompt = text;
    flags.original_prompt = '幫我分析這些異常';
    flags.exercise_id = 'EX01';

    $.ajax({
        url: '/api/prompt-exercise/submit', method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(flags),
        success: function(data) {
            var $feedback = $('#a2-feedback');
            var bgClass = getScoreBg(data.score);
            var html = '<div class="flex items-center gap-3 mb-3">';
            html += '<div class="text-3xl font-black ' + getScoreColor(data.score) + '">' + data.score + '</div>';
            html += '<div class="text-sm text-gray-600">' + data.feedback + '</div></div>';

            // 顯示各要素狀態
            var elementNames = { has_goal: '目標', has_context: '資料', has_constraints: '規則', has_format: '格式', has_evaluation: '評估' };
            html += '<div class="flex flex-wrap gap-2 mt-2">';
            Object.entries(data.flags).forEach(function([key, val]) {
                if (elementNames[key]) {
                    html += '<span class="text-xs px-2 py-1 rounded-full ' + (val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">';
                    html += (val ? '✅' : '⭕') + ' ' + elementNames[key];
                    html += '</span>';
                }
            });
            html += '</div>';

            $feedback.find('#a2-feedback-content').html(html);
            $feedback.removeClass('hidden').addClass('fade-in');
            $feedback.css({ 'background': data.score >= 80 ? '#f0fdf4' : '#fffbeb', 'border-color': data.score >= 80 ? '#bbf7d0' : '#fde68a' });
            showToast(getScoreEmoji(data.score), '得分：' + data.score + ' 分');
        }
    });
}

function loadExample() {
    var example = `你是工廠設備工程師，請分析以下機台異常訊息，判斷嚴重程度與可能原因。

機台ID: WE-27；班別: 早班；異常訊息: 收線張力波動超過 ±15%，已連續發生 3 次

規則：若資料不足請回覆「資料不足，無法判斷」，不可捏造；可能原因最多 3 項；使用繁體中文

輸出格式（JSON）：
{"summary": "50字內摘要", "severity": "高/中/低", "possible_causes": [], "action": "建議行動"}

評估：格式正確、摘要精準、原因具體可操作`;
    $('#improved-prompt').val(example);
    analyzePrompt(example);
}

// ============================================================
// A-3: 同題對比實驗
// ============================================================
function renderVersionTabs() {
    var $tabs = $('#version-tabs');
    var versions = PROMPT_VERSIONS_DATA.versions || [];
    var colors = ['red', 'yellow', 'blue', 'green'];

    versions.forEach(function(v, idx) {
        var c = colors[idx];
        var html = '<button onclick="showVersion(' + idx + ')" id="vtab-' + idx + '" class="version-btn px-4 py-2 rounded-xl text-sm font-medium border-2 border-' + c + '-300 bg-' + c + '-50 text-' + c + '-700 hover:bg-' + c + '-100 transition">' + v.label + '</button>';
        $tabs.append(html);
    });

    // 預設顯示 v0
    if (versions.length) showVersion(0);

    // 繪製比較圖表
    renderVersionChart(versions);
}

function showVersion(idx) {
    var versions = PROMPT_VERSIONS_DATA.versions || [];
    if (!versions[idx]) return;
    var v = versions[idx];

    // 更新按鈕狀態
    $('.version-btn').css('opacity', '0.6');
    $('#vtab-' + idx).css('opacity', '1').css('transform', 'scale(1.02)');

    // 顯示 Prompt
    $('#version-prompt-display').text(v.prompt);

    // 顯示問題標籤
    var $issues = $('#version-issues');
    $issues.empty();
    if (v.issues && v.issues.length) {
        v.issues.forEach(function(issue) {
            $issues.append('<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">' + issue + '</span>');
        });
    } else {
        $issues.append('<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">✅ 無問題！這是最佳版本</span>');
    }

    // 顯示輸出
    $('#version-output-display').text(v.output);

    // 顯示評分
    var sc = v.score;
    var scoreColor = sc >= 85 ? 'green' : sc >= 60 ? 'blue' : sc >= 40 ? 'yellow' : 'red';
    $('#version-score').html('<div class="text-2xl font-black text-' + scoreColor + '-500">' + sc + '</div><div class="text-xs text-gray-400">/ 100 設計分</div>');
}

function renderVersionChart(versions) {
    var ctx = document.getElementById('version-chart');
    if (!ctx) return;
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: versions.map(v => v.version),
            datasets: [{
                label: '設計完整度評分',
                data: versions.map(v => v.score),
                backgroundColor: ['#FCA5A5', '#FDE68A', '#93C5FD', '#6EE7B7'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 100, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ============================================================
// A-4: 常見誤區
// ============================================================
function renderMistakesA() {
    var $grid = $('#mistakes-grid-a');
    A_MISTAKES.forEach(function(m) {
        var html = '<div class="mistake-card bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">';
        html += '<div class="text-2xl mb-2">' + m.icon + '</div>';
        html += '<h3 class="font-bold text-amber-800 text-sm mb-2">' + m.title + '</h3>';
        html += '<p class="text-xs text-gray-600">' + m.desc + '</p>';
        html += '</div>';
        $grid.append(html);
    });
}

// ============================================================
// A-5: 小測驗
// ============================================================
function renderQuizA() {
    renderQuiz(A_QUIZZES_DATA, 'quiz-container-a', 'quiz-submit-a', 'blue');
}

function submitQuiz(unit) {
    var questions = unit === 'A' ? A_QUIZZES_DATA : ROLE_QUIZZES_DATA;
    var containerId = unit === 'A' ? 'quiz-container-a' : 'role-quiz-container';
    var resultId   = unit === 'A' ? 'quiz-result-a'   : 'role-quiz-result';
    var submitBtn  = unit === 'A' ? 'quiz-submit-a'   : 'role-quiz-submit';

    showToast('⏳', '評分中...');
    $('#' + submitBtn).prop('disabled', true).text('評分中...');

    var answers = collectAnswers(questions, containerId);

    $.ajax({
        url: '/api/quiz/submit', method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ unit: unit, answers: answers }),
        success: function(resp) {
            showQuizResult(resp, resultId, 'blue');
            $('#' + resultId).removeClass('hidden');
            showToast(getScoreEmoji(resp.score), '測驗得分：' + resp.score + ' 分');
            $('#' + submitBtn).prop('disabled', false).html('<i class="fas fa-redo mr-1"></i>重新作答');
        },
        error: function(xhr) {
            showToast('❌', '提交失敗，請重試（' + xhr.status + '）');
            $('#' + submitBtn).prop('disabled', false).html('<i class="fas fa-paper-plane mr-1"></i>提交測驗');
        }
    });
}

// ============================================================
// 初始化
// ============================================================
$(document).ready(function() {
    renderElements();
    renderRoleCards();
    renderFragments();
    renderRoleMistakes();
    renderRoleQuiz();
    renderHintTags();
    renderVersionTabs();
    renderMistakesA();
    renderQuizA();

    // 預設顯示第一個版本比較
    showRoleVersion('A');

    // 精度 radio 觸發
    $('input[name="precision"]').on('change', function() { updateMemCalc && updateMemCalc(); });
});
