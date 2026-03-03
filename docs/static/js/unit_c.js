/**
 * unit_c.js - 單元 C 互動邏輯
 * 硬體與部署選型
 */

// ============================================================
// 部署方案資料
// ============================================================
var DEPLOYMENT_OPTIONS = [
    {
        id: 'cloud', icon: '☁️', title: '純雲端 API', color: 'blue',
        summary: '使用 OpenAI / Azure / Google 等廠商的 API 服務',
        pros: ['零硬體投資，按量付費（OpEx）', '快速啟動，適合 PoC 驗證', '自動擴容，不需擔心尖峰流量', '廠商維護模型更新，無維運負擔'],
        cons: ['資料傳送至外部（隱私風險）', '長期大量使用費用高', '依賴網路穩定性和廠商服務', '客製化能力有限'],
        scenarios: ['新專案 PoC 驗證階段', '查詢量少且不規律', '團隊缺乏 MLOps 能力', '非敏感資料任務'],
        risks: ['API 費用超出預算', '廠商服務中斷或調漲', '資料合規風險'],
        maturity: '初級團隊即可使用，最低技術門檻'
    },
    {
        id: 'hybrid', icon: '🔀', title: '混合式', color: 'purple',
        summary: '敏感資料走地端，非敏感或尖峰流量走雲端',
        pros: ['靈活分流，平衡成本與安全', '地端處理敏感資料，雲端處理一般任務', '比純地端初期成本低', '可根據負載動態切換'],
        cons: ['架構複雜，需要兩套系統', '資料分類邏輯需仔細設計', '維運難度較高', '介面規格必須保持一致'],
        scenarios: ['有部分敏感資料、部分非敏感任務', '已有部分 GPU 資源但不足以全量', '需要高可用性且有備援需求'],
        risks: ['資料分流邏輯出錯導致敏感資料外洩', '兩套系統維護成本高', '延遲可能不一致'],
        maturity: '需要有能力的 DevOps/MLOps 團隊'
    },
    {
        id: 'onprem', icon: '🏭', title: '純地端', color: 'green',
        summary: '自購 GPU 伺服器，模型完全在內部網路運行',
        pros: ['最高資料安全性，資料不離開內網', '長期成本低（硬體攤提後）', '完全客製化能力', '不依賴外部服務和網路'],
        cons: ['前期硬體 CapEx 投資高（GPU 伺服器貴）', '需要 MLOps 維運能力', '部署週期長', '硬體升級需再投資'],
        scenarios: ['資料高度敏感（含機密製程）', '需要內網整合（MES、ERP）', '長期大量使用（ROI 划算）', '有 IT 維運團隊'],
        risks: ['初期投資高且無法快速回頭', '硬體過時後效能跟不上', '需要維運人力的長期成本'],
        maturity: '需要 IT 基礎設施和 MLOps 能力'
    }
];

// C-5 常見誤區
var C_MISTAKES = [
    {
        icon: '🖥️', title: '誤區1：以為模型能跑就等於能上線',
        desc: '模型能推論 ≠ 能生產上線。還要考慮：延遲是否符合 SLA、併發請求時的效能、監控告警、容錯機制、更新流程。能跑只是第一步！'
    },
    {
        icon: '🔒', title: '誤區2：忽略資料敏感度與內網需求',
        desc: '「反正我們的資料沒那麼重要」——直到機密製程被競爭對手知道才後悔。資料分級是第一步，敏感資料不能透過公開 API 傳輸。'
    },
    {
        icon: '💰', title: '誤區3：只算模型費用，不算維運人力成本',
        desc: '地端部署的真實成本 = GPU 電費 + 維運工程師薪資 + 硬體維修 + 軟體更新。很多企業算完後發現地端並不比雲端便宜多少。'
    },
    {
        icon: '⚡', title: '誤區4：只看 GPU 規格，不看實際延遲與併發',
        desc: '「A100 這麼強，一定夠快」——但如果同時有 50 個請求怎麼辦？單 GPU 的吞吐量和批次處理能力與你的 SLA 需求要對得上，規格只是起點。'
    },
    {
        icon: '🧪', title: '誤區5：沒有 PoC 驗證就直接買設備',
        desc: '先花 100 萬買 GPU 伺服器，再發現模型的繁中準確率不夠、延遲超標——這個代價太貴了。先雲端 PoC 驗證，再決定是否投資地端。'
    }
];

// GPU 規格資料
var GPU_SPECS = [
    { name: 'RTX 3060', vram: '12GB', suitable: '3B-7B (INT4量化)', price: '~NT$15,000' },
    { name: 'RTX 3090', vram: '24GB', suitable: '7B (FP16) / 13B (INT4)', price: '~NT$35,000' },
    { name: 'RTX 4090', vram: '24GB', suitable: '7B (FP16) / 13B (INT4)', price: '~NT$55,000' },
    { name: 'A40 / A100 40G', vram: '40GB', suitable: '13B (FP16) / 32B (INT4)', price: '~NT$150,000+' },
    { name: 'A100 80G', vram: '80GB', suitable: '32B (FP16) / 70B (INT4)', price: '~NT$300,000+' },
    { name: 'H100 80G', vram: '80GB', suitable: '70B (FP16) 佳', price: '~NT$500,000+' }
];

// ============================================================
// 分頁切換
// ============================================================
function showTabC(tabId) {
    $('.tab-c-content').addClass('hidden');
    $('.tab-btn-c').removeClass('bg-emerald-500 text-white shadow').addClass('text-gray-500');

    $('#tab-' + tabId).removeClass('hidden').addClass('fade-in');
    $('#tab-btn-' + tabId).addClass('bg-emerald-500 text-white shadow').removeClass('text-gray-500');

    var url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);

    // 特定分頁的初始化
    if (tabId === 'c3') updateMemCalc();
    if (tabId === 'c4') calcCost();
}

// ============================================================
// C-1: 部署方案卡片
// ============================================================
function renderDeploymentCards() {
    var $cards = $('#deployment-cards');
    DEPLOYMENT_OPTIONS.forEach(function(opt) {
        var colorMap = { blue: 'blue', purple: 'purple', green: 'emerald' };
        var c = colorMap[opt.color] || 'blue';

        var html = '<div class="bg-white border-2 border-' + c + '-100 rounded-2xl overflow-hidden card-hover">';
        html += '<div class="bg-gradient-to-r from-' + c + '-500 to-' + c + '-600 text-white p-4">';
        html += '<div class="text-3xl mb-1">' + opt.icon + '</div>';
        html += '<h3 class="font-bold text-lg">' + opt.title + '</h3>';
        html += '<p class="text-' + c + '-100 text-xs">' + opt.summary + '</p>';
        html += '</div>';

        html += '<div class="p-4 space-y-3 text-xs">';

        // 優點
        html += '<div><div class="font-bold text-green-700 mb-1">✅ 優點</div>';
        opt.pros.forEach(function(p) {
            html += '<div class="text-gray-600 flex items-start gap-1 mb-0.5"><i class="fas fa-plus text-green-400 text-xs mt-0.5"></i>' + p + '</div>';
        });
        html += '</div>';

        // 缺點
        html += '<div><div class="font-bold text-red-600 mb-1">❌ 缺點</div>';
        opt.cons.forEach(function(c_) {
            html += '<div class="text-gray-600 flex items-start gap-1 mb-0.5"><i class="fas fa-minus text-red-400 text-xs mt-0.5"></i>' + c_ + '</div>';
        });
        html += '</div>';

        // 適用情境
        html += '<div class="bg-' + c + '-50 rounded-xl p-3"><div class="font-bold text-' + c + '-700 mb-1">🎯 適用情境</div>';
        opt.scenarios.forEach(function(s) {
            html += '<div class="text-' + c + '-600 flex items-start gap-1 mb-0.5"><i class="fas fa-circle-dot text-xs mt-0.5"></i>' + s + '</div>';
        });
        html += '</div>';

        // 成熟度需求
        html += '<div class="bg-gray-50 rounded-xl p-3 text-gray-500"><i class="fas fa-users-gear mr-1"></i>' + opt.maturity + '</div>';

        html += '</div></div>';
        $cards.append(html);
    });
}

// ============================================================
// C-2: 決策模擬器
// ============================================================
function runSimulation() {
    var sensitivity = $('input[name="sensitivity"]:checked').val() || '中';
    var latency = $('input[name="latency"]:checked').val() || '分鐘級';
    var dailyQueries = parseInt($('#daily-queries').val()) || 300;
    var budget = $('input[name="budget"]:checked').val() || '中';
    var ops = $('input[name="ops"]:checked').val() || '中';
    var needsIntranet = $('#needs-intranet').is(':checked');

    $.ajax({
        url: '/api/deployment/simulate', method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            sensitivity: sensitivity,
            latency: latency,
            daily_queries: dailyQueries,
            budget: budget,
            ops_capability: ops,
            needs_intranet: needsIntranet
        }),
        success: function(data) {
            renderSimResult(data);
            showToast('🎯', '建議方案：' + data.solution);
        }
    });
}

function renderSimResult(data) {
    var $result = $('#simulation-result');

    var solutionConfig = {
        '雲端': { icon: '☁️', color: 'blue', bgFrom: 'from-blue-50', border: 'border-blue-200' },
        '混合': { icon: '🔀', color: 'purple', bgFrom: 'from-purple-50', border: 'border-purple-200' },
        '地端': { icon: '🏭', color: 'green', bgFrom: 'from-green-50', border: 'border-green-200' }
    };
    var cfg = solutionConfig[data.solution] || solutionConfig['雲端'];

    var html = '<div class="bg-gradient-to-b ' + cfg.bgFrom + ' to-white border-2 ' + cfg.border + ' rounded-2xl p-5 fade-in h-full">';

    // 主推薦
    html += '<div class="text-center mb-5">';
    html += '<div class="text-4xl mb-2">' + cfg.icon + '</div>';
    html += '<h3 class="text-xl font-black text-gray-900">建議：' + data.solution + '部署</h3>';
    html += '</div>';

    // 理由
    html += '<div class="mb-4"><div class="text-xs font-bold text-' + cfg.color + '-700 mb-2"><i class="fas fa-check-circle mr-1"></i>推薦理由</div>';
    data.reasons.forEach(function(r) {
        html += '<div class="text-xs text-gray-700 flex items-start gap-2 mb-1"><i class="fas fa-arrow-right text-' + cfg.color + '-400 mt-0.5 text-xs"></i>' + r + '</div>';
    });
    html += '</div>';

    // 風險
    html += '<div class="mb-4 bg-amber-50 rounded-xl p-3"><div class="text-xs font-bold text-amber-700 mb-2"><i class="fas fa-triangle-exclamation mr-1"></i>風險提醒</div>';
    data.risks.forEach(function(r) {
        html += '<div class="text-xs text-amber-700 flex items-start gap-2 mb-1"><i class="fas fa-exclamation text-amber-400 mt-0.5 text-xs"></i>' + r + '</div>';
    });
    html += '</div>';

    // 成本估算
    if (data.cost_estimate) {
        html += '<div class="mb-4 bg-gray-50 rounded-xl p-3"><div class="text-xs font-bold text-gray-700 mb-1"><i class="fas fa-calculator mr-1"></i>成本估算</div>';
        html += '<div class="text-xs font-mono text-gray-700">' + data.cost_estimate.range + '</div>';
        html += '<div class="text-xs text-gray-500 mt-1">' + data.cost_estimate.note + '</div>';
        html += '<div class="text-xs text-blue-600 mt-1 font-medium">類型：' + data.cost_estimate.type + '</div>';
        html += '</div>';
    }

    // 下一步
    html += '<div><div class="text-xs font-bold text-gray-700 mb-2"><i class="fas fa-list-check mr-1"></i>下一步建議</div>';
    data.next_steps.forEach(function(s) {
        html += '<div class="text-xs text-gray-600 flex items-start gap-2 mb-1"><i class="fas fa-chevron-right text-gray-300 mt-0.5 text-xs"></i>' + s + '</div>';
    });
    html += '</div>';

    html += '</div>';
    $result.html(html);
}

// ============================================================
// C-3: 記憶體估算互動器
// ============================================================

// 根據參數量推算典型 Transformer 架構（Llama 系列近似值）
function getModelArch(paramsB) {
    if (paramsB <= 1)  return { layers: 12, dModel: 768,   label: '1B 級' };
    if (paramsB <= 3)  return { layers: 24, dModel: 2048,  label: '3B 級' };
    if (paramsB <= 7)  return { layers: 32, dModel: 4096,  label: '7B 級' };
    if (paramsB <= 13) return { layers: 40, dModel: 5120,  label: '13B 級' };
    if (paramsB <= 30) return { layers: 60, dModel: 6656,  label: '30B 級' };
    if (paramsB <= 70) return { layers: 80, dModel: 8192,  label: '70B 級' };
    return              { layers: 96, dModel: 12288, label: '100B+ 級' };
}

function updateMemCalc() {
    var params = parseInt($('#model-params').val()) || 7;
    var precision = parseInt($('input[name="precision"]:checked').val()) || 16;
    var contextLen = parseInt($('#context-length').val()) || 2048;
    var batchSize = parseInt($('#batch-size').val()) || 1;

    // 更新顯示標籤
    $('#params-display').text(params + 'B');
    $('#context-display').text(contextLen >= 1024 ? Math.round(contextLen / 1024) + 'K' : contextLen);
    $('#batch-display').text(batchSize);

    var bytesPerParam = precision / 8;  // 16bit=2bytes, 8bit=1byte, 4bit=0.5bytes
    var arch = getModelArch(params);

    // ① 模型權重：P × (bits/8)
    var modelWeightGB = params * 1e9 * bytesPerParam / 1e9;

    // ② KV Cache：2 × L × S × Batch × d_model × (bits/8)
    //   2 = Key + Value 兩份快取
    //   L = 層數（由架構查表）
    //   S = Context 長度（tokens）
    //   d_model = 隱藏層維度（由架構查表）
    var kvCacheBytes = 2 * arch.layers * contextLen * batchSize * arch.dModel * bytesPerParam;
    var kvCacheGB = kvCacheBytes / 1e9;

    // ③ 系統開銷：推論時僅需 activations 等，約 5%
    var overheadGB = modelWeightGB * 0.05;

    var totalGB = modelWeightGB + kvCacheGB + overheadGB;

    // 渲染結果
    var $result = $('#mem-result-display');

    // 選擇推薦 GPU
    var recommendedGPU = '';
    if (totalGB <= 8) recommendedGPU = 'RTX 3060 (12GB)';
    else if (totalGB <= 20) recommendedGPU = 'RTX 3090 (24GB)';
    else if (totalGB <= 38) recommendedGPU = 'A40 40GB';
    else if (totalGB <= 78) recommendedGPU = 'A100 80GB';
    else recommendedGPU = '需要多卡並聯（>80GB）';

    var isWarning = totalGB > 20;
    var isCritical = totalGB > 80;

    var html = '<div class="space-y-4">';

    // 主要結果卡
    html += '<div class="' + (isCritical ? 'bg-red-50 border-red-200' : isWarning ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200') + ' border-2 rounded-2xl p-5 text-center">';
    html += '<div class="text-xs text-gray-500 mb-1">預估所需 GPU VRAM</div>';
    html += '<div class="text-4xl font-black ' + (isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600') + '">' + totalGB.toFixed(1) + ' GB</div>';
    if (isCritical) {
        html += '<div class="mt-2 text-xs text-red-600"><i class="fas fa-triangle-exclamation mr-1"></i>超過單卡 80GB！需要多卡並聯</div>';
    } else if (isWarning) {
        html += '<div class="mt-2 text-xs text-yellow-600"><i class="fas fa-exclamation-circle mr-1"></i>需要較高階 GPU，注意成本</div>';
    } else {
        html += '<div class="mt-2 text-xs text-green-600"><i class="fas fa-check-circle mr-1"></i>中階 GPU 可處理</div>';
    }
    html += '</div>';

    // 分項明細
    html += '<div class="bg-white border border-gray-100 rounded-2xl p-4 space-y-2 text-sm">';
    html += '<div class="font-bold text-gray-700 text-xs mb-2">記憶體組成明細</div>';
    var items = [
        { label: '模型權重', value: modelWeightGB.toFixed(1) + ' GB', color: 'blue' },
        { label: 'KV Cache (context ' + (contextLen >= 1024 ? Math.round(contextLen / 1024) + 'K' : contextLen) + ')', value: kvCacheGB.toFixed(1) + ' GB', color: 'purple' },
        { label: '系統開銷', value: overheadGB.toFixed(1) + ' GB', color: 'gray' }
    ];
    items.forEach(function(item) {
        var pct = Math.min(Math.round(item.value.replace(' GB', '') / totalGB * 100), 100);
        html += '<div><div class="flex justify-between text-xs mb-1"><span class="text-gray-600">' + item.label + '</span><span class="font-bold text-' + item.color + '-600">' + item.value + '</span></div>';
        html += '<div class="w-full bg-gray-100 rounded-full h-1.5"><div class="bg-' + item.color + '-400 h-1.5 rounded-full" style="width:' + pct + '%"></div></div></div>';
    });
    html += '</div>';

    // 推薦 GPU
    html += '<div class="bg-gray-900 text-white rounded-2xl p-4">';
    html += '<div class="text-xs text-gray-400 mb-1">推薦 GPU</div>';
    html += '<div class="font-bold text-lg">' + recommendedGPU + '</div>';
    html += '<div class="text-xs text-gray-300 mt-1">';
    if (precision === 4) html += '✅ INT4 量化大幅降低記憶體需求';
    else if (precision === 8) html += '⚠️ INT8 量化：品質與效率的平衡';
    else html += '📊 FP16 全精度：品質最佳但需求最大';
    html += '</div></div>';

    html += '</div>';
    $result.html(html);

    // 渲染公式推導區
    renderVRAMFormula(params, precision, contextLen, batchSize, arch, modelWeightGB, kvCacheGB, overheadGB, totalGB);
}

// ============================================================
// C-3: VRAM 公式推導渲染（隨滑桿動態更新）
// ============================================================
function renderVRAMFormula(params, precision, contextLen, batchSize, arch, modelWeightGB, kvCacheGB, overheadGB, totalGB) {
    var bytesPerParam = precision / 8;
    var contextDisplay = contextLen >= 1024 ? Math.round(contextLen / 1024) + 'K' : contextLen;
    var precLabel = precision === 4 ? 'INT4（4-bit）' : precision === 8 ? 'INT8（8-bit）' : 'FP16（16-bit）';

    // 數字格式化
    var kvBytes = 2 * arch.layers * contextLen * batchSize * arch.dModel * bytesPerParam;
    function fmt(n) { return Math.round(n).toLocaleString(); }

    var html = '<div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">';

    // 標題列
    html += '<div class="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-5 py-3 flex items-center gap-3">';
    html += '<i class="fas fa-square-root-variable text-emerald-400"></i>';
    html += '<div>';
    html += '<div class="font-bold text-sm">VRAM 完整計算公式推導</div>';
    html += '<div class="text-xs text-slate-300">根據當前滑桿設定即時代入數值</div>';
    html += '</div>';
    html += '<div class="ml-auto text-right text-xs text-slate-300">模型：' + params + 'B（' + arch.label + '）｜精度：' + precLabel + '</div>';
    html += '</div>';

    html += '<div class="p-5 space-y-4">';

    // 總公式概覽
    html += '<div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-sm">';
    html += '<span class="text-slate-500 text-xs block mb-1">VRAM 總需求 =</span>';
    html += '<span class="font-mono font-bold text-slate-700">VRAM<sub>weight</sub></span>';
    html += '<span class="text-slate-400 mx-2">+</span>';
    html += '<span class="font-mono font-bold text-purple-700">VRAM<sub>KV&nbsp;Cache</sub></span>';
    html += '<span class="text-slate-400 mx-2">+</span>';
    html += '<span class="font-mono font-bold text-gray-600">VRAM<sub>sys</sub></span>';
    html += '<span class="text-slate-400 mx-2">=</span>';
    html += '<span class="font-mono font-black text-emerald-600 text-base">' + totalGB.toFixed(1) + ' GB</span>';
    html += '</div>';

    html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">';

    // ① 模型權重
    html += '<div class="rounded-xl border-2 border-blue-200 overflow-hidden">';
    html += '<div class="bg-blue-600 text-white px-3 py-2 text-xs font-bold flex items-center gap-2"><i class="fas fa-weight-hanging"></i>① 模型權重（Model Weights）</div>';
    html += '<div class="p-3 space-y-2 bg-blue-50 text-xs font-mono">';
    html += '<div class="text-gray-500 pb-1 border-b border-blue-100">公式：P × (bits ÷ 8)</div>';
    html += '<div class="text-blue-800">= ' + params + ' × 10⁹ 個參數</div>';
    html += '<div class="text-blue-800">　× (' + precision + ' bits ÷ 8) = <span class="font-bold">' + bytesPerParam + ' bytes/param</span></div>';
    html += '<div class="text-blue-800">= ' + fmt(params * bytesPerParam * 1e9) + ' bytes</div>';
    html += '<div class="mt-2 bg-blue-100 rounded-lg px-3 py-2 text-center font-black text-blue-700 text-sm">= ' + modelWeightGB.toFixed(1) + ' GB</div>';
    html += '<div class="text-gray-400 text-xs mt-1">✦ 精度越低，此項越小</div>';
    html += '</div></div>';

    // ② KV Cache
    html += '<div class="rounded-xl border-2 border-purple-200 overflow-hidden">';
    html += '<div class="bg-purple-600 text-white px-3 py-2 text-xs font-bold flex items-center gap-2"><i class="fas fa-database"></i>② KV Cache（常被低估！）</div>';
    html += '<div class="p-3 space-y-2 bg-purple-50 text-xs font-mono">';
    html += '<div class="text-gray-500 pb-1 border-b border-purple-100">公式：2 × L × S × B × d_model × (bits÷8)</div>';
    html += '<div class="text-purple-800 space-y-0.5">';
    html += '<div>　2　= Key + Value（固定）</div>';
    html += '<div>　L　= <span class="bg-purple-200 px-1 rounded">' + arch.layers + '</span> 層　<span class="text-gray-400">（' + params + 'B 架構）</span></div>';
    html += '<div>　S　= <span class="bg-purple-200 px-1 rounded">' + contextDisplay + '</span> tokens　<span class="text-gray-400">（Context）</span></div>';
    html += '<div>　B　= <span class="bg-purple-200 px-1 rounded">' + batchSize + '</span>　<span class="text-gray-400">（Batch Size）</span></div>';
    html += '<div>d_model = <span class="bg-purple-200 px-1 rounded">' + arch.dModel.toLocaleString() + '</span>　<span class="text-gray-400">（隱藏維度）</span></div>';
    html += '<div>　bits = ' + precision + ' → ' + bytesPerParam + ' bytes</div>';
    html += '</div>';
    html += '<div class="text-purple-700 mt-1">= 2 × ' + arch.layers + ' × ' + contextLen + ' × ' + batchSize + ' × ' + arch.dModel + ' × ' + bytesPerParam + '</div>';
    html += '<div class="text-purple-700">= ' + fmt(kvBytes) + ' bytes</div>';
    html += '<div class="mt-2 bg-purple-100 rounded-lg px-3 py-2 text-center font-black text-purple-700 text-sm">= ' + kvCacheGB.toFixed(2) + ' GB</div>';
    html += '<div class="text-gray-400 text-xs mt-1">✦ Context 長、Batch 大，此項快速增長</div>';
    html += '</div></div>';

    // ③ 系統開銷
    html += '<div class="rounded-xl border-2 border-gray-200 overflow-hidden">';
    html += '<div class="bg-gray-600 text-white px-3 py-2 text-xs font-bold flex items-center gap-2"><i class="fas fa-gears"></i>③ 系統開銷（Sys Overhead）</div>';
    html += '<div class="p-3 space-y-2 bg-gray-50 text-xs font-mono">';
    html += '<div class="text-gray-500 pb-1 border-b border-gray-200">公式：VRAM_weight × 5%</div>';
    html += '<div class="text-gray-700 space-y-0.5">';
    html += '<div>包含：Activations</div>';
    html += '<div>　　　Runtime 緩衝區</div>';
    html += '<div>　　　CUDA 核心快取</div>';
    html += '</div>';
    html += '<div class="text-gray-700 mt-1">= ' + modelWeightGB.toFixed(1) + ' GB × 5%</div>';
    html += '<div class="mt-2 bg-gray-100 rounded-lg px-3 py-2 text-center font-black text-gray-700 text-sm">= ' + overheadGB.toFixed(2) + ' GB</div>';
    html += '<div class="text-gray-400 text-xs mt-1">✦ 訓練時此項更大（含梯度 ×3）</div>';
    html += '</div></div>';

    html += '</div>'; // grid end

    // 合計列
    html += '<div class="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">';
    html += '<div class="flex items-center gap-3 flex-wrap">';
    html += '<div class="text-xs text-gray-500 font-mono">合計：</div>';
    html += '<div class="font-mono text-sm text-blue-600">' + modelWeightGB.toFixed(1) + ' GB</div>';
    html += '<div class="text-gray-400">+</div>';
    html += '<div class="font-mono text-sm text-purple-600">' + kvCacheGB.toFixed(2) + ' GB</div>';
    html += '<div class="text-gray-400">+</div>';
    html += '<div class="font-mono text-sm text-gray-600">' + overheadGB.toFixed(2) + ' GB</div>';
    html += '<div class="text-gray-400">=</div>';
    html += '<div class="font-mono font-black text-2xl text-emerald-700">' + totalGB.toFixed(1) + ' GB</div>';
    html += '<div class="ml-auto text-xs text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">';
    html += '推薦 GPU：' + (totalGB <= 8 ? 'RTX 3060 12G' : totalGB <= 20 ? 'RTX 3090 24G' : totalGB <= 38 ? 'A40 40G' : totalGB <= 78 ? 'A100 80G' : '多卡並聯 >80G') + '</div>';
    html += '</div>';
    // 公式說明提示
    html += '<div class="mt-3 text-xs text-gray-400 border-t border-emerald-200 pt-2">';
    html += '⚠️ 架構參數（層數 L=' + arch.layers + '、d_model=' + arch.dModel + '）為 ' + arch.label + ' 模型的典型近似值，實際依各模型設計略有不同。';
    html += '量化後 KV Cache 精度仍可選 FP16，不一定跟模型精度相同（視推理框架設定）。';
    html += '</div>';
    html += '</div>'; // 合計列 end

    html += '</div></div>'; // p-5 + outer div

    $('#vram-formula-display').html(html);
}

function renderGPUCards() {
    var $cards = $('#gpu-cards');
    GPU_SPECS.forEach(function(gpu) {
        var vram = parseInt(gpu.vram);
        var colorClass = vram >= 80 ? 'red' : vram >= 40 ? 'orange' : vram >= 24 ? 'blue' : 'green';

        var html = '<div class="bg-' + colorClass + '-50 border border-' + colorClass + '-200 rounded-xl p-3 text-center">';
        html += '<div class="font-bold text-sm text-' + colorClass + '-800">' + gpu.name + '</div>';
        html += '<div class="text-' + colorClass + '-600 font-black text-lg">' + gpu.vram + '</div>';
        html += '<div class="text-xs text-gray-600 mt-1">' + gpu.suitable + '</div>';
        html += '<div class="text-xs text-gray-400 mt-1">' + gpu.price + '</div>';
        html += '</div>';
        $cards.append(html);
    });
}

// ============================================================
// C-4: 成本試算
// ============================================================
function calcCost() {
    var users = parseInt($('#cost-users').val()) || 10;
    var requests = parseInt($('#cost-requests').val()) || 300;
    var tokens = parseInt($('#cost-tokens').val()) || 500;

    var monthlyRequests = requests * 30;
    var monthlyTokens = monthlyRequests * tokens;

    // 雲端成本估算（教學版，不含實際商業計價）
    // 假設 GPT-3.5 等級：約 0.002 USD/1K tokens，換算 NT$（1 USD ≈ 31 NT$）
    var cloudCostUSD = monthlyTokens / 1000 * 0.002;
    var cloudCostNTD = cloudCostUSD * 31;

    // 地端成本估算
    // GPU 伺服器：約 150,000 NT$，攤提 3 年
    // 電費：約 3,000 NT$/月，維運：約 5,000 NT$/月
    var capex = 150000;
    var onpremMonthly = Math.round(capex / 36) + 3000 + 5000;

    // 渲染結果
    var $result = $('#cost-result');
    var html = '<div class="space-y-3">';

    // 雲端方案
    var cloudStyle = cloudCostNTD < onpremMonthly ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';
    html += '<div class="' + cloudStyle + ' border rounded-2xl p-4">';
    html += '<div class="flex items-center gap-2 mb-2"><span class="text-lg">☁️</span><span class="font-bold text-sm">雲端 API 方案</span>' + (cloudCostNTD < onpremMonthly ? '<span class="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full ml-auto">💰 此條件較划算</span>' : '') + '</div>';
    html += '<div class="text-2xl font-black text-blue-600">NT$ ' + Math.round(cloudCostNTD).toLocaleString() + ' <span class="text-sm font-normal text-gray-500">/ 月</span></div>';
    html += '<div class="text-xs text-gray-500 mt-1">' + (monthlyRequests).toLocaleString() + ' 次/月 × ' + tokens + ' tokens × $0.002/1K tokens × 31</div>';
    html += '<div class="text-xs text-blue-600 mt-2">OpEx 模式：無前期投資，但費用隨量線性成長</div>';
    html += '</div>';

    // 地端方案
    var onpremStyle = onpremMonthly < cloudCostNTD ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';
    html += '<div class="' + onpremStyle + ' border rounded-2xl p-4">';
    html += '<div class="flex items-center gap-2 mb-2"><span class="text-lg">🏭</span><span class="font-bold text-sm">地端部署方案</span>' + (onpremMonthly < cloudCostNTD ? '<span class="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full ml-auto">💰 此條件較划算</span>' : '') + '</div>';
    html += '<div class="text-xs text-gray-500 mb-2">初期投資：NT$ ' + capex.toLocaleString() + '（3年攤提）</div>';
    html += '<div class="text-2xl font-black text-green-600">NT$ ' + onpremMonthly.toLocaleString() + ' <span class="text-sm font-normal text-gray-500">/ 月</span></div>';
    html += '<div class="text-xs text-gray-500 mt-1">攤提 ' + Math.round(capex / 36).toLocaleString() + ' + 電費 3,000 + 維運 5,000</div>';
    html += '<div class="text-xs text-green-600 mt-2">CapEx 模式：前期高，長期攤提後每次成本接近零</div>';
    html += '</div>';

    // 損益平衡分析
    var breakEvenMonths = cloudCostNTD > 0 ? Math.ceil(capex / (cloudCostNTD - 8000)) : Infinity;
    if (breakEvenMonths > 0 && breakEvenMonths < 120) {
        html += '<div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">';
        html += '<div class="font-bold text-blue-700 mb-1">📊 損益平衡分析</div>';
        html += '<div class="text-xs text-blue-600">在此查詢量下，約 <strong>' + breakEvenMonths + ' 個月</strong>後，地端方案的累計成本低於雲端</div>';
        if (breakEvenMonths > 36) {
            html += '<div class="text-xs text-gray-500 mt-1">⚠️ 損益平衡期 > 3 年，在此規模下雲端可能更划算</div>';
        } else if (breakEvenMonths < 12) {
            html += '<div class="text-xs text-green-600 mt-1">✅ 損益平衡期 < 1 年，查詢量大，地端 ROI 佳</div>';
        }
        html += '</div>';
    }

    // 每次成本比較
    var cloudPerRequest = requests > 0 ? (cloudCostNTD / monthlyRequests).toFixed(2) : 0;
    var onpremPerRequest = requests > 0 ? (onpremMonthly / monthlyRequests).toFixed(2) : 0;

    html += '<div class="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">';
    html += '<div class="font-bold text-gray-700 mb-1">每次查詢成本比較</div>';
    html += '<div class="flex gap-4">';
    html += '<div>☁️ 雲端：<strong>NT$ ' + cloudPerRequest + '</strong> / 次</div>';
    html += '<div>🏭 地端：<strong>NT$ ' + onpremPerRequest + '</strong> / 次</div>';
    html += '</div></div>';

    html += '</div>';
    $result.html(html);
}

// ============================================================
// C-5: 常見誤區
// ============================================================
function renderMistakesC() {
    var $grid = $('#mistakes-grid-c');
    C_MISTAKES.forEach(function(m) {
        var html = '<div class="mistake-card bg-white border border-amber-100 rounded-2xl p-5 shadow-sm">';
        html += '<div class="text-2xl mb-2">' + m.icon + '</div>';
        html += '<h3 class="font-bold text-amber-800 text-sm mb-2">' + m.title + '</h3>';
        html += '<p class="text-xs text-gray-600">' + m.desc + '</p>';
        html += '</div>';
        $grid.append(html);
    });
}

// ============================================================
// C-6: 小測驗
// ============================================================
function renderQuizC() {
    renderQuiz(C_QUIZZES_DATA, 'quiz-container-c', 'quiz-submit-c', 'emerald');
}

function submitQuizC() {
    showToast('⏳', '評分中...');
    $('#quiz-submit-c').prop('disabled', true).text('評分中...');
    var answers = collectAnswers(C_QUIZZES_DATA, 'quiz-container-c');
    $.ajax({
        url: '/api/quiz/submit', method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ unit: 'C', answers: answers }),
        success: function(data) {
            showQuizResult(data, 'quiz-result-c', 'emerald');
            $('#quiz-result-c').removeClass('hidden');
            showToast(getScoreEmoji(data.score), '測驗得分：' + data.score + ' 分');
            $('#quiz-submit-c').prop('disabled', false).html('<i class="fas fa-redo mr-1"></i>重新作答');
        },
        error: function(xhr) {
            showToast('❌', '提交失敗，請重試（' + xhr.status + '）');
            $('#quiz-submit-c').prop('disabled', false).html('<i class="fas fa-paper-plane mr-1"></i>提交測驗');
        }
    });
}

// ============================================================
// 初始化
// ============================================================
$(document).ready(function() {
    renderDeploymentCards();
    renderGPUCards();
    renderMistakesC();
    renderQuizC();

    // 初始化記憶體計算
    updateMemCalc();
    calcCost();

    // 監聽精度 radio 變更
    $('input[name="precision"]').on('change', updateMemCalc);
});
