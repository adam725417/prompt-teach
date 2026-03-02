#!/usr/bin/env python3
"""
build_static.py - 產生 GitHub Pages 靜態版本，輸出至 docs/ 資料夾
執行：python3 build_static.py
"""
import os, re, shutil, sys

# 確保工作目錄正確
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 初始化資料庫（若不存在）
if not os.path.exists('database/ai_teaching.db'):
    print("初始化資料庫...")
    from database.init_db import init_database
    init_database()

from app import app

DOCS = 'docs'

# ── 要渲染的頁面 ──────────────────────────────────────────────
PAGES = [
    ('/',        'index.html'),
    ('/unit-a',  'unit-a.html'),
    ('/unit-b',  'unit-b.html'),
    ('/unit-c',  'unit-c.html'),
]

# ── URL 重寫規則 ──────────────────────────────────────────────
REWRITES = [
    # 靜態資源：絕對路徑 → 相對路徑
    (r'(href|src)="/static/', r'\1="./static/'),
    # 頁面連結
    (r'href="/"',        'href="./index.html"'),
    (r'href="/unit-a"',  'href="./unit-a.html"'),
    (r'href="/unit-b"',  'href="./unit-b.html"'),
    (r'href="/unit-c"',  'href="./unit-c.html"'),
    (r'href="/teacher"', 'href="#"'),
    (r'href="/case[^"]*"', 'href="#"'),
    # action 屬性（保險起見）
    (r'action="/[^"]*"', 'action="#"'),
]

JQUERY_TAG = 'https://code.jquery.com/jquery-3.7.1.min.js"></script>'
OVERRIDE_INJECT = JQUERY_TAG + '\n    <script src="./static/js/static-override.js"></script>'


def render(url):
    with app.test_client() as c:
        with c.session_transaction() as sess:
            sess['user_id'] = 'static-preview-user'
        resp = c.get(url)
        if resp.status_code != 200:
            print(f"  ⚠ {url} → HTTP {resp.status_code}")
            return None
        return resp.data.decode('utf-8')


def rewrite(html):
    for pattern, repl in REWRITES:
        html = re.sub(pattern, repl, html)
    # 注入 static-override.js 緊接在 jQuery 之後
    html = html.replace(JQUERY_TAG, OVERRIDE_INJECT)
    return html


def build():
    print("=" * 50)
    print("🔨 開始建置靜態網站")
    print("=" * 50)

    # 清空並重建 docs/
    if os.path.exists(DOCS):
        shutil.rmtree(DOCS)
    os.makedirs(DOCS)

    # 複製靜態資源
    print("📁 複製 static/ 資源...")
    shutil.copytree('static', os.path.join(DOCS, 'static'))

    # 渲染各頁面
    for url, filename in PAGES:
        print(f"🖥  渲染 {url:15s} → docs/{filename}")
        html = render(url)
        if not html:
            continue
        html = rewrite(html)
        with open(os.path.join(DOCS, filename), 'w', encoding='utf-8') as f:
            f.write(html)

    # GitHub Pages：需要一個 .nojekyll 讓底線開頭的資料夾正常運作
    open(os.path.join(DOCS, '.nojekyll'), 'w').close()

    print("=" * 50)
    print(f"✅ 建置完成！docs/ 共 {len(PAGES)} 頁")
    print("=" * 50)


if __name__ == '__main__':
    build()
