# -*- coding: utf-8 -*-
"""开源站点数据构建：data/ 管线产物 → site/assets/api/*.json

三级数据：
  stats.json   总览大盘（KPI/分布/时间线/榜单）
  schools.json 学校索引（排行榜 + 路由）
  search.json  全库检索索引（导师 + 学校）
  school/{sid}.json  学校详情（含该校区全部导师完整评分 + 原始评价，前端不再二次请求）

评分口径与 data/batch_pipeline.py 同源（2026-10-03 阶梯制），评数门槛按用户 2026-10-04 定调移除：
  综合 v = (七维均分×0.55 + 实习×0.15 + 退学×0.15 + 方向×0.15) / Σ权重
  阶梯扣分：不放实习 -1；延毕 硕士 -2.5 / 博士 -1.5；退学硬flag -6；叠加制
  数据可信前提：拿到的评价一律采信，任一条即出综合分；缺项按剩余权重归一
  adjustments 的 delta_internship / dropout_override 透明覆写
用法：python build.py
"""
import json, re, hashlib, sys, io, os
from collections import Counter, defaultdict
from datetime import date
from pypinyin import lazy_pinyin, Style

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def anon_name(name):
    """红线导师匿名显示：姓氏 + 名字拼音首字母（张雷→张L，李刘合→李LH）。
    括号后缀剥离；纯英文名取 姓+名首字母（Xin Yao→Yao X）。"""
    core = re.sub(r"（.*?）|\(.*?\)", "", str(name)).strip() or str(name)
    if core.replace(" ", "").isascii():
        toks = core.split()
        if len(toks) >= 2:
            return toks[-1].capitalize() + " " + "".join(t[0].upper() for t in toks[:-1])
        return toks[0][0].upper() + "."
    surname, rest = core[0], core[1:]
    if not rest:
        return surname
    initials = "".join(p.upper() for p in lazy_pinyin(rest, style=Style.FIRST_LETTER, errors="ignore"))
    return surname + initials

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "data")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "api")

# ---- 输出净化（2026-10-04 开源前数据审查）----
# 调研 notes/report 里带的内部执行器与会话术语，对外替换为可读说法；
# 只做字符串级替换，不改变任何数值与结论。
SANITIZE_SUBS = [
    ("open-runner v0.1 (deepseek-flash)", "AI 调研代理（deepseek-flash）"),
    ("open-runner v0.2 (deepseek-flash)", "AI 调研代理（deepseek-flash）"),
    ("open-runner v0.1", "AI 调研代理"),
    ("open-runner v0.2", "AI 调研代理"),
    ("open-runner", "AI 调研代理"),
    ("报告+evidence_raw 落 scores_pilot 与 evidence_raw", "报告与证据已存档"),
    ("证据底稿：data/evidence_raw/", "证据底稿（未随仓库分发）："),
    ("data/evidence_raw/", "evidence_raw 存档/"),
    ("evidence_raw", "证据存档"),
    ("scores_pilot", "调研报告"),
    ("xhs_profile", "小红书登录态"),
    ("（IAB 不可用）", "（登录浏览器不可用）"),
    ("无浏览器（IAB", "无浏览器（登录浏览器"),  # 兜底，正常不会出现
    ("待主会话 IAB 补采", "待登录浏览器补采"),
    ("待主会话补采", "待后续补采"),
    ("主会话 IAB", "登录浏览器"),
    ("主会话浏览器", "登录浏览器"),
    ("主会话基线简报", "库内基线简报"),
    ("主会话库内记录", "库内记录"),
    ("主会话", "主调研"),
    ("子代理", "调研代理"),
    ("IAB", "登录浏览器"),
    ("web_reader", "网页直读"),
    ("（dk ", "（调研"),
    (" dk ", " 调研 "),
    # 二期队列（2026-10-05+）注记术语——注意「收割」在评价原文里真实存在
    # （offer收割/收割学生成果），只精确替换管线短语，禁止泛替换
    ("v2 摘要级收割（2026-10-05 wave", "轻量调研摘要（2026-10-05 批次"),
    ("v2 摘要级收割（2026-10-05，报告", "轻量调研摘要（2026-10-05，报告"),
    ("v2 摘要级收割", "轻量调研摘要"),
    ("补充收割", "补充调研"),
    ("旧会话收割", "旧轮调研"),
    ("派单简报", "任务简报"),
    ("一期收割遗漏", "一期调研遗漏"),
]

# 正则级：带数字的内部批次标识
SANITIZE_REGEX = [
    (re.compile(r"batch-\d+"), "调研批次"),
]

def sanitize(s):
    for a, b in SANITIZE_SUBS:
        s = s.replace(a, b)
    for pat, rep in SANITIZE_REGEX:
        s = pat.sub(rep, s)
    return s

def deep_sanitize(obj):
    if isinstance(obj, str):
        return sanitize(obj)
    if isinstance(obj, list):
        return [deep_sanitize(x) for x in obj]
    if isinstance(obj, dict):
        return {k: deep_sanitize(v) for k, v in obj.items()}
    return obj

DIM_CN = {"academics": "学术水平", "funding": "科研经费", "stipend": "学生补助",
          "relationship": "师生关系", "workload": "工作时间", "outcome": "学生前途"}

# ---- 学科评分配置（全学科扩展接口，用户 2026-10-04 定调）----
# 打分机制按学科各配一套：七维口碑/实习/退学全学科通用，方向前途的锚点表按学科定制。
# 扩展新学科三步：①这里注册 profile（锚点表+fit 规则）→ ②给导师归属学科 → ③重建。
# 其他学科招到共建者定标后启用；未配置学科的导师沿用通用维度，方向分缺省不出。
DISCIPLINES = {
    "ai": {
        "name": "人工智能",
        "status": "active",
        "rubric": "LLM 相关 3.5 / CV·NLP 经典 3 / 传统 ML ≤2.5 / 传统优化 ≤2；另看导师近 5 年研究贴不贴主赛道，不贴只减不加",
        "note": "当前默认视角：给 AI 学生的择导师参考",
    },
    # ---- 以下预留位：定标后启用 ----
    # "bio":    {"name": "生物",     "status": "planned", "rubric": None, "note": "招募共建者定标中"},
    # "med":    {"name": "医学",     "status": "planned", "rubric": None, "note": "招募共建者定标中"},
    # "mat":    {"name": "材料",     "status": "planned", "rubric": None, "note": "招募共建者定标中"},
    # "econ":   {"name": "经管",     "status": "planned", "rubric": None, "note": "招募共建者定标中"},
    # "hss":    {"name": "人文社科", "status": "planned", "rubric": None, "note": "招募共建者定标中"},
}
ACTIVE_DISCIPLINE = "ai"


def rubric_anchors(discipline):
    """方向分锚点表按学科取用；目前只有 ai 一套（ANCHORS），新学科在此分支"""
    return ANCHORS


AI_PAT = (r"人工智能|智能科学|智能系统|智能信息|机器学习|深度学习|计算机视觉|模式识别|自然语言处理|语言模型|大模型|知识图谱|"
          r"数据挖掘|强化学习|计算机智能|计算智能|机器人|具身|智能体|语音|多媒体|计算机应用|虚拟现实|计算机技术|计算机科学|"
          r"软件工程|网络安全|信息安全|密码学|图形学|数据库|大数据|物联网|边缘计算|网络空间")
ANCHORS = [
    (r"优化|进化计算|遗传算法|演化|群智能|蚁群|粒子群|[Ee]volutionary|[Gg]enetic [Aa]lgorithm|[Oo]ptimi[sz]ation", 2.0, "传统优化上限 2"),
    (r"大模型|LLM|ChatGPT|语言模型|知识图谱|知识增强|对话|AIGC|Large Language|LLM Agent", 3.5, "有 LLM 相关=3.5"),
    (r"目标跟踪|跟踪|检测|识别|分割|图像处理|计算机视觉|视觉|自然语言处理|文本|检索|OCR|[Cc]omputer [Vv]ision|[Ii]mage|[Nn]atural [Ll]anguage|[Ss]entiment|[Ss]peech", 3.0, "CV/NLP 经典任务=3"),
    (r"机器人|具身|事件相机|神经形态|传感器|芯片|智能体|无人|[Rr]obot|[Ee]mbodied|[Ss]ensor", 3.5, "其他前沿（批量保守档）"),
    (r"机器学习|模式识别|故障诊断|数据挖掘|预测|深度学习|[Mm]achine [Ll]earning|[Dd]ata [Mm]ining|[Dd]eep [Ll]earning|[Pp]attern [Rr]ecognition|[Rr]einforcement [Ll]earning", 2.5, "传统 ML 上限 2.5"),
]

# ---- 方向分桶（用户 2026-10-04 要求方向筛选；规则 + 子代理归类映射双通道） ----
DIR_RULES = [
    ("LLM/大模型", r"大模型|LLM|ChatGPT|语言模型|AIGC|知识图谱|生成式|智能体|多智能体|对话系统"),
    ("CV/NLP经典", r"视觉|图像|目标跟踪|跟踪|检测|识别|分割|OCR|自然语言|文本|语音|多媒体|视频|三维|点云|SLAM|遥感|人脸"),
    ("机器人/具身", r"机器人|具身|无人|自动驾驶|智能车|无人机|事件相机|神经形态|传感"),
    ("传统ML/挖掘", r"机器学习|深度学习|模式识别|数据挖掘|强化学习|推荐|联邦学习|图神经|进化计算|群智能|群体智能|神经网络|计算智能|类脑"),
    ("网络安全/系统", r"网络安全|信息安全|密码|系统安全|区块链|云计算|分布式|操作系统|数据库|软件工程|物联网|边缘计算|网络空间|体系结构"),
]
TAG_BUCKET = [("cs_core", "其他CS方向"), ("ai_interdisciplinary", "其他CS方向"),
              ("ee", "电子信息/通信"), ("microelectronics", "电子信息/通信"),
              ("automation_control", "自动化/控制"), ("mechanics_optics", "其他学科（非AI）"), ("other", "其他学科（非AI）")]

# 院系关键词兜底（roster 只覆盖 48 校信息类院系；评价库含全校导师，土木/机械/医学等由此归类）
DEPT_RULES = [
    ("其他CS方向", r"计算机|软件|人工智能|智能科学|网安|网络安全|网络空间|数据科学|信息科学|信息与计算|计算中心"),
    ("电子信息/通信", r"电子|通信|微电子|集成电路|光电|信息工程|电磁场"),
    ("自动化/控制", r"自动化|控制|机器人工程|仪器|测控|导航"),
    ("其他学科（非AI）", r"土木|交通|机械|能源|材料|医学|生物|人文|艺术|化学|化工|建筑|环境|经济|管理|法|外文|外国语|物理|数学|马克思|体育|教育|文学|历史|哲学|社会|公共|音乐|美术|设计|农|林|兽医|畜牧|水利|核|矿业|冶金|纺织|食品|船舶|车辆|电气|动力|航空|机电|测绘|地质|大气|海洋"),
]


def load_aux(name):
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_aux", name)
    if os.path.exists(p):
        try:
            return json.load(open(p, encoding="utf-8"))
        except Exception:
            return {}
    return {}


def dir_bucket_of(r0, areas_txt, dept_names, ai_tier, in_queue, area_map, dept_map):
    """优先级：方向词规则 > 子代理方向词映射 > 学科标签 > 院系映射 > AI 队列兜底"""
    for name, pat in DIR_RULES:
        if re.search(pat, areas_txt or ""):
            return name
    for a in (r0 or {}).get("research_areas") or []:
        if a.strip() in area_map:
            return area_map[a.strip()]
    tags = (r0 or {}).get("discipline_tags") or []
    for t, b in TAG_BUCKET:
        if t in tags:
            return b
    for d in dept_names:
        if d and d.strip() in dept_map:
            b = dept_map[d.strip()]
            return "其他学科（非AI）" if b in ("其他工科", "非工科学科") else b
    for d in dept_names:
        for name, pat in DEPT_RULES:
            if d and re.search(pat, d):
                return name
    if ai_tier == "ai_core" or in_queue:
        return "其他CS方向"
    return "未标注"


def load(p):
    return json.load(open(os.path.join(D, p), encoding="utf-8"))


def sid_of(uni):
    return hashlib.md5(uni.encode("utf-8")).hexdigest()[:8]


def aid_of(uni, sup):
    return "a" + hashlib.md5((uni + "|" + sup).encode("utf-8")).hexdigest()[:9]


def dropout_score(x, override=None):
    if override is not None:
        return override.get("score"), override.get("hard_flag", False)
    if x["dropout_hard_flag"]:
        return (1 if x["dropout_mentions"] >= 3 else 2), True
    if x["delay_grad_mentions"] or x["dropout_mentions"]:
        return 3, False
    return None, False


def rule_direction(text, anchors=None):
    t = text or ""
    for pat, score, why in (anchors or ANCHORS):
        if re.search(pat, t):
            return score, "批量规则锚点初评：命中[%s]；fit 未判定待复核（rubric v2.1）" % why
    return 3.0, "批量规则锚点初评：无锚点命中取稳态默认；fit 未判定待复核（rubric v2.1）"


def composite(x, direction, intern_override=None, drop_override=None, delay_level=None):
    """返回 (composite|None, base_v, penalty, penalties[], parts[])，与 batch_pipeline.composite 同口径"""
    sev = [x["dims"].get(d) for d in DIM_CN if x["dims"].get(d) is not None]
    intern = intern_override if intern_override is not None else x["internship"]
    ds, has_flag = dropout_score(x, drop_override)
    parts = []
    if sev:
        parts.append({"k": "sev", "label": "七维口碑均分", "v": round(sum(sev) / len(sev), 2), "w": 0.55})
    if intern is not None:
        parts.append({"k": "intern", "label": "实习放行", "v": intern, "w": 0.15})
    if ds is not None:
        parts.append({"k": "dropout", "label": "退学风险", "v": ds, "w": 0.15})
    if direction is not None:
        parts.append({"k": "direction", "label": "方向前途(按AI)", "v": direction, "w": 0.15})
    if not parts:
        return None, None, 0, [], []
    v = sum(p["v"] * p["w"] for p in parts) / sum(p["w"] for p in parts)
    pen, penalties = 0, []
    if intern is not None and intern <= 2:
        pen += 1
        penalties.append({"label": "不放实习/实习严重受限", "pts": -1})
    if has_flag:
        pen += 6
        penalties.append({"label": "退学/劝退硬信号", "pts": -6})
    elif ds == 3:
        if delay_level:
            if delay_level.get("master", 0) > 0:
                pen += 2.5
                penalties.append({"label": "延毕指控（硕士）", "pts": -2.5})
            if delay_level.get("phd", 0) > 0:
                pen += 1.5
                penalties.append({"label": "延毕指控（博士）", "pts": -1.5})
            if delay_level.get("master", 0) == 0 and delay_level.get("phd", 0) == 0:
                pen += 1.5
                penalties.append({"label": "延毕指控（层级不明，按博士档）", "pts": -1.5})
        else:
            pen += 1.5
            penalties.append({"label": "延毕指控（层级不明，按博士档）", "pts": -1.5})
    return round(v - pen, 2), round(v, 2), pen, penalties, parts


def parse_reports():
    """scores_pilot/*.md 报告头解析 → {(uni,sup): md全文}
    标题格式多样（报告/简报/调研卡/评分卡底稿），统一取首行「：姓名（学校…）」或「# 姓名（学校…）」，
    校名取括号内首个空格前片段；随后与导师键双向包含匹配防同校同名歧义。"""
    raw = []  # (name, uni, txt)
    d = os.path.join(D, "scores_pilot")
    for fn in os.listdir(d):
        if not fn.endswith(".md"):
            continue
        p = os.path.join(d, fn)
        if os.path.isdir(p):
            continue
        txt = open(p, encoding="utf-8").read()
        first = txt.split("\n", 1)[0].strip().strip("*")
        m = re.match(r"#+\s*(?:导师口碑调研(?:报告|简报)?|评分卡)?[:：]?\s*(.+?)（(.+?)）", first)
        if not m:
            continue
        name = m.group(1).strip()
        uni = m.group(2).strip().split(" ")[0].split("/")[0].strip()
        if name and uni:
            raw.append((name, uni, txt))
    return raw


def match_report(raw_reports, uni, sup):
    """返回与 (uni, sup) 匹配的报告全文；多候选歧义时放弃"""
    hits = [txt for name, u, txt in raw_reports if u == uni and (name == sup or sup in name or name in sup)]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        exact = [t for name, u, t in raw_reports if u == uni and name == sup]
        return exact[0] if len(exact) == 1 else None
    return None


def extract_social_years():
    """深挖证据年份分布：social_evidence/ + evidence_raw/ 的 md 里带年月的证据日期（2021+）。
    排除程序性行（抓取/采集/生成/快照等），文件名日期不计。"""
    pat = re.compile(r"(20[12]\d)\s?[-/年.]\s?(\d{1,2})")
    proc = re.compile(r"抓取|采集|检索|生成|快照|存档|留痕|文件名|last_confirmed|确认|编辑于|更新|^#|^>|调研|snapshot|API|curl|主档|执行器|补采|追加|页面仅展示|\d{4}-\d{2}\s*[~～]")
    cnt = Counter()
    for folder in ("social_evidence", "evidence_raw"):
        base = os.path.join(D, folder)
        if not os.path.isdir(base):
            continue
        for fn in os.listdir(base):
            if not fn.endswith(".md"):
                continue
            try:
                txt = open(os.path.join(base, fn), encoding="utf-8", errors="ignore").read()
            except Exception:
                continue
            for line in txt.split("\n"):
                if proc.search(line):
                    continue
                for m in pat.finditer(line):
                    y, mo = int(m.group(1)), int(m.group(2))
                    # 只收 2021-2025：存档期止于 2020，这几年的日期必然来自深挖；
                    # 2026 的日期与调研执行时间混在一起没法干净区分，宁缺毋滥
                    if 2021 <= y <= 2025 and 1 <= mo <= 12:
                        cnt[y] += 1
    return [{"y": str(y), "n": cnt[y]} for y in sorted(cnt)]


def main():
    os.makedirs(os.path.join(OUT, "school"), exist_ok=True)
    today = date.today().isoformat()
    version = open(os.path.join(D, "VERSION"), encoding="utf-8").read().strip()[:13] if os.path.exists(os.path.join(D, "VERSION")) else "dev"

    scores = load("advisor_scores.json")                     # 17333 库内评分
    advisors = load("merged/advisors.json")                  # 17333 聚合
    reviews = load("merged/reviews.json")                    # 39739 原始评价
    roster = load("roster_all.json")                         # 27663 官方名录
    ai_subset = load("ai_subset/advisors_ai.json")           # 4783 AI 子集
    pilot_dir = load("pilot_direction_scores.json")["scores"]
    pilot_adj = load("pilot_signal_adjustments.json")["adjustments"]
    delay_lv = load("delay_level_20261003.json")
    queue = load("batch_queue_20261002.json")["queue"]
    raw_reports = parse_reports()
    area_map = load_aux("area_bucket.json")
    dept_map = load_aux("dept_bucket.json")
    report_by_key = lambda uni, sup: match_report(raw_reports, uni, sup)

    dmap = {(x["university"], x["supervisor"]): x for x in pilot_dir}
    amap = {(x["university"], x["supervisor"]): x for x in pilot_adj}
    tmap = {(a["university"], a["supervisor"]): a for a in advisors}
    smap = {(a["university"], a["supervisor"]): a for a in scores}
    aimap = {(a["university"], a["supervisor"]): a for a in ai_subset}
    qmap = {(x["university"], x["supervisor"]): x for x in queue}
    rmap = defaultdict(list)
    for r in roster:
        rmap[(r["university"], r["supervisor"])].append(r)
    revmap = defaultdict(list)
    for rv in reviews:
        revmap[(rv["university"], rv["supervisor"])].append(rv)

    # ---- 全部目标导师键：有评分 ∪ 队列 ∪ AI 核心 ----
    keys = set(smap) | set(qmap) | set(k for k in aimap if aimap[k].get("tier") == "ai_core")

    school_adv = defaultdict(list)
    cate_cnt = defaultdict(Counter)
    n_roster_by_uni = Counter(r["university"] for r in roster)

    for (uni, sup) in keys:
        s = smap.get((uni, sup))
        a = tmap.get((uni, sup), {})
        q = qmap.get((uni, sup), {})
        adj = amap.get((uni, sup), {})
        dirp = dmap.get((uni, sup))
        ai = aimap.get((uni, sup))
        rl = rmap.get((uni, sup)) or []

        # roster 官方画像（取字段最全的一条）
        r0 = max(rl, key=lambda r: len(r.get("research_areas") or []) + (2 if r.get("title") else 0) + (1 if r.get("homepage") else 0)) if rl else None
        areas_txt = " ".join((r0 or {}).get("research_areas") or []) + " " + " ".join((r0 or {}).get("departments") or []) + " " + (r0 or {}).get("department", "")
        areas_txt += " " + " ".join(a.get("departments") or [])

        # 方向分：试点人工/调研分 > 批量锚点初评（仅 AI 子集或队列内）
        if dirp and dirp.get("direction_outlook") is not None:
            direction = {"score": dirp["direction_outlook"], "rationale": dirp["rationale"], "basis": "pilot", "discipline": ACTIVE_DISCIPLINE}
        elif ai or q:
            sc, why = rule_direction(areas_txt, rubric_anchors(ACTIVE_DISCIPLINE))
            direction = {"score": sc, "rationale": why, "basis": "anchor", "discipline": ACTIVE_DISCIPLINE}
        else:
            direction = None

        intern_override = adj.get("delta_internship")
        drop_override = adj.get("dropout_override")
        dl = delay_lv.get(uni + "|" + sup)
        n_rev = s["n_reviews"] if s else 0
        comp = base = pen = None
        penalties = parts = []
        # 数据可信前提（用户 2026-10-04 定调）：拿到的评价一律采信，任一条即出综合分，不设评数门槛
        if s:
            comp, base, pen, penalties, parts = composite(s, direction["score"] if direction else None,
                                                          intern_override, drop_override, dl)

        rvs = revmap.get((uni, sup), [])
        for rv in rvs:
            cate_cnt[uni][rv.get("school_cate") or "其他"] += 1
        rev_payload = []
        for rv in rvs:
            item = {"date": rv.get("date"), "rate": rv.get("rate"), "source": rv.get("source")}
            dd = rv.get("dims") or {}
            slim = {k: v for k, v in dd.items() if v}
            if not slim:
                raw = (rv.get("description_raw") or "")[:600]
                if raw:
                    slim = {"description_raw": raw}
            item["dims"] = slim
            rev_payload.append(item)
        rev_payload.sort(key=lambda r: r.get("date") or "", reverse=True)

        rec = {
            "id": aid_of(uni, sup),
            "supervisor": sup,
            "university": uni,
            "dir_bucket": dir_bucket_of(r0, areas_txt,
                                        (a.get("departments") or []) + ([(r0 or {}).get("department")] if r0 and r0.get("department") else []),
                                        ai.get("tier") if ai else None, bool(q), area_map, dept_map),
            "departments": a.get("departments") or ([(r0 or {}).get("department")] if r0 and r0.get("department") else []),
            "n_reviews": n_rev,
            "rate_avg": a.get("avg_rate") if (a.get("avg_rate") is not None and a.get("avg_rate") > 0) else None,
            "dates": [a.get("date_min"), a.get("date_max")],
            "sources": a.get("sources") or [],
            "dims": (s["dims"] if s else {}),
            "dims_n": (s.get("dims_n") if s else {}),
            "internship": {"score": (intern_override if intern_override is not None else (s["internship"] if s else None)),
                           "pos": s["intern_pos_evidence"] if s else 0,
                           "neg": s["intern_neg_evidence"] if s else 0},
            "dropout": {"mentions": s["dropout_mentions"] if s else 0,
                        "hard": (drop_override or {}).get("hard_flag", s["dropout_hard_flag"] if s else False),
                        "keywords": s["dropout_keywords"] if s else {},
                        "delay": s["delay_grad_mentions"] if s else 0},
            "direction": direction,
            "composite": comp, "base": base, "penalty": pen if comp is not None else None,
            "penalties": penalties, "parts": parts,
            "synthesis": adj.get("synthesis"),
            "freshness": adj.get("freshness"),
            "notes": adj.get("notes"),
            "tier": ai.get("tier") if ai else None,
            "research_status": q.get("research_status"),
            "research_tier": q.get("tier"),
            "roster": ({"title": r0.get("title"), "areas": r0.get("research_areas"),
                        "homepage": r0.get("homepage"), "mentor": r0.get("mentor_status"),
                        "confirmed": r0.get("last_confirmed")} if r0 else None),
            "report": report_by_key(uni, sup),
            "reviews": rev_payload,
        }
        school_adv[uni].append(rec)

        # ---- 红线脱敏（用户 2026-10-04 要求：触发红线惩罚的导师全站匿名=姓氏+拼音缩写）----
        # 姓名、综合评价/注记/新鲜度内文全部遮蔽；不内嵌深挖报告、不外链官方主页（降低指认风险）
        if penalties:
            anon = anon_name(sup)
            forms = sorted({sup, re.sub(r"（.*?）|\(.*?\)", "", sup).strip()} - {""}, key=len, reverse=True)

            def _mk(t):
                for f in forms:
                    t = t.replace(f, anon)
                return t

            rec["supervisor"] = anon
            for k in ("synthesis", "notes", "freshness"):
                rec[k] = _mk(rec[k]) if rec[k] else rec[k]
            rec["report"] = None
            if rec["roster"]:
                rec["roster"]["homepage"] = None
            for rv in rec["reviews"]:
                if rv.get("dims"):
                    rv["dims"] = {k: _mk(v) for k, v in rv["dims"].items()}

    # ---- 排序：综合分降序（None 沉底）→ 评数 → 姓名 ----
    def sort_key(r):
        return (-(r["composite"] if r["composite"] is not None else -99), -r["n_reviews"], r["supervisor"])
    for uni in school_adv:
        school_adv[uni].sort(key=sort_key)

    # ---- schools.json + school/{sid}.json ----
    schools = []
    for uni, recs in school_adv.items():
        sid = sid_of(uni)
        cate = cate_cnt[uni].most_common(1)[0][0] if cate_cnt[uni] else None
        comps = [r["composite"] for r in recs if r["composite"] is not None]
        n_done = sum(1 for r in recs if r["research_status"] == "done")
        n_hard = sum(1 for r in recs if r["dropout"]["hard"])
        # ---- 按学科桶统计（用户 2026-10-04：总榜被没出分/跨学科导师拉偏，榜单按学科切） ----
        bstat = {}
        for r in recs:
            b = r["dir_bucket"]
            d = bstat.setdefault(b, {"n": 0, "scored": 0, "reviews": 0, "csum": 0.0, "neg": 0, "deep": 0})
            d["n"] += 1
            d["reviews"] += r["n_reviews"]
            if r["composite"] is not None:
                d["scored"] += 1
                d["csum"] += r["composite"]
                if r["composite"] < 0:
                    d["neg"] += 1
            if r["research_status"] == "done":
                d["deep"] += 1
        buckets = {b: {"n_advisors": d["n"], "n_scored": d["scored"], "n_reviews": d["reviews"],
                       "avg_composite": round(d["csum"] / d["scored"], 2) if d["scored"] else None,
                       "n_negative": d["neg"], "n_deep_done": d["deep"]} for b, d in bstat.items()}
        AI_BUCKETS = ("LLM/大模型", "CV/NLP经典", "机器人/具身", "传统ML/挖掘", "网络安全/系统", "其他CS方向")

        def merge(sel):
            s_ = [buckets[b] for b in sel if b in buckets]
            sc = sum(x["n_scored"] for x in s_)
            return {"n_advisors": sum(x["n_advisors"] for x in s_), "n_scored": sc,
                    "n_reviews": sum(x["n_reviews"] for x in s_),
                    "avg_composite": round(sum(x["avg_composite"] * x["n_scored"] for x in s_ if x["avg_composite"] is not None) / sc, 2) if sc else None,
                    "n_negative": sum(x["n_negative"] for x in s_), "n_deep_done": sum(x["n_deep_done"] for x in s_)}

        meta = {
            "sid": sid, "name": uni, "cate": cate,
            "n_advisors": len(recs),
            "n_reviews": sum(r["n_reviews"] for r in recs),
            "n_scored": len(comps),
            "avg_composite": round(sum(comps) / len(comps), 2) if comps else None,
            "n_negative": sum(1 for c in comps if c < 0),
            "n_hardflag": n_hard,
            "n_deep_done": n_done,
            "roster_total": n_roster_by_uni.get(uni),
            "buckets": buckets, "ai": merge(AI_BUCKETS),
        }
        schools.append(meta)
        json.dump(deep_sanitize({"meta": meta, "advisors": recs}),
                  open(os.path.join(OUT, "school", sid + ".json"), "w", encoding="utf-8"),
                  ensure_ascii=False, separators=(",", ":"))
    schools.sort(key=lambda s: (-(s["n_reviews"] or 0), s["name"]))
    json.dump(deep_sanitize(schools), open(os.path.join(OUT, "schools.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    # ---- search.json：[姓名, 学校, sid, aid, 综合, 评数, 状态] ----
    srows = []
    for uni, recs in school_adv.items():
        sid = sid_of(uni)
        for r in recs:
            st = r["research_status"] or ("done" if r["synthesis"] else None)
            srows.append([r["supervisor"], uni, sid, r["id"], r["composite"], r["n_reviews"], st])
    json.dump(deep_sanitize(srows), open(os.path.join(OUT, "search.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    # ---- stats.json 总览大盘 ----
    all_recs = [r for recs in school_adv.values() for r in recs]
    comps = [r["composite"] for r in all_recs if r["composite"] is not None]
    bins = {}
    for c in comps:
        b = min(5, max(-8, int(c))) if c >= 0 else int(c)
        b = int(c) - (1 if c < 0 and c != int(c) else 0)  # floor for negatives
        bins[b] = bins.get(b, 0) + 1
    hist = [{"bin": b, "n": bins[b]} for b in sorted(bins)]
    rate_bins = Counter()
    for rv in reviews:
        r = rv.get("rate")
        if r is not None:
            rate_bins[round(r * 2) / 2] += 1
    timeline = Counter((rv.get("date") or "无日期")[:4] for rv in reviews)
    dims_avg = {}
    for d_ in DIM_CN:
        vals = [r["dims"][d_] for r in all_recs if r["dims"].get(d_) is not None]
        dims_avg[d_] = round(sum(vals) / len(vals), 2) if vals else None
    src_cnt = Counter(rv.get("source") for rv in reviews)
    ranked = sorted(all_recs, key=lambda r: (r["composite"] is None, -(r["composite"] or 0), -r["n_reviews"]))
    intern_constrained = sum(1 for r in all_recs if r["internship"]["score"] is not None and r["internship"]["score"] <= 2)
    intern_constrained = sum(1 for r in all_recs if r["internship"]["score"] is not None and r["internship"]["score"] <= 2)
    stats = {
        "version": version, "generated": today,
        "disciplines": {"current": ACTIVE_DISCIPLINE, "profiles": DISCIPLINES},
        "totals": {
            "roster": len(roster), "advisors_with_reviews": len([r for r in all_recs if r["n_reviews"] > 0]),
            "reviews": len(reviews), "schools": len(schools),
            "scored": len(comps), "negative": sum(1 for c in comps if c < 0),
            "hardflag": sum(1 for r in all_recs if r["dropout"]["hard"]),
            "deep_done": sum(1 for r in all_recs if r["research_status"] == "done"),
            "reports": sum(1 for recs in school_adv.values() for r in recs if r["report"]), "synthesis": sum(1 for r in all_recs if r["synthesis"]),
            "queue_total": len(queue), "queue_done": sum(1 for x in queue if x.get("research_status") == "done"),
            "ai_total": len(ai_subset), "intern_constrained": intern_constrained,
        },
        "composite_hist": hist,
        "rate_hist": [{"bin": b, "n": rate_bins[b]} for b in sorted(rate_bins)],
        "timeline": [{"y": y, "n": timeline[y]} for y in sorted(timeline)],
        "timeline_social": extract_social_years(),
        "dims_avg": dims_avg,
        "sources": dict(src_cnt),
        "cate": dict(Counter(("海外" if (rv.get("school_cate") or "其他") not in ("985", "211", "其他", "研究机构") else (rv.get("school_cate") or "其他")) for rv in reviews)),
        "top": [ref(r) for r in ranked[:40] if r["composite"] is not None and not r["penalties"]][:10],
    }
    json.dump(deep_sanitize(stats), open(os.path.join(OUT, "stats.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    total_mb = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if os.path.isfile(os.path.join(OUT, f))) / 1e6
    school_mb = sum(os.path.getsize(os.path.join(OUT, "school", f)) for f in os.listdir(os.path.join(OUT, "school"))) / 1e6
    print("OK schools=%d advisors=%d reviews=%d scored=%d neg=%d reports=%d" % (
        len(schools), len(all_recs), len(reviews), len(comps), stats["totals"]["negative"], stats["totals"]["reports"]))
    print("size: root=%.1fMB school/=%.1fMB -> %s" % (total_mb, school_mb, OUT))


def ref(r):
    return {"id": r["id"], "supervisor": r["supervisor"], "university": r["university"],
            "sid": sid_of(r["university"]), "composite": r["composite"], "n": r["n_reviews"],
            "hard": r["dropout"]["hard"], "penalty": r["penalty"]}


if __name__ == "__main__":
    main()
