/**
 * main.js - 共用 JavaScript
 * AI 教學平台 - 生成式 AI 實務決策流程
 */

// ============================================================
// Toast 通知
// ============================================================
function showToast(icon, message, duration = 3000) {
    var $toast = $('#toast');
    $('#toast-icon').text(icon);
    $('#toast-msg').text(message);
    $toast.removeClass('hidden').addClass('show');
    setTimeout(function() {
        $toast.addClass('hidden').removeClass('show');
    }, duration);
}

// ============================================================
// 分數顏色
// ============================================================
function getScoreColor(score) {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-500';
}

function getScoreBg(score) {
    if (score >= 85) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-blue-50 border-blue-200';
    if (score >= 55) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
}

function getScoreEmoji(score) {
    if (score >= 85) return '🏆';
    if (score >= 70) return '👍';
    if (score >= 55) return '📝';
    return '💡';
}

// ============================================================
// 通用測驗渲染器
// ============================================================
function renderQuiz(questions, containerId, submitBtnId, colorClass) {
    var $container = $('#' + containerId);
    $container.empty();

    questions.forEach(function(q, idx) {
        var html = '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 quiz-item" data-qid="' + q.id + '">';
        html += '<div class="flex items-start gap-3 mb-4">';
        html += '<div class="w-7 h-7 rounded-lg bg-' + colorClass + '-100 text-' + colorClass + '-600 flex items-center justify-center text-sm font-bold flex-shrink-0">' + (idx + 1) + '</div>';
        html += '<div>';
        html += '<div class="text-xs text-gray-400 mb-1">' + getTypeLabel(q.type) + '</div>';
        html += '<h4 class="font-medium text-gray-800 text-sm">' + q.question + '</h4>';
        html += '</div></div>';

        if (q.type === 'true_false') {
            html += '<div class="flex gap-3">';
            html += '<label class="flex-1 quiz-option rounded-xl px-4 py-2 cursor-pointer flex items-center gap-2 text-sm bg-gray-50"><input type="radio" name="q_' + q.id + '" value="true" class="accent-' + colorClass + '-500"> ✅ 正確</label>';
            html += '<label class="flex-1 quiz-option rounded-xl px-4 py-2 cursor-pointer flex items-center gap-2 text-sm bg-gray-50"><input type="radio" name="q_' + q.id + '" value="false" class="accent-' + colorClass + '-500"> ❌ 錯誤</label>';
            html += '</div>';
        } else if (q.type === 'single_choice' || q.type === 'scenario') {
            html += '<div class="space-y-2">';
            (q.options || []).forEach(function(opt) {
                var val = opt.charAt(0);
                html += '<label class="quiz-option flex items-start gap-3 rounded-xl px-4 py-3 bg-gray-50 cursor-pointer text-sm"><input type="radio" name="q_' + q.id + '" value="' + val + '" class="accent-' + colorClass + '-500 mt-0.5 flex-shrink-0"> <span>' + opt + '</span></label>';
            });
            html += '</div>';
        } else if (q.type === 'ordering') {
            html += '<div class="text-xs text-gray-400 mb-2">（拖拉排序 / 在下方點選重新排列）</div>';
            html += '<div class="ordering-container space-y-1" data-qid="' + q.id + '">';
            var shuffled = [...q.items].sort(() => Math.random() - 0.5);
            shuffled.forEach(function(item, i) {
                html += '<div class="ordering-item flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm cursor-pointer border border-gray-200 hover:border-' + colorClass + '-300" data-item="' + escapeHtml(item) + '">';
                html += '<span class="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-bold">' + (i + 1) + '</span>';
                html += '<span>' + escapeHtml(item) + '</span>';
                html += '<i class="fas fa-grip-vertical ml-auto text-gray-300"></i>';
                html += '</div>';
            });
            html += '</div>';
        } else if (q.type === 'matching') {
            html += '<div class="grid grid-cols-2 gap-3 text-sm">';
            html += '<div>';
            (q.pairs || []).forEach(function(pair) {
                html += '<div class="bg-purple-50 rounded-lg px-3 py-2 mb-2 text-purple-700 font-mono text-xs">' + escapeHtml(pair.item) + '</div>';
            });
            html += '</div><div>';
            var shuffledMatches = [...(q.pairs || [])].sort(() => Math.random() - 0.5);
            shuffledMatches.forEach(function(pair) {
                html += '<div class="bg-gray-50 rounded-lg px-3 py-2 mb-2 text-gray-600 text-xs">' + escapeHtml(pair.match) + '</div>';
            });
            html += '</div></div>';
            html += '<div class="mt-2 text-xs text-gray-400">（配對題：請記憶左右對應關係）</div>';
            html += '<input type="hidden" name="q_' + q.id + '" value="all_correct" class="matching-hidden">';
        }

        html += '</div>';
        $container.append(html);
    });

    // 當所有題目都有選擇時顯示提交按鈕
    $container.on('change', 'input[type="radio"], input[type="checkbox"]', function() {
        var allAnswered = true;
        questions.forEach(function(q) {
            if (q.type !== 'matching') {
                if (!$container.find('input[name="q_' + q.id + '"]:checked').length &&
                    !$container.find('input[name="q_' + q.id + '"]').hasClass('ordering-done')) {
                    // ordering 不需要radio，先允許提交
                }
            }
        });
        $('#' + submitBtnId).removeClass('hidden');
    });

    // 排序題的點選邏輯
    $container.on('click', '.ordering-item', function() {
        var $container2 = $(this).closest('.ordering-container');
        var $selected = $container2.find('.ordering-item.selected');
        if (!$selected.length) {
            $(this).addClass('selected border-' + colorClass + '-400 bg-' + colorClass + '-50');
        } else if ($selected[0] !== this) {
            var idx1 = $selected.index();
            var idx2 = $(this).index();

            // 交換位置前，先把所有 item 的 data-item 值存到 JS 變數
            // 注意：$container2.empty() 會清除 jQuery data cache，
            // 所以必須在 empty() 之前讀出所有 data-item 值
            var items = $container2.children('.ordering-item').toArray();
            var itemValues = items.map(function(el) {
                // 直接讀 HTML attribute，不走 jQuery cache，最安全
                return el.getAttribute('data-item');
            });

            $selected.removeClass('selected border-' + colorClass + '-400 bg-' + colorClass + '-50');

            // 交換兩個位置
            var tempEl = items[idx1]; items[idx1] = items[idx2]; items[idx2] = tempEl;
            var tempVal = itemValues[idx1]; itemValues[idx1] = itemValues[idx2]; itemValues[idx2] = tempVal;

            // 清空並重新放入，同時重設 data-item attribute（確保 cache 一致）
            $container2.empty();
            items.forEach(function(item, i) {
                item.setAttribute('data-item', itemValues[i]);  // 重設 attribute
                $(item).find('span:first').text(i + 1);
                $container2.append(item);
            });
            $('#' + submitBtnId).removeClass('hidden');
        } else {
            $(this).removeClass('selected border-' + colorClass + '-400 bg-' + colorClass + '-50');
        }
    });

    // 渲染完成後立即顯示提交按鈕（不需要等待互動）
    $('#' + submitBtnId).removeClass('hidden');
}

function getTypeLabel(type) {
    var labels = {
        'true_false': '✅ 是非題',
        'single_choice': '📝 單選題',
        'ordering': '🔢 排序題',
        'matching': '🔗 配對題',
        'scenario': '🏭 情境題'
    };
    return labels[type] || '題目';
}

// ============================================================
// 通用測驗收集答案
// ============================================================
function collectAnswers(questions, containerId) {
    var answers = [];
    questions.forEach(function(q) {
        var answer = null;
        if (q.type === 'ordering') {
            var order = [];
            // 直接讀 HTML attribute（getAttribute），避免 jQuery data cache
            // 被 .empty() 清除後產生 undefined 的問題
            $('#' + containerId + ' .ordering-container[data-qid="' + q.id + '"] .ordering-item').each(function() {
                var val = this.getAttribute('data-item');
                if (val) order.push(val);
            });
            answer = order;
        } else if (q.type === 'matching') {
            answer = 'all_correct';
        } else {
            var $checked = $('#' + containerId + ' input[name="q_' + q.id + '"]:checked');
            if ($checked.length) {
                answer = $checked.val();
            }
        }
        answers.push({ question_id: q.id, answer: answer });
    });
    return answers;
}

// ============================================================
// 展示測驗結果
// ============================================================
function showQuizResult(data, resultId, colorClass) {
    var $result = $('#' + resultId);
    var scoreClass = getScoreColor(data.score);
    var scoreBg = getScoreBg(data.score);
    var emoji = getScoreEmoji(data.score);

    var html = '<div class="' + scoreBg + ' border rounded-2xl p-5 fade-in">';
    html += '<div class="flex items-center gap-4 mb-4">';
    html += '<div class="text-4xl font-black ' + scoreClass + '">' + data.score + '</div>';
    html += '<div><div class="font-bold text-gray-800">' + emoji + ' 答對 ' + data.correct + ' / ' + data.total + ' 題</div>';
    html += '<div class="text-sm text-gray-500">';
    if (data.score >= 85) html += '優秀！掌握紮實，繼續保持 🏆';
    else if (data.score >= 70) html += '良好！理解正確，還可以再鞏固幾個概念 👍';
    else if (data.score >= 55) html += '及格，建議回頭複習錯誤題的解析 📖';
    else html += '需要加強，慢慢來，重讀一遍概念說明會有幫助 💪';
    html += '</div></div></div>';

    // 各題回饋
    if (data.results) {
        data.results.forEach(function(r) {
            if (r.explanation) {
                html += '<div class="mb-2 text-sm">';
                html += r.is_correct
                    ? '<span class="text-green-600">✅ 答對！</span> '
                    : '<span class="text-red-500">❌ 答錯</span>（正確答案：' + r.correct_answer + '）';
                html += '<div class="text-gray-500 text-xs mt-1 pl-5">💡 ' + r.explanation + '</div>';
                html += '</div>';
            }
        });
    }

    html += '</div>';
    $result.html(html).removeClass('hidden');
}

// ============================================================
// HTML 轉義
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================
// 全域初始化
// ============================================================
$(document).ready(function() {
    // 點擊 modal 外部關閉
    $('#name-modal').on('click', function(e) {
        if ($(e.target).is('#name-modal')) hideNameModal();
    });

    // Enter 鍵送出姓名
    $('#name-input').on('keypress', function(e) {
        if (e.key === 'Enter') saveName();
    });
});
