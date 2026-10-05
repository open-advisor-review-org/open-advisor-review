# -*- coding: utf-8 -*-
"""离线单文件版构建器：site/ 静态站点 + assets/api/*.json → 一个双击即用的 HTML

面向零编程用户：微信/QQ/网盘传一个文件，对方双击即可离线浏览全部功能，
无需安装 Python / Node / 任何环境。数据零裁剪（证据链完整，与线上版同源）。

原理：
  - index.html 的外链 css/js 内联为 <style>/<script>
  - 每个 API JSON 单独 gzip+base64，装入 <script id="offline-data" type="application/json">
    （base64 字符集 A-Za-z0-9+/= 不含 HTML 敏感字符，`</script>` 不可能出现在数据中）
  - app.js 的 loadJSON 检测到 #offline-data 即走内嵌分支，按需懒解压
    （DecompressionStream）——只解压被访问的文件，首屏秒开
  - 版本/生成日取自 stats.json（release 仓库无 ../data，不依赖管线目录）

用法：python build_offline.py        （需先跑过 build.py 产出 assets/api/）
输出：dist/advisor-review-offline.html + dist/导师评价库_离线版_v{版本}.html（同一文件两个名字）
"""
import base64
import gzip
import io
import json
import os
import re
import sys
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.abspath(__file__))
API = os.path.join(ROOT, "assets", "api")
DIST = os.path.join(ROOT, "dist")
ONLINE_URL = "https://open-advisor-review-org.github.io/open-advisor-review/"


def main():
    t0 = time.time()
    if not os.path.isdir(API):
        sys.exit("缺少 %s —— 请先跑 python build.py 生成数据" % API)

    stats = json.load(open(os.path.join(API, "stats.json"), encoding="utf-8"))
    version = str(stats.get("version", "dev"))
    generated = str(stats.get("generated", ""))

    # ---- 逐文件 gzip+base64（懒解压单元） ----
    files = {}
    for name in ("stats.json", "schools.json", "search.json"):
        raw = open(os.path.join(API, name), "rb").read()
        files[name] = base64.b64encode(gzip.compress(raw, 9)).decode("ascii")
    school_dir = os.path.join(API, "school")
    sids = sorted(f for f in os.listdir(school_dir) if f.endswith(".json"))
    for fn in sids:
        raw = open(os.path.join(school_dir, fn), "rb").read()
        files["school/" + fn] = base64.b64encode(gzip.compress(raw, 9)).decode("ascii")

    payload = json.dumps(files, ensure_ascii=False, separators=(",", ":"))
    meta = json.dumps({"version": version, "generated": generated, "url": ONLINE_URL},
                      ensure_ascii=False)
    payload_html = payload.replace("</", "<\\/")  # 保险：闭合斜杠转义，`</script>` 永不出现

    # ---- 内联 css / js，注入数据节点 ----
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    css = open(os.path.join(ROOT, "assets", "style.css"), encoding="utf-8").read()
    js = open(os.path.join(ROOT, "assets", "app.js"), encoding="utf-8").read()

    html = re.sub(r'<link rel="stylesheet" href="assets/style\.css[^"]*">',
                  lambda m: "<style>\n" + css + "\n</style>", html)
    html = html.replace("<title>AI 导师评价库 · 开源版</title>",
                        "<title>AI 导师评价库 · 离线快照版 v" + version + "</title>")
    data_tag = ('<script id="offline-data" type="application/json" data-meta=\''
                + meta.replace("'", "&#39;") + "'>" + payload_html + "</script>\n")
    html = re.sub(r'<script src="assets/app\.js[^"]*"></script>',
                  lambda m: data_tag + "<script>\n" + js + "\n</script>", html)

    os.makedirs(DIST, exist_ok=True)
    out_fixed = os.path.join(DIST, "advisor-review-offline.html")
    with open(out_fixed, "wb") as f:
        f.write(html.encode("utf-8"))

    # 带版本名副本（用户下载后能认出版本；固定名那份给 README 永久链接）
    out_ver = os.path.join(DIST, "导师评价库_离线版_v%s.html" % version)
    with open(out_ver, "wb") as f:
        f.write(html.encode("utf-8"))

    size_mb = os.path.getsize(out_fixed) / 1e6
    print("离线单文件版构建完成：%.1f MB（%d 个数据文件：%d 校 + 3 索引）耗时 %.1fs"
          % (size_mb, len(files), len(sids), time.time() - t0))
    print("  版本 %s · 数据截至 %s" % (version, generated))
    print("  → %s" % out_fixed)
    print("  → %s" % out_ver)


if __name__ == "__main__":
    main()
