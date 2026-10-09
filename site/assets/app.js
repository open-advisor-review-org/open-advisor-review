/* ============================================================
   AI 导师评价库 · 开源版 — 前端 SPA（零依赖）
   路由：#/ 总览 ｜ #/school/:sid 学校 ｜ #/school/:sid/:aid 导师详情
   ============================================================ */
"use strict";

/* ---------- 基础工具 ---------- */
const $ = (s, p) => (p || document).querySelector(s);
const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ic = (n, s) => `<svg width="${s || 16}" height="${s || 16}" style="vertical-align:-2px"><use href="#i-${n}"/></svg>`;
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("zh-CN"));
const f1 = (n) => (n == null ? "—" : (Math.round(n * 100) / 100).toFixed(2));
/* 存档评价原文偶带 HTML 碎片（如 `</a><!-- m -->`）：显示前按常见标签白名单清掉（转义照常做，无安全影响，只为不见脏字符） */
const FRAG_RE = /<\/?(?:a|b|i|u|s|em|strong|p|br|div|span|img|font|blockquote|h[1-6]|ol|ul|li)(?:\s[^<>]*)?\/?>|<!--[\s\S]*?-->/gi;
const cleanFrag = (s) => String(s == null ? "" : s).replace(FRAG_RE, "").replace(/\s{2,}/g, " ").trim();
const cache = {};
const BUST = "d01880d7";
/* 离线单文件模式（build_offline.py 产物）：全部 API 数据以逐文件 gzip+base64 内嵌于
   <script id="offline-data" type="application/json">（data-meta 存版本/生成日/线上地址），
   loadJSON 命中时懒解压——只解压被访问的文件，首屏秒开、内存友好。
   线上部署没有该节点，走原 fetch 路径，行为与之前完全一致。 */
const EMBED_EL = document.getElementById("offline-data");
const EMBED = EMBED_EL ? { files: JSON.parse(EMBED_EL.textContent), meta: JSON.parse(EMBED_EL.dataset.meta || "{}") } : null;
if (EMBED_EL) EMBED_EL.remove();
async function gunzipJSON(b64) {
  if (typeof DecompressionStream === "undefined")
    throw new Error("当前浏览器过旧，不支持离线包解压（需 2023 年后的 Chrome / Edge / Firefox / Safari）。请换新浏览器打开，或联网访问线上版。");
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const text = await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  return JSON.parse(text);
}
async function loadJSON(url) {
  if (cache[url]) return cache[url];
  if (EMBED) {
    const key = url.startsWith("assets/api/") ? url.slice(11) : url;
    if (!EMBED.files[key]) throw new Error("离线包缺少数据文件：" + key);
    return (cache[url] = await gunzipJSON(EMBED.files[key]));
  }
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "v=" + BUST);
  if (!r.ok) throw new Error(url + " " + r.status);
  return (cache[url] = r.json());
}
const API = "assets/api/";
if (EMBED) {
  const m = EMBED.meta;
  const b = document.createElement("div");
  b.className = "offline-banner";
  b.innerHTML = "📦 离线快照版" + (m.version ? " v" + esc(m.version) : "") + (m.generated ? " · 数据截至 " + esc(m.generated) : "")
    + ' — 想看最新数据，<a href="' + (m.url || "https://open-advisor-review-org.github.io/open-advisor-review/") + '" target="_blank" rel="noopener">打开线上版</a>（需联网）';
  document.querySelector("nav.nav").before(b);
}
/* QS 2027 世界大学排名（2026-06 发布；数据源=选校网 QS 官方镜像前600名+英文维基交叉验证；gen_qs2027_map.py 生成） */
const QS2027 = {"东南大学":335,"浙江大学":47,"中国科学院大学":360,"西安交通大学":296,"华中科技大学":307,"北京航空航天大学":349,"天津大学":235,"上海交通大学":36,"大连理工大学":463,"中国科学技术大学":134,"清华大学":14,"北京大学":13,"武汉大学":165,"四川大学":300,"电子科技大学":488,"哈尔滨工业大学":190,"北京理工大学":243,"中南大学":452,"重庆大学":465,"同济大学":146,"南开大学":329,"华南理工大学":342,"西北工业大学":425,"复旦大学":26,"吉林大学":488,"南京大学":90,"厦门大学":303,"湖南大学":477,"山东大学":309,"华东师范大学":394,"中山大学":258,"上海大学":443,"中国农业大学":477,"北京师范大学":237,"郑州大学":581,"北京科技大学":443,"香港科技大学":33,"暨南大学":483,"Nanyang Technological University":12,"深圳大学":416,"浙江工业大学":560,"中国人民大学":521,"香港中文大学":18,"澳门大学":267,"南方科技大学":317,"香港大学":11,"National University of Singapore":10,"香港理工大学":50,"University of Sydney":28,"University of Technology Sydney":87,"Massey University":215,"Technical University Munich":25,"University of Utah":533,"东京大学":39,"Singapore University of Technology and Design":266,"The University of Sheffield":82,"University of New South Wales":19,"Columbia University":43,"University of California, Los Angeles":49,"香港城市大学":52,"Duke University":70,"Royal Institute of Technology":82,"University of Florida":228,"University of Melbourne":22,"King's College London":37,"Kyung Hee University":309,"Purdue University":100,"Univerisity of British Columbia":45,"University of Groningen":157,"University of Wisconsin-Madison":131,"东北大学(日本)":102,"京都大学":64,"名古屋大学":156,"大阪大学":95,"Delft University of Technology":48,"Massachusetts Institute of Technology":1,"McGill University":30,"RWTH Aachen University":104,"The Ohio State University":201,"University of Hamburg":209,"University of Illinois Urbana-Champaign":74,"University of Nottingham":97,"University of Toronto":32,"University of Wollongong":195,"东京工业大学":97,"Lund University":71,"Standford University":2,"Texas A&M University":169,"The Australian National University":29,"The Johns Hopkins University":20,"The University of Queensland":40,"University of Otago":198,"University of Rochester":251,"University of Washington":92,"University of Waterloo":113,"Washington University in St Louis":162,"九州大学":171,"北海道大学":179,"澳门科技大学":398,"Brown University":66,"California Institute of Technology":7,"Imperial College of SciTechMed":2,"New York University":58,"Queen's University":179,"Radboud University Nijmegen":283,"Swinburne University of Technology":291,"The University of Edinburgh":35,"University College London":8,"University of Amsterdam":60,"University of Bristol":57,"University of California, Davis":137,"University of Cambridge":6,"University of Chicago":24,"University of Freiburg":245,"University of Maryland, College Park":252,"University of Michigan":51,"University of Minnesota, Twin Cities":255,"University of Ottawa":228,"University of Pennsylvania":15,"University of Surrey":246,"University of Twente":223,"Victoria University of Wellington":241,"Yale University":16,"广岛大学":481,"筑波大学":351,"岭南大学":581,"香港教育大学":406,"香港浸会大学":216};
function qsBadge(name) { const q = QS2027[name]; return q ? `<span class="chip qs" data-tip="QS 2027 世界大学排名（2026-06 发布）">QS ${q}</span>` : ""; }
/* 共建联系方式（部署前替换为真实仓库/邮箱） */
const CONTACT = { github: "https://github.com/open-advisor-review-org/open-advisor-review", email: "nameless202610@163.com" };

/* ---------- 评分呈现口径 ---------- */
const DIMS = [
  ["academics", "学术水平"], ["funding", "科研经费"], ["stipend", "学生补助"],
  ["relationship", "师生关系"], ["workload", "工作时间"], ["outcome", "学生前途"],
];
const REV_DIM_CN = {
  identification: "自证认识", academics: "学术水平", funding: "科研经费", stipend: "学生补助",
  relationship: "师生关系", workload: "工作时间", outcome: "学生前途", description_raw: "原文",
};
const SRC_CN = { urfire_2022: "导师评价网存档·2022", dachacha_2024: "大查查存档·2024" };

function pill(v, small) {
  if (v == null) return `<span class="pill none${small ? " sm" : ""}">—</span>`;
  const cls = v < 0 ? "bad" : v < 2.5 ? "low" : v < 3.5 ? "mid" : "good";
  return `<span class="pill ${cls}">${f1(v)}</span>`;
}
function cateChip(c) {
  if (!c || c === "其他") return `<span class="chip other">其他院校</span>`;
  if (c === "985") return `<span class="chip b985">985</span>`;
  if (c === "211") return `<span class="chip b211">211</span>`;
  if (c === "研究机构") return `<span class="chip tierB">研究机构</span>`;
  if (["U.S.", "U.K.", "Canada", "Germany", "Singapole", "Australia", "France", "Netherlands", "Sweden", "Korea", "Japan", "New Zealand"].includes(c)) return `<span class="chip overseas">海外</span>`;
  return `<span class="chip other">${esc(c)}</span>`;
}
function researchChip(a) {
  const st = a.research_status, t = a.research_tier;
  if (st === "done" && (t === "A_done" || !t)) return `<span class="chip tierA">${ic("doc", 12)} Tier A 深挖</span>`;
  if (st === "done") return `<span class="chip tierB">${ic("doc", 12)} Tier B 轻调研</span>`;
  if (st === "in_progress") return `<span class="chip warn">调研中</span>`;
  if (st) return `<span class="chip tierC">Tier C 库内卡</span>`;
  if (a.synthesis) return `<span class="chip tierA">${ic("doc", 12)} 深挖</span>`;
  return "";
}
function aiChip(a) {
  if (a.tier === "ai_core") return `<span class="chip ai">AI 核心</span>`;
  if (a.tier === "ai_signal") return `<span class="chip ai" style="opacity:.75">AI 相关</span>`;
  return "";
}
function signalFlags(a) {
  let s = "";
  if (a.dropout.hard) s += `<span class="chip danger" data-tip="退学/劝退类词被多条评价提及（硬信号，扣 -6）">${ic("flag", 12)} 退学×${a.dropout.mentions}</span>`;
  else if (a.dropout.mentions) s += `<span class="chip warn" data-tip="延毕/退学类词提及 ${a.dropout.mentions} 次（未经证实的网络评价）">延毕退学×${a.dropout.mentions}</span>`;
  if (a.internship.score != null && a.internship.score <= 2) s += `<span class="chip warn" data-tip="评价中出现不允许实习/实习受限表述（扣 -1）">实习受限</span>`;
  return s;
}

/* ---------- tooltip（全局事件委托） ---------- */
const tip = $("#tip");
document.addEventListener("mousemove", (e) => {
  const t = e.target.closest && e.target.closest("[data-tip]");
  if (t && t.dataset.tip) {
    tip.textContent = t.dataset.tip;
    tip.style.opacity = 1;
    tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + "px";
    tip.style.top = (e.clientY + 16) + "px";
  } else tip.style.opacity = 0;
});

/* ---------- 数字滚动 ---------- */
function countUp(el) {
  const target = +el.dataset.n, suf = el.dataset.suf || "";
  const t0 = performance.now(), dur = 900;
  (function step(t) {
    const p = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(target * ease)) + suf;
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
function bootCountUps(root) {
  $$("[data-n]", root).forEach((el) => {
    if (el._done) return; el._done = 1;
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { countUp(el); io.disconnect(); } }));
    io.observe(el);
  });
}

/* ---------- SVG 图表 ---------- */
function chartHist(bins, { w = 560, h = 210, negFrom = -8 } = {}) {
  const max = Math.max(...bins.map((b) => b.n), 1);
  const padL = 34, padB = 26, padT = 12;
  const iw = w - padL - 8, ih = h - padB - padT;
  const x0 = bins.length ? bins[0].bin : 0, x1 = bins.length ? bins[bins.length - 1].bin : 1;
  const span = x1 - x0 + 1 || 1;
  const bw = Math.max(2, iw / span - 3);
  let bars = "";
  bins.forEach((b) => {
    const bh = Math.max(1.5, (b.n / max) * ih);
    const x = padL + ((b.bin - x0) / span) * iw;
    const y = h - padB - bh;
    const red = b.bin < 0;
    const fill = red ? "url(#gRed)" : "url(#gBlue)";
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" fill="${fill}" data-tip="[${b.bin}, ${b.bin + 1}) 分：${fmt(b.n)} 人"/>`;
    if (span <= 16 || b.bin % 2 === 0)
      bars += `<text class="axis" x="${(x + bw / 2).toFixed(1)}" y="${h - 8}" text-anchor="middle">${b.bin}</text>`;
  });
  for (let i = 0; i <= 3; i++) {
    const y = padT + (ih * i) / 3;
    bars += `<line x1="${padL}" y1="${y}" x2="${w - 8}" y2="${y}" stroke="#eef3fb"/>`;
    bars += `<text class="axis" x="${padL - 6}" y="${y + 3}" text-anchor="end">${fmt(Math.round(max * (1 - i / 3)))}</text>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" class="bar-anim" role="img" aria-label="综合分分布直方图"><defs>
    <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f9bff"/><stop offset="1" stop-color="#0b5cff"/></linearGradient>
    <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a5c"/><stop offset="1" stop-color="#e5484d"/></linearGradient>
  </defs>${bars}</svg>`;
}
function chartTimeline(items, { w = 560, h = 190, cyan = false, tipWord = "条评价" } = {}) {
  const max = Math.max(...items.map((b) => b.n), 1);
  const padL = 40, padB = 26, padT = 10;
  const iw = w - padL - 10, ih = h - padB - padT;
  const bw = Math.max(3, iw / items.length - 4);
  const gid = cyan ? "gCyan" : "gBlue2";
  let s = "";
  items.forEach((b, i) => {
    const bh = Math.max(1.5, (b.n / max) * ih);
    const x = padL + (i + 0.5) * (iw / items.length) - bw / 2;
    const y = h - padB - bh;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" fill="url(#${gid})" data-tip="${esc(b.y)} 年：${fmt(b.n)} ${tipWord}"/>`;
    s += `<text class="axis" x="${(x + bw / 2).toFixed(1)}" y="${h - 8}" text-anchor="middle">${esc(String(b.y).slice(2))}</text>`;
  });
  for (let i = 0; i <= 2; i++) {
    const y = padT + (ih * i) / 2;
    s += `<line x1="${padL}" y1="${y}" x2="${w - 10}" y2="${y}" stroke="#eef3fb"/>`;
    s += `<text class="axis" x="${padL - 6}" y="${y + 3}" text-anchor="end">${fmt(Math.round(max * (1 - i / 2)))}</text>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" class="bar-anim" role="img" aria-label="评价年份分布柱状图"><defs>
    <linearGradient id="gBlue2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5cb8ff"/><stop offset="1" stop-color="#1a8cff"/></linearGradient>
    <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ee0ff"/><stop offset="1" stop-color="#00a8cc"/></linearGradient>
  </defs>${s}</svg>`;
}
function chartHbar(rows, { w = 520, maxV = 5, unit = "" } = {}) {
  const rowH = 34, padL = 96, padR = 46;
  const h = rows.length * rowH + 8;
  let s = "";
  rows.forEach((r, i) => {
    const y = i * rowH + 6;
    const bw = ((r.v || 0) / maxV) * (w - padL - padR);
    s += `<text x="${padL - 8}" y="${y + 14}" text-anchor="end" font-size="12.5" fill="#233c66">${esc(r.label)}</text>`;
    s += `<rect x="${padL}" y="${y}" width="${w - padL - padR}" height="18" rx="5" fill="#eef3fb"/>`;
    if (r.v != null) s += `<rect x="${padL}" y="${y}" width="${Math.max(3, bw).toFixed(1)}" height="18" rx="5" fill="url(#gBlue)" data-tip="${esc(r.label)}：${f1(r.v)}${unit} · ${r.tip || ""}"/>`;
    s += `<text class="axis" x="${padL + Math.max(3, bw) + 8}" y="${y + 13}" font-size="12" fill="#0b5cff" font-weight="700">${r.v == null ? "—" : f1(r.v)}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" class="bar-anim" role="img" aria-label="维度均分横向条形图"><defs><linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b5cff"/><stop offset="1" stop-color="#2f9bff"/></linearGradient></defs>${s}</svg>`;
}
function chartDonut(kv, { size = 190 } = {}) {
  const colors = { "985": "#0b5cff", "211": "#2f9bff", "其他": "#8fb3e8", "研究机构": "#64748f", "海外": "#00c2ff" };
  const total = kv.reduce((s, x) => s + x[1], 0) || 1;
  const R = size / 2, r = R - 15, cx = R, cy = R;
  let a0 = -Math.PI / 2, segs = "";
  kv.forEach(([k, v]) => {
    const a1 = a0 + (v / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1 - 0.008), y1 = cy + r * Math.sin(a1 - 0.008);
    segs += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${colors[k] || "#93a3c0"}" stroke-width="22" data-tip="${esc(k)}：${fmt(v)} 条（${(v / total * 100).toFixed(1)}%）"/>`;
    a0 = a1;
  });
  return `<svg viewBox="0 0 ${size} ${size}" style="max-width:${size}px" role="img" aria-label="评价来源院校层级环形图">${segs}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="21" font-weight="800" fill="#0b1c3d">${fmt(total)}</text>
    <text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="10.5" fill="#93a3c0">评价总数</text></svg>`;
}
function chartRadar(items, { size = 400 } = {}) {
  const R = size / 2 - 68, cx = size / 2, cy = size / 2;
  const n = items.length;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const rr = (v / 5) * R;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a), a];
  };
  let s = "";
  for (let lv = 1; lv <= 5; lv++) {
    const poly = items.map((_, i) => pt(i, lv).slice(0, 2).map((x) => x.toFixed(1)).join(",")).join(" ");
    s += `<polygon points="${poly}" fill="none" stroke="#e2eaf7"/>`;
  }
  items.forEach((it, i) => {
    const [x, y, a] = pt(i, 5);
    s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2eaf7"/>`;
    const lx = cx + (R + 26) * Math.cos(a), ly = cy + (R + 26) * Math.sin(a);
    s += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#64748f">${esc(it.label)}</text>`;
    if (it.v != null) s += `<text x="${lx.toFixed(1)}" y="${(ly + 17).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="#0b5cff" font-weight="700">${f1(it.v)}</text>`;
  });
  const poly = items.map((it, i) => pt(i, it.v == null ? 0 : it.v).slice(0, 2).map((x) => x.toFixed(1)).join(",")).join(" ");
  s += `<polygon points="${poly}" fill="rgba(11,92,255,.16)" stroke="#0b5cff" stroke-width="2" stroke-linejoin="round"/>`;
  items.forEach((it, i) => {
    const [x, y] = pt(i, it.v == null ? 0 : it.v);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${it.v == null ? "#c3cede" : "#0b5cff"}"/>`;
  });
  return `<svg viewBox="0 0 ${size} ${size}" style="max-width:${size}px;width:100%" role="img" aria-label="导师多维画像雷达图">${s}</svg>`;
}
function sparkBars(vals, { w = 70, h = 24, color = "#0b5cff" } = {}) {
  const max = Math.max(...vals, 1);
  const bw = w / vals.length;
  return vals.map((v, i) => `<rect x="${(i * bw).toFixed(1)}" y="${(h - (v / max) * h).toFixed(1)}" width="${Math.max(1.5, bw - 1.5).toFixed(1)}" height="${Math.max(1, (v / max) * h).toFixed(1)}" rx="1" fill="${color}" opacity=".55"/>`).join("");
}

/* ---------- Markdown 轻量渲染（仅用于深挖报告） ---------- */
function mdRender(md) {
  const lines = String(md).split(/\r?\n/);
  let out = "", i = 0, inList = false;
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s（(])((?:https?:\/\/)[^\s<）)、，。；"]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  const flush = () => { if (inList) { out += "</ul>"; inList = false; } };
  while (i < lines.length) {
    const L = lines[i];
    if (/^#{1,3}\s/.test(L)) { flush(); const m = L.match(/^(#{1,3})\s+(.*)/); out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; }
    else if (/^(-{3,}|\*{3,})$/.test(L.trim())) { flush(); out += "<hr/>"; }
    else if (/^>\s?/.test(L)) { flush(); out += `<blockquote>${inline(L.replace(/^>\s?/, ""))}</blockquote>`; }
    else if (/^\|.*\|$/.test(L.trim())) {
      flush();
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { rows.push(lines[i].trim()); i++; }
      i--;
      const cells = (r) => r.slice(1, -1).split("|");
      /* |---|---| 式分隔行按内容识别：无分隔行的表格不再丢掉第一行数据 */
      const isSepRow = (r) => /^[\s|:-]+$/.test(r) && r.includes("-");
      let t = "<table><thead><tr>" + cells(rows[0]).map((c) => `<th>${inline(c.trim())}</th>`).join("") + "</tr></thead><tbody>";
      for (let r = isSepRow(rows[1] || "") ? 2 : 1; r < rows.length; r++) t += "<tr>" + cells(rows[r]).map((c) => `<td>${inline(c.trim())}</td>`).join("") + "</tr>";
      out += t + "</tbody></table>";
    }
    else if (/^[-*]\s+/.test(L)) {
      if (!inList) { flush(); out += "<ul>"; inList = true; }
      out += `<li>${inline(L.replace(/^[-*]\s+/, ""))}</li>`;
    }
    else if (/^\d+[.、]\s+/.test(L)) {
      if (!inList) { flush(); out += "<ul>"; inList = true; }
      out += `<li>${inline(L.replace(/^\d+[.、]\s+/, ""))}</li>`;
    }
    else if (L.trim() === "") { flush(); }
    else { flush(); out += `<p>${inline(L)}</p>`; }
    i++;
  }
  flush();
  return out;
}

/* ---------- 全局搜索 ---------- */
const Search = (() => {
  let rows = null, schoolsMap = null, activeIdx = -1, items = [], readyP = null, docClickBound = false;
  /* 首次触发才加载 1.4MB 索引；readyP 共享同一 Promise，并发调用不会重复拉取 */
  function ensure() {
    if (!readyP) readyP = Promise.all([
      loadJSON(API + "search.json"),
      loadJSON(API + "schools.json").then((ss) => Object.fromEntries(ss.map((s) => [s.sid, s]))),
    ]).then(([r, m]) => { rows = r; schoolsMap = m; });
    return readyP;
  }
  function attach(box) {
    const input = $("input", box), pop = $(".search-pop", box);
    let deb;
    /* 索引未就绪时先显示加载态，就绪后自动补查当前输入（不再静默丢弃首次输入） */
    async function runReady() {
      if (rows) return run();
      if (input.value.trim()) {
        pop.innerHTML = `<div class="empty">正在加载搜索索引…</div>`;
        pop.classList.add("show");
      }
      await ensure();
      if (document.activeElement !== input) return;
      if (input.value.trim()) run(); else pop.classList.remove("show");
    }
    input.addEventListener("focus", runReady);
    input.addEventListener("input", () => { clearTimeout(deb); deb = setTimeout(runReady, 120); });
    const goBtn = $(".go", box);
    if (goBtn) goBtn.addEventListener("click", async () => {
      if (!input.value.trim()) { input.focus(); pop.classList.remove("show"); return; }
      await ensure();
      run();
      if (items[0]) go(items[0]);
    });
    input.addEventListener("keydown", (e) => {
      if (!pop.classList.contains("show")) return;
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (items[activeIdx]) { go(items[activeIdx]); }
        else if (!rows && input.value.trim()) {
          /* 索引未就绪时按回车：等就绪后自动跳第一项，不再静默无响应 */
          ensure().then(() => {
            if (document.activeElement !== input || !input.value.trim()) return;
            run();
            if (items[0]) go(items[0]);
          });
        }
      }
      else if (e.key === "Escape") pop.classList.remove("show");
    });
    if (!docClickBound) {
      docClickBound = true; /* 只绑一次：反复进出首页不再累积 document 监听 */
      document.addEventListener("click", (e) => {
        $$(".search-pop.show").forEach((p) => { if (!p.parentElement.contains(e.target)) p.classList.remove("show"); });
      });
    }
    function move(d) {
      activeIdx = Math.max(0, Math.min(items.length - 1, activeIdx + d));
      $$(".item", pop).forEach((el, i) => el.classList.toggle("act", i === activeIdx));
      $$(".item", pop)[activeIdx]?.scrollIntoView({ block: "nearest" });
    }
    function go(it) { pop.classList.remove("show"); input.blur(); input.value = ""; location.hash = it.aid ? `#/school/${it.sid}/${it.aid}` : `#/school/${it.sid}`; }
    function run() {
      const q = input.value.trim().toLowerCase();
      activeIdx = -1;
      if (!q || !rows) { items = []; pop.classList.remove("show"); return; } /* 空查询也清空共享 items，杜绝跳到上一次结果 */
      const nameHit = (r) => String(r[0]).toLowerCase().includes(q) || (r[7] && String(r[7]).toLowerCase().includes(q));
      const uniHit = (r) => String(r[1]).toLowerCase().includes(q);
      const adv = rows.filter((r) => nameHit(r)).slice(0, 9);
      const advUni = q.length >= 2 ? rows.filter((r) => !nameHit(r) && uniHit(r)).slice(0, 4) : [];
      const schs = Object.values(schoolsMap || {}).filter((s) => s.name.toLowerCase().includes(q)).sort((a, b) => b.n_reviews - a.n_reviews).slice(0, 4);
      items = [];
      let html = "";
      if (schs.length) {
        html += `<div class="grp">学校 SCHOOLS</div>`;
        schs.forEach((s) => { items.push({ sid: s.sid }); html += itemHTML(`${ic("school")} <span class="nm">${esc(s.name)}</span>`, `<span class="un">${fmt(s.n_advisors)} 位导师 · ${fmt(s.n_reviews)} 条评价</span>`, ""); });
      }
      if (adv.length || advUni.length) {
        html += `<div class="grp">导师 ADVISORS</div>`;
        adv.concat(advUni).forEach((r) => {
          items.push({ sid: r[2], aid: r[3] });
          html += itemHTML(`${ic("user")} <span class="nm">${esc(r[0])}${r[7] ? "（" + esc(r[7]) + "）" : ""}</span>`, `<span class="un">${esc(r[1])}${r[5] ? " · " + r[5] + " 条评价" : " · 库内无评价"}</span>`, r[4] != null ? `<span class="rt">${pill(r[4], 1)}</span>` : "");
        });
      }
      pop.innerHTML = html || `<div class="empty">未找到「${esc(q)}」相关导师或学校</div>`;
      pop.classList.add("show");
      $$(".item", pop).forEach((el, i) => el.addEventListener("mousedown", (e) => { e.preventDefault(); if (items[i]) go(items[i]); }));
      function itemHTML(main, sub, right) { return `<div class="item">${main}${sub}${right}</div>`; }
    }
  }
  return { attach };
})();
Search.attach($("#navSearch"));

/* ---------- 移动端汉堡菜单（≤1024px 导航收进下拉面板） ---------- */
(() => {
  const burger = $("#navBurger"), links = $("#navLinks");
  if (!burger || !links) return;
  const setOpen = (open) => { links.classList.toggle("open", open); burger.setAttribute("aria-expanded", String(open)); };
  burger.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!links.classList.contains("open")); });
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".nav")) setOpen(false); });
})();

/* ---------- 表格行 / 折叠条：点击委托 + 键盘可达 ---------- */
document.addEventListener("click", (e) => {
  const tr = e.target.closest && e.target.closest("tr.clickable[data-href]");
  if (tr) location.hash = tr.dataset.href;
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = e.target.closest && (e.target.closest("tr.clickable[data-href]") || e.target.closest("[role=button][tabindex]"));
  if (el) { e.preventDefault(); el.click(); }
});

/* ---------- 收藏导师（localStorage，零后端） ---------- */
const Fav = (() => {
  const KEY = "oar_favs_v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } };
  const save = (arr) => { try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {} };
  const has = (sid, aid) => load().some((x) => x.sid === sid && x.aid === aid);
  const toggle = (snap) => {
    const arr = load();
    const i = arr.findIndex((x) => x.sid === snap.sid && x.aid === snap.aid);
    if (i >= 0) arr.splice(i, 1); else arr.push(snap);
    save(arr);
    return i < 0;
  };
  const clear = () => save([]);
  return { load, has, toggle, clear };
})();

/* ============================================================
   视图：数据大盘（首页只放核心数字与分布）
   ============================================================ */
async function viewOverview(t) {
  const [stats, schools] = await Promise.all([loadJSON(API + "stats.json"), loadJSON(API + "schools.json")]);
  if (t !== routeToken) return;
  $("#footVer").textContent = "库快照 VERSION " + stats.version;
  $("#footGen").textContent = "站点数据生成 " + stats.generated;
  const T = stats.totals;

  const dimRows = DIMS.map(([k, cn]) => ({ label: cn, v: stats.dims_avg[k], tip: "全库该维度均分（1–5）" }));
  const cateKv = Object.entries(stats.cate).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const qDone = T.deep_done, qTotal = T.queue_total, aiTotal = T.ai_total;
  const qPct = Math.round((qDone / aiTotal) * 100);

  const app = $("#app");
  app.innerHTML = `
  <div class="wrap fade-in">

    <!-- Hero -->
    <section class="hero">
      <span class="kicker"><span class="dot"></span>开源 · 面向 AI 学生 · 专挖最新风评 ｜ 数据版本 ${esc(stats.version)}</span>
      <h1>选导师之前，<br>先看<span class="grad">证据与信号</span>。</h1>
      <p class="sub">给 <b>AI 方向学生</b>做的择导师工具：底下有 ${fmt(T.reviews)} 条匿名评价存档和 ${fmt(T.roster)} 条官方师资名录垫着，但我们花力气最多的，是<b>去某乎、小某书和官方页面挖最新的风评</b>。存档大多停在 2020 年，而导师的口碑是会变的——<b>新，是这里的第一优先级</b>；每一分都能查到出处。</p>
      <div class="hero-search" id="heroSearch">
        <svg class="s-ico" width="20" height="20"><use href="#i-search"/></svg>
        <input type="text" placeholder="输入导师姓名或学校，如「卢湖川」「哈尔滨工业大学」…" autocomplete="off" spellcheck="false">
        <div class="search-pop"></div>
        <button class="go">搜 索</button>
      </div>
      <div class="hot-tags">热门：
        <a href="#/school/${stats.top[0]?.sid || ""}">${esc(stats.top[0]?.supervisor || "")}（高分样本）</a>
        <a href="#/school/${schools[0]?.sid || ""}">${esc(schools[0]?.name || "")}</a>
        <a href="#/school/${schools.find(s=>s.name.includes("西安交通大学"))?.sid || schools[1]?.sid || ""}">${esc((schools.find(s=>s.name.includes("西安交通大学"))||schools[1]||{}).name || "")}</a>
      </div>
      <div class="disclaimer-strip">${ic("alert", 15)}<span><b>这里只摆证据，不下结论——不会告诉你「该报」或「不该报」某位导师。</b>实习、退学这类信号来自匿名网络评价，未经证实；方向前景是 AI 打的参考分，不是客观事实。只要有负面说法我们就计入（宁可保守），但成因复杂，请务必自己再核实。</span></div>
    </section>
    <!-- KPI -->
    <section class="sec">
      <div class="sec-h"><span class="bar"></span><span class="zh">数据大盘</span><span class="en">Overview</span><span class="desc">数字和图表出自同一份数据：评价存档、官方名录，加上从某乎/小某书/官方页挖来的最新风评</span></div>
      <div class="kpis">
        <div class="kpi"><div class="lab">${ic("user")} 名录导师</div><div class="num" data-n="${T.roster}">0</div><div class="sub">官方师资页口径 · 已覆盖 ${fmt(T.roster_schools || 0)} 所</div><svg class="spark" aria-hidden="true" width="70" height="24" viewBox="0 0 70 24">${sparkBars([3, 5, 4, 7, 6, 9, 8])}</svg></div>
        <div class="kpi"><div class="lab">${ic("school")} 覆盖高校</div><div class="num" data-n="${T.schools}">0</div><div class="sub">含港澳与海外院校</div></div>
        <div class="kpi"><div class="lab">${ic("doc")} 原始评价</div><div class="num" data-n="${T.reviews}">0</div><div class="sub">${esc(stats.sources["urfire_2022"] ? "导师评价网+大查查存档" : "公开存档")}</div></div>
        <div class="kpi"><div class="lab">${ic("radar")} 出分导师</div><div class="num" data-n="${T.scored}">0</div><div class="sub">有一条评价就出综合分${T.profile_scored ? `；另有 ${fmt(T.profile_scored)} 位零口碑导师出了 AI 资料初评分` : ""}</div></div>
        <div class="kpi red"><div class="lab">${ic("flag")} 负分评分卡</div><div class="num" data-n="${T.negative}">0</div><div class="sub">多为退学、不放实习类信号</div></div>
        <div class="kpi"><div class="lab">${ic("check")} 深挖调研完成</div><div class="num" data-n="${T.deep_done}">0</div><div class="sub">目标覆盖 ${fmt(aiTotal)} 位 AI 导师</div></div>
      </div>
      <div class="queue-prog">
        <span>AI 导师调研覆盖（合计）</span>
        <div class="track"><div class="fill" style="width:0%" data-w="${qPct}"></div></div>
        <span class="mono" style="font-family:var(--mono)">已完成 ${fmt(qDone)} / ${fmt(aiTotal)} 位（${qPct}%）· 调研报告 ${fmt(T.reports)} 份 · 两批滚动推进</span>
      </div>
      <div class="queue-prog">
        <span style="min-width:168px">└ 深挖批 · 全网深扒流程</span>
        <div class="track"><div class="fill" style="width:0%;background:linear-gradient(90deg,#0b5cff,#0b5cff)" data-w="${Math.min(100, Math.round((T.deep_a || 0) / aiTotal * 100))}"></div></div>
        <span class="mono" style="font-family:var(--mono)">${fmt(T.deep_a || 0)} 位 · 重点导师逐人深调研（官方+学术+风评+实习退学专项）</span>
      </div>
      <div class="queue-prog">
        <span style="min-width:168px">└ 轻调研批 · 快速核查</span>
        <div class="track"><div class="fill" style="width:0%;background:#7fb0ff" data-w="${Math.min(100, Math.round((T.deep_b || 0) / aiTotal * 100))}"></div></div>
        <span class="mono" style="font-family:var(--mono)">${fmt(T.deep_b || 0)} 位 · 长尾导师官方确认+风评抽查</span>
      </div>
    </section>
    <!-- 图表 -->
    <section class="sec">
      <div class="sec-h"><span class="bar"></span><span class="zh">评分与证据分布</span><span class="en">Distribution</span></div>
      <div class="grid-2">
        <div class="card"><div class="card-h"><span class="zh">综合分分布</span><span class="en">Composite Histogram</span><span class="more" style="color:var(--faint);font-size:12px">红色是负分：触发了红线扣分</span></div>
          <div class="card-b">${chartHist(stats.composite_hist)}</div></div>
        <div class="card"><div class="card-h"><span class="zh">评价年份分布</span><span class="en">Review Timeline</span><span class="more" style="color:var(--faint);font-size:12px">存档大多停在 2020</span></div>
          <div class="card-b">${chartTimeline(stats.timeline)}
            ${stats.timeline_social && stats.timeline_social.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)">
              <div style="font-size:12px;color:var(--muted);margin-bottom:2px">深挖补到的新证据（某乎 / 小某书 / 官方页，共 ${fmt(stats.timeline_social.reduce((s2, b) => s2 + b.n, 0))} 条）</div>
              ${chartTimeline(stats.timeline_social, { h: 104, cyan: true, tipWord: "条新证据" })}
            </div>` : ""}
          </div></div>
        <div class="card"><div class="card-h"><span class="zh">全库六维口碑均分</span><span class="en">Dimension Averages</span></div>
          <div class="card-b">${chartHbar(dimRows)}<div style="font-size:12px;color:var(--faint);margin-top:6px">按评价用词打 1–5 分；「不清楚」这类不算数；「自证认识」一维只用于确认评价真实性，不计入均分</div></div></div>
        <div class="card"><div class="card-h"><span class="zh">评价来源院校层级</span><span class="en">By Institution Tier</span></div>
          <div class="card-b" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
            ${chartDonut(cateKv)}
            <div style="flex:1;min-width:180px">${cateKv.map(([k, v]) => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dashed var(--line-2);font-size:13px"><i style="width:9px;height:9px;border-radius:3px;display:inline-block;background:${({ "985": "#0b5cff", "211": "#2f9bff", "其他": "#8fb3e8", "研究机构": "#64748f", "海外": "#00c2ff" })[k] || "#93a3c0"}"></i>${esc(k)}<span style="margin-left:auto;font-family:var(--mono);color:var(--muted)">${(v / stats.totals.reviews * 100).toFixed(1)}%</span></div>`).join("")}</div>
          </div></div>
      </div>
    </section>
    <!-- 快捷入口 -->
    <section class="sec">
      <div class="quick-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        <a class="card quick" href="#/schools">
          <div class="t">${ic("school")} 学校榜单 <span class="arr">${ic("arrow")}</span></div>
          <div class="d">${fmt(schools.length)} 所学校，按评价量 / 均分 / 负分卡排序，点进去看每位导师</div>
        </a>
        <a class="card quick" href="#/method">
          <div class="t">${ic("radar")} 评分方法论 <span class="arr">${ic("arrow")}</span></div>
          <div class="d">分数怎么算、红线怎么扣、数据从哪来、全学科扩展怎么做——都在这页</div>
        </a>
        <a class="card quick" href="#/contact">
          <div class="t">${ic("user")} 加入我们 <span class="arr">${ic("arrow")}</span></div>
          <div class="d">调研、扩学科、写代码、审标准——缺人，来了就署名</div>
        </a>
      </div>
    </section>
  </div>`;

  /* hero 搜索复用 */
  Search.attach($("#heroSearch"));
  /* 进度条动画 */
  setTimeout(() => { const f = $(".queue-prog .fill"); if (f) f.style.width = f.dataset.w + "%"; }, 150);
  bootCountUps(app);
}

/* ============================================================
   视图：学校榜单（独立页，按学科切换）
   ============================================================ */
async function viewSchools(t) {
  const schools = await loadJSON(API + "schools.json");
  if (t !== routeToken) return;
  const BUCKETS = ["LLM/大模型", "CV/NLP经典", "机器人/具身", "传统ML/挖掘", "网络安全/系统", "其他CS方向", "电子信息/通信", "自动化/控制", "其他学科（非AI）"];
  const bucketChips = [["ai", "AI 方向汇总"], ...BUCKETS.map((b) => [b, b])];
  const rankModes = [
    ["reviews", "按评价量"], ["scored", "按出分规模"], ["avg", "按平均分"], ["neg", "按负分卡数"],
  ];
  let st = { bucket: "ai", rankMode: "reviews", rankAll: false, rankQ: "" };

  const statOf = (s) => st.bucket === "ai" ? s.ai : (st.bucket === "" ? s : (s.buckets || {})[st.bucket]);

  window._rankRender = () => {
    let list = schools.filter((s) => {
      const d = statOf(s);
      return d && d.n_reviews > 0;
    });
    if (st.rankQ) list = list.filter((s) => s.name.includes(st.rankQ));
    if (st.rankMode === "avg") list = list.filter((s) => (statOf(s).n_scored || 0) >= 3); /* 样本太少的均分没有比较意义 */
    const sorters = {
      reviews: (a, b) => statOf(b).n_reviews - statOf(a).n_reviews,
      scored: (a, b) => statOf(b).n_scored - statOf(a).n_scored,
      avg: (a, b) => (statOf(b).avg_composite || -9) - (statOf(a).avg_composite || -9),
      neg: (a, b) => statOf(b).n_negative - statOf(a).n_negative,
    };
    list.sort(sorters[st.rankMode]);
    if (!st.rankAll) list = list.slice(0, 15);
    const maxAvg = 5;
    $("#rankBody").innerHTML = list.map((s, i) => {
      const d = statOf(s);
      return `
      <tr class="clickable" role="link" tabindex="0" data-href="#/school/${s.sid}">
        <td class="num" style="color:var(--faint)">${i + 1}</td>
        <td><span class="name">${esc(s.name)}</span></td>
        <td>${cateChip(s.cate)}${qsBadge(s.name)}</td>
        <td class="num">${fmt(d.n_advisors)}</td>
        <td class="num">${fmt(d.n_reviews)}</td>
        <td class="num">${fmt(d.n_scored)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="mini-bar" style="width:64px"><i style="width:${Math.max(2, ((d.avg_composite || 0) / maxAvg) * 100)}%" class="${d.avg_composite < 0 ? "neg" : ""}"></i></div>
            <span class="num" style="font-size:12.5px">${d.avg_composite == null ? "—" : f1(d.avg_composite)}</span>
          </div>
        </td>
        <td class="num" style="color:${d.n_negative ? "var(--danger)" : "var(--faint)"}">${d.n_negative ? fmt(d.n_negative) : "—"}</td>
        <td class="num" style="font-size:12px;color:var(--faint)">${d.n_deep_done ? fmt(d.n_deep_done) : "—"}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="9"><div class="empty-state">当前学科下没有满足条件的学校${st.rankMode === "avg" ? "（均分排序要求至少 3 位出分导师）" : ""}</div></td></tr>`;
    $("#rankCount").textContent = fmt(list.length);
  };

  const app = $("#app");
  app.innerHTML = `
  <div class="wrap fade-in">
    <div class="crumb"><a href="#/">数据大盘</a><span class="sep">/</span><span class="cur">学校榜单</span></div>
    <div class="sec-h" style="margin-top:18px"><span class="bar"></span><span class="zh">学校榜单</span><span class="en">Schools · ${fmt(schools.length)}</span><span class="desc">先选学科再看榜——总榜会被没出分的老师和别的学科拉偏</span></div>
    <div class="card">
      <div class="card-b" style="padding-top:14px">
        <div class="toolbar">
          <div class="fchips" id="bucketTabs">${bucketChips.map(([k, lab]) => `<span class="fchip${k === st.bucket ? " on" : ""}" role="button" tabindex="0" data-k="${k}">${lab}</span>`).join("")}<span class="fchip" role="button" tabindex="0" data-k="">全部学科</span></div>
        </div>
        <div class="toolbar">
          <div class="fchips" id="rankTabs">${rankModes.map(([k, lab]) => `<span class="fchip${k === st.rankMode ? " on" : ""}" role="button" tabindex="0" data-k="${k}">${lab}</span>`).join("")}</div>
          <input type="text" id="rankQ" placeholder="筛选学校名…" style="margin-left:auto">
          <button class="btn sm" id="rankMore">显示全部</button>
          <span style="font-size:12.5px;color:var(--muted)">显示 <b id="rankCount">—</b> 所</span>
        </div>
        <div class="tbl-wrap" style="max-height:560px">
          <table class="tbl">
            <thead><tr><th>#</th><th>学校</th><th>层级</th><th>导师数</th><th>评价数</th><th>出分</th><th>平均综合分</th><th>负分卡</th><th>深挖done</th></tr></thead>
            <tbody id="rankBody"></tbody>
          </table>
        </div>
        <div style="font-size:12px;color:var(--faint);margin-top:10px">「AI 方向汇总」只统计六个 AI 相关学科（LLM / CV·NLP / 机器人 / 传统ML / 网安 / 其他CS）的导师；均分排序只收至少 3 位出分导师的学校，样本太少的均分不作数。数字都只算当前所选学科，点学校进去可再按方向筛人。</div>
      </div>
    </div>
  </div>`;
  $("#rankQ").addEventListener("input", (e) => { st.rankQ = e.target.value.trim(); window._rankRender(); });
  $("#rankMore").addEventListener("click", (e) => { st.rankAll = !st.rankAll; e.target.textContent = st.rankAll ? "只显示前 15" : "显示全部"; window._rankRender(); });
  $$("#rankTabs .fchip").forEach((t) => t.addEventListener("click", () => {
    st.rankMode = t.dataset.k;
    $$("#rankTabs .fchip").forEach((x) => x.classList.toggle("on", x === t));
    window._rankRender();
  }));
  $$("#bucketTabs .fchip").forEach((t) => t.addEventListener("click", () => {
    st.bucket = t.dataset.k;
    $$("#bucketTabs .fchip").forEach((x) => x.classList.toggle("on", x === t));
    window._rankRender();
  }));
  window._rankRender();
}

/* ============================================================
   视图：方法论（项目定位 + 口径 + 学科配置）
   ============================================================ */
async function viewMethod(t) {
  const stats = await loadJSON(API + "stats.json");
  if (t !== routeToken) return;
  $("#footVer").textContent = "库快照 VERSION " + stats.version;
  $("#footGen").textContent = "站点数据生成 " + stats.generated;
  const T = stats.totals;
  const DP = stats.disciplines || { current: "ai", profiles: {} };
  const profRows = Object.entries(DP.profiles || {}).map(([id, p]) => `
    <div style="display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px dashed var(--line-2);flex-wrap:wrap">
      <span class="chip ${p.status === "active" ? "tierA" : "tierC"}">${p.status === "active" ? "已启用" : "预留位"}</span>
      <b style="width:76px">${esc(p.name)}</b>
      <span style="font-size:12.5px;color:var(--muted);flex:1;min-width:200px">${esc(p.rubric || p.note || "")}</span>
    </div>`).join("");
  const NAMES = { bio: "生物", med: "医学", mat: "材料", econ: "经管", hss: "人文社科" };
  const planned = Object.keys(NAMES).filter((k) => !(DP.profiles || {})[k]).map((k) => NAMES[k]);

  const app = $("#app");
  app.innerHTML = `
  <div class="wrap fade-in">
    <div class="crumb"><a href="#/">数据大盘</a><span class="sep">/</span><span class="cur">评分方法论</span></div>
    <div class="sec-h" style="margin-top:18px"><span class="bar"></span><span class="zh">评分方法论</span><span class="en">Methodology</span><span class="desc">口径全部开源，改标准凭证据重算</span></div>
    <!-- 项目定位与共建 -->
    <section class="sec" id="scope">
      <div class="sec-h"><span class="bar"></span><span class="zh">项目定位</span><span class="en">Scope &amp; Contribution</span></div>
      <div class="grid-2">
        <div class="card" style="border-color:#c3d8ff;background:linear-gradient(180deg,#eaf1ff, #ffffff 60%)">
          <div class="card-h"><span class="zh">${ic("radar")} 面向 AI 方向学生</span><span class="en">For AI Students</span></div>
          <div class="card-b" style="font-size:13.5px;line-height:1.8;color:var(--ink-2)">
            项目的长期目标是<b>覆盖全学科</b>——打分框架里，口碑、实习、退学这些维度全学科通用，唯独「方向前途」的打分表按学科各配一套。现在启用的是 <b>AI 这套</b>，站在 AI 学生的立场打分。方向前景的基准表：LLM 相关 3.5、CV/NLP 经典 3、传统机器学习 2.5、传统优化 2；然后再看导师近 5 年的研究跟不跟得上主流方向，跟不上就往下减。目前覆盖计算机、智能科学、机器人这些 AI 相关院系。至于实习、退学这类硬信号，对哪个学科都是同一套标准。<br><b>深挖最看重的是「新」</b>：存档评价大多停在 2020 年，但导师的口碑会变——我们优先去挖近几年某乎、小某书、官方页面上的新说法；哪几年实在挖不到，就照实标出来；老评价记作 [旧评]，不替谁辩解。
          </div>
        </div>
        <div class="card">
          <div class="card-h"><span class="zh">${ic("user")} 其他领域 · 欢迎共建</span><span class="en">Join Us</span></div>
          <div class="card-b" style="font-size:13.5px;line-height:1.8;color:var(--ink-2)">
            目前的深挖只做了 AI 方向。如果你是<b>别的学科</b>（生物、医学、材料、经管、人文……）的同学，想把这套「摆证据、说得清」的做法搬到自己领域，非常欢迎——数据和评分标准都是开源的，直接来就行。
            <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
              <a class="btn primary" href="${esc(CONTACT.github)}" target="_blank" rel="noopener">${ic("github", 14)} GitHub 提 Issue / PR</a>
              ${CONTACT.email ? `<a class="btn" href="mailto:${esc(CONTACT.email)}">${ic("link", 13)} ${esc(CONTACT.email)}</a>` : `<span class="chip">或直接联系项目作者</span>`}
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- 方法论 -->
    <section class="sec" id="method">
      <div class="sec-h"><span class="bar"></span><span class="zh">评分口径与红线</span><span class="en">Formula &amp; Red-lines</span><span class="desc">全部口径开源，评分标准变更可凭证据重算</span></div>
      <div class="method-grid">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card"><div class="card-h"><span class="zh">综合分公式</span><span class="en">Formula</span></div>
            <div class="card-b">
              <div class="formula-box">综合分 = ( <span class="hl">七维口碑均分</span>×<span class="wg">0.55</span> + <span class="hl">实习放行</span>×<span class="wg">0.15</span> + <span class="hl">退学风险</span>×<span class="wg">0.15</span> + <span class="hl">方向前途(按AI)</span>×<span class="wg">0.15</span> ) / Σ权重<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;− <span style="color:#ff8a8d">红线阶梯扣分</span><br><span style="color:#7d93bd">// 有一条评价就计分；缺的项按剩余权重折算；只有综合分可能是负的</span></div>
              <ul class="rule-list" style="margin-top:10px">
                <li>${ic("check")}七维口碑：其中「自证认识」一维只用于确认评价真实性、不计分；学术水平、科研经费、学生补助、师生关系、工作时间、学生前途这六维按评价原文的用词打 1–5 分。</li>
                <li>${ic("check")}实习放行：看正反说法各有多少条；嘴上说放、实际项目多到走不开的，按受限算。</li>
                <li>${ic("check")}方向前途：按方向基准分打（LLM 相关 3.5、CV/NLP 3、传统机器学习 2.5、传统优化 2），再看导师近 5 年的研究贴不贴主赛道，不贴就减分。</li>
              </ul>
            </div>
          </div>
          <div class="card"><div class="card-h"><span class="zh">红线阶梯扣分（叠加制）</span><span class="en">Red-line Ladder</span></div>
            <div class="card-b"><div class="ladder">
              <div class="it"><span class="pt">−1</span><span>不放实习 / 实习严重受限（internship ≤ 2）</span></div>
              <div class="it"><span class="pt">−2.5</span><span>延毕指控 · 硕士层级（从评价原文上下文分类）</span></div>
              <div class="it"><span class="pt">−1.5</span><span>延毕指控 · 博士层级（层级不明按此档；退学与延毕不叠加）</span></div>
              <div class="it"><span class="pt">−6</span><span>退学 / 劝退 / 转导师类词硬信号（多源命中触发）</span></div>
            </div>
            <div style="font-size:12px;color:var(--faint);margin-top:10px">举个例子：不放实习又碰上退学硬信号，一共扣 7 分。负分卡会把每个触发项都列出来。</div>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card"><div class="card-h"><span class="zh">采信原则与红线</span><span class="en">Trust Rules</span></div>
            <div class="card-b"><ul class="rule-list">
              <li>${ic("alert")}<span><b>一条负面也算数</b>：选导师是人生大事，宁可把话说重些；而且旧负面不会因为过了几年就自动翻篇。</span></li>
              <li>${ic("alert")}<span><b>不下结论</b>：只摆证据，绝不说「该报 / 不该报」；最多标注「⚠ 谨慎信号」这样的状态提示。</span></li>
              <li>${ic("alert")}<span><b>学术数据只用权威来源</b>：DBLP / Semantic Scholar / OpenReview / 官方页面；转载站的数据不拿来打分。</span></li>
              <li>${ic("clock")}<span><b>时间必须交代清楚</b>：每张卡写明生成时间、评价的时间范围、调研截止日期；六年以上的算 [旧评]，哪几年挖不到就直说。</span></li>
              <li>${ic("alert")}<span><b>师德类指控只给官方链接</b>，不复述细节、不做推测；学生姓名只用来计数，绝不展示。</span></li>
              <li>${ic("radar")}<span><b>AI 打的分会标明</b>：方向前途是 AI 判断，不是客观测量，和口碑分数分开看。</span></li>
            </ul></div>
          </div>
          <div class="card"><div class="card-h"><span class="zh">数据来源与版本</span><span class="en">Sources</span></div>
            <div class="card-b"><ul class="rule-list">
              <li>${ic("doc")}<span>匿名评价存档：导师评价网（urfire, 2022 快照）${fmt(stats.sources["urfire_2022"] || 0)} 条 + 大查查（2024 快照）${fmt(stats.sources["dachacha_2024"] || 0)} 条。</span></li>
              <li>${ic("school")}<span>官方师资名录 ${fmt(T.roster)} 条：只从学校官方院系页抓取，每条带确认日期，超过一年没复核的会标出来。目前名录深挖覆盖 ${fmt(T.roster_schools || 0)} 所院校（${fmt(T.schools)} 所中的重点校）；其余学校的页面只列出评价存档中出现过的导师，不代表该校全部师资，名录在陆续补采。</span></li>
              <li>${ic("check")}<span><b>全网深挖已完成 ${fmt(T.deep_done)} 人——这是本项目的重心：专挖近三年的新评论和官方最新动态</b>，把存档断档的那几年补上；证据和结论分开存，以后改标准不用重新调查。</span></li>
              <li>${ic("clock")}<span>库快照 VERSION <b class="mono" style="font-family:var(--mono)">${esc(stats.version)}</b> · 站点构建 ${esc(stats.generated)}。</span></li>
            </ul></div>
          </div>
        </div>
      </div>
    </section>
    <!-- 学科配置 -->
    <section class="sec">
      <div class="sec-h"><span class="bar"></span><span class="zh">学科打分配置</span><span class="en">Discipline Profiles</span><span class="desc">口碑、实习、退学全学科通用；方向前途的打分表按学科各配一套</span></div>
      <div class="card"><div class="card-b" style="padding-top:8px">
        ${profRows}
        ${planned.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center"><span style="font-size:12.5px;color:var(--muted)">预留学科位（等共建者定标后启用）：</span>${planned.map((n) => `<span class="chip tierC">${esc(n)}</span>`).join("")}</div>` : ""}
        <div style="font-size:12.5px;color:var(--faint);margin-top:10px">想给某个学科定这张表？去 <a href="#/contact">加入我们</a> 联系作者。</div>
      </div></div>
    </section>
  </div>`;
}

/* 信号榜行内样式补充（动态注入一次） */
(function () {
  const st = document.createElement("style");
  st.textContent = `.sig-row{display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px dashed var(--line-2);cursor:pointer;border-radius:8px}
  .sig-row:hover{background:#f5f9ff}.sig-row .nm{font-weight:700;font-size:13.5px}.sig-row .un{color:var(--muted);font-size:12.5px}
  .pill.sm{min-width:44px;font-size:12.5px;padding:2px 8px}`;
  document.head.appendChild(st);
})();

/* ============================================================
   视图二：学校页
   ============================================================ */
async function viewSchool(sid, t) {
  const app = $("#app");
  app.innerHTML = `<div class="loading"><div class="ring"></div>加载学校数据…</div>`;
  let data;
  try { data = await loadJSON(API + "school/" + sid + ".json"); }
  catch (e) { if (t === routeToken) app.innerHTML = `<div class="wrap"><div class="empty-state" style="padding-top:80px">未找到该学校（数据可能尚未构建）<br><br><a href="#/">← 返回总览</a></div></div>`; return; }
  if (t !== routeToken) return;
  const m = data.meta, list = data.advisors;
  document.title = `${m.name} · ${SITE_TITLE}`;
  $("#footVer").textContent = "库快照 VERSION " + (await loadJSON(API + "stats.json")).version;
  if (t !== routeToken) return;

  /* 过滤与排序状态 */
  let st = { q: "", sort: "composite", dir: "", dept: "", filters: new Set() };
  const deptCount = {};
  list.forEach((x) => { const d = (x.departments || [])[0]; if (d) deptCount[d] = (deptCount[d] || 0) + 1; });
  const deptOpts = Object.entries(deptCount).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"));
  const DIR_ORDER = ["LLM/大模型", "CV/NLP经典", "机器人/具身", "传统ML/挖掘", "网络安全/系统", "其他CS方向", "电子信息/通信", "自动化/控制", "其他学科（非AI）", "未标注"];
  const sorts = [
    ["composite", "综合分 ↓"], ["n", "评价数 ↓"], ["academics", "学术水平 ↓"],
    ["relationship", "师生关系 ↓"], ["stipend", "学生补助 ↓"], ["rate", "网评 rate ↓"], ["flag", "红线信号优先"],
  ];
  const filters = [
    ["scored", "仅出分"], ["neg", "负分卡"], ["hard", "退学硬信号"], ["report", "有深挖报告"], ["ai", "AI 方向"],
  ];
  const render = () => {
    let rows = list.slice();
    if (st.q) rows = rows.filter((a) => a.supervisor.includes(st.q) || (a.alias && a.alias.includes(st.q)) || (a.departments || []).join().includes(st.q) || (a.roster && (a.roster.areas || []).join().includes(st.q)));
    if (st.filters.has("scored")) rows = rows.filter((a) => a.composite != null);
    if (st.filters.has("neg")) rows = rows.filter((a) => a.composite != null && a.composite < 0);
    if (st.filters.has("hard")) rows = rows.filter((a) => a.dropout.hard);
    if (st.filters.has("report")) rows = rows.filter((a) => a.report || a.synthesis);
    if (st.filters.has("ai")) rows = rows.filter((a) => a.tier === "ai_core" || a.tier === "ai_signal");
    if (st.dir) rows = rows.filter((a) => a.dir_bucket === st.dir);
    if (st.dept) rows = rows.filter((a) => (a.departments || [])[0] === st.dept);
    const key = {
      composite: (a) => (a.composite == null ? -999 : a.composite),
      n: (a) => a.n_reviews,
      academics: (a) => (a.dims.academics == null ? -1 : a.dims.academics),
      relationship: (a) => (a.dims.relationship == null ? -1 : a.dims.relationship),
      stipend: (a) => (a.dims.stipend == null ? -1 : a.dims.stipend),
      rate: (a) => (a.rate_avg == null ? -1 : a.rate_avg),
      flag: (a) => (a.dropout.hard ? 1e6 + a.dropout.mentions : (a.dropout.mentions || 0) * 100 + (a.internship.score != null && a.internship.score <= 2 ? 50 : 0)),
    }[st.sort];
    rows.sort((a, b) => key(b) - key(a) || a.supervisor.localeCompare(b.supervisor, "zh"));
    $("#advBody").innerHTML = rows.map((a) => advRow(a)).join("") || `<tr><td colspan="8"><div class="empty-state">没有匹配的导师</div></td></tr>`;
    $("#advCount").textContent = `${fmt(rows.length)} / ${fmt(list.length)}`;
  };
  const advRow = (a) => {
    const areas = (a.roster && a.roster.areas || []).slice(0, 3).join("、");
    const title = a.roster && a.roster.title || "";
    return `
    <tr class="clickable" role="link" tabindex="0" data-href="#/school/${sid}/${a.id}">
      <td><div style="display:flex;align-items:center;gap:9px">
        <span style="width:30px;height:30px;border-radius:8px;background:var(--grad);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;flex:none">${esc(a.supervisor.trim()[0] || "?")}</span>
        <span><span class="name">${esc(a.supervisor)}</span>${a.alias ? `<span class="sub" style="display:inline-block;margin-left:4px;color:var(--muted)">${esc(a.alias)}</span>` : ""}<span class="sub" style="display:block">${a.n_reviews ? fmt(a.n_reviews) + " 条评价" : "库内无评价"}</span></span>
      </div></td>
      <td style="max-width:150px"><span class="sub" style="display:block;font-size:12px;color:var(--muted)">${esc((a.departments || [])[0] || "—")}</span><span class="sub">${esc(title || "")}</span></td>
      <td style="max-width:190px;font-size:12px;color:var(--muted)"><span class="chip" style="font-size:11px;padding:1px 8px;margin-right:6px">${esc(a.dir_bucket || "未标注")}</span>${areas ? esc(areas.length > 20 ? areas.slice(0, 20) + "…" : areas) : ""}</td>
      <td>${pill(a.composite)}${a.basis === "testimony" ? `<span class="sub" style="display:block;font-size:10.5px;color:var(--ok)">知情证言计入</span>` : a.basis === "profile" ? `<span class="sub" style="display:block;font-size:10.5px;color:var(--muted)">AI 资料初评</span>` : a.penalty ? `<span class="sub" style="display:block;font-size:10.5px;color:var(--danger)">红线 ${f1(-a.penalty)}</span>` : ""}</td>
      <td class="num">${a.base != null ? f1(a.base) : "—"}</td>
      <td class="num">${a.rate_avg != null ? f1(a.rate_avg) : "—"}</td>
      <td><div style="display:flex;gap:5px;flex-wrap:wrap">${signalFlags(a) || '<span class="sub">—</span>'}</div></td>
      <td>${researchChip(a) || aiChip(a) || '<span class="sub">—</span>'}</td>
    </tr>`;
  };

  const hist = list.filter((a) => a.composite != null).map((a) => a.composite);
  const bins = {};
  hist.forEach((c) => { const b = c < 0 ? Math.ceil(c) - 1 : Math.floor(c); bins[b] = (bins[b] || 0) + 1; });

  app.innerHTML = `
  <div class="wrap fade-in">
    <div class="crumb"><a href="#/">数据大盘</a><span class="sep">/</span><span class="cur">${esc(m.name)}</span></div>
    <div class="sch-head">
      <div class="sch-ava">${esc(m.name.trim()[0])}</div>
      <div style="flex:1">
        <h1>${esc(m.name)} ${cateChip(m.cate)} ${qsBadge(m.name)}</h1>
        <div class="meta">
          <span class="chip">${ic("user")} 库内导师 ${fmt(m.n_advisors)}</span>
          <span class="chip">${ic("doc")} 评价 ${fmt(m.n_reviews)} 条</span>
          <span class="chip">出分 ${fmt(m.n_scored)}</span>
          <span class="chip">深挖完成 ${fmt(m.n_deep_done)}${m.roster_total ? ` / 名录 ${fmt(m.roster_total)}` : ""}</span>
        </div>
      </div>
    </div>
    <div class="sch-kpis">
      <div class="kpi"><div class="lab">平均综合分</div><div class="num" style="color:${m.avg_composite < 1 ? "var(--danger)" : "var(--brand-deep)"}">${m.avg_composite == null ? "—" : f1(m.avg_composite)}</div></div>
      <div class="kpi red"><div class="lab">负分评分卡</div><div class="num">${fmt(m.n_negative)}</div><div class="sub">红线惩罚触发</div></div>
      <div class="kpi"><div class="lab">退学硬信号</div><div class="num">${fmt(m.n_hardflag)}</div><div class="sub">未经证实评价统计</div></div>
      <div class="kpi" style="grid-column:span 3"><div class="lab">本校综合分分布</div>
        <div style="margin-top:6px">${chartHist(Object.keys(bins).map((b) => ({ bin: +b, n: bins[b] })).sort((a, b) => a.bin - b.bin), { h: 90 })}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-b" style="padding-top:14px">
        <div class="toolbar">
          <input type="text" id="advQ" placeholder="校内搜索导师/方向…" value="${esc(st.q)}">
          <select id="advDir"><option value="">全部方向</option>${DIR_ORDER.filter(d => list.some(a => a.dir_bucket === d)).map(d => `<option value="${d}"${d === st.dir ? " selected" : ""}>${d}（${list.filter(a => a.dir_bucket === d).length}）</option>`).join("")}</select>
          <select id="advDept"><option value="">全部学院</option>${deptOpts.map(([d, n]) => `<option value="${esc(d)}"${d === st.dept ? " selected" : ""}>${esc(d.length > 22 ? d.slice(0, 22) + "…" : d)}（${n}）</option>`).join("")}</select>
          <select id="advSort">${sorts.map(([k, lab]) => `<option value="${k}"${k === st.sort ? " selected" : ""}>${lab}</option>`).join("")}</select>
          <div class="fchips">${filters.map(([k, lab, d]) => `<span class="fchip${d ? " danger" : ""}" role="button" tabindex="0" data-k="${k}">${lab}</span>`).join("")}</div>
          <span style="margin-left:auto;font-size:12.5px;color:var(--muted)">显示 <b id="advCount">—</b> 位导师</span>
        </div>
        <div class="tbl-wrap" style="max-height:640px">
          <table class="tbl">
            <thead><tr><th>导师</th><th>院系/职称</th><th>研究方向</th><th>综合分</th><th>基础分</th><th>网评rate</th><th>信号</th><th>调研</th></tr></thead>
            <tbody id="advBody"></tbody>
          </table>
        </div>
        <div style="font-size:12px;color:var(--faint);margin-top:10px">「基础分」是还没扣红线的口碑分；综合分为负，说明触发了红线扣分。点行进入导师评分卡。</div>
      </div>
    </div>
    <div class="disclaimer-strip" style="margin-top:20px">${ic("alert", 15)}<span>本校信息来自公开存档和官方名录；「退学硬信号」这些只是匿名评价的统计，未经证实，也不构成对任何导师的定论。${m.roster_total ? "" : "<b>本校暂未采集官方师资名录</b>——下列导师仅来自评价存档（即有过评价的老师），不是完整师资名单，空缺是采集进度问题，请以学校官网为准。"}</span></div>
  </div>`;
  $("#advQ").addEventListener("input", (e) => { st.q = e.target.value.trim(); render(); });
  $("#advSort").addEventListener("change", (e) => { st.sort = e.target.value; render(); });
  $("#advDir").addEventListener("change", (e) => { st.dir = e.target.value; render(); });
  $("#advDept").addEventListener("change", (e) => { st.dept = e.target.value; render(); });
  $$(".fchips .fchip", app).forEach((t) => t.addEventListener("click", () => {
    const k = t.dataset.k;
    st.filters.has(k) ? st.filters.delete(k) : st.filters.add(k);
    t.classList.toggle("on");
    render();
  }));
  render();
}

/* ============================================================
   视图三：导师详情（详细评分 + 为什么这样打分）
   ============================================================ */
async function viewAdvisor(sid, aid, t) {
  const app = $("#app");
  app.innerHTML = `<div class="loading"><div class="ring"></div>加载评分卡…</div>`;
  let data;
  try { data = await loadJSON(API + "school/" + sid + ".json"); }
  catch (e) { if (t === routeToken) app.innerHTML = `<div class="wrap"><div class="empty-state" style="padding-top:80px">未找到该页面<br><br><a href="#/">← 返回总览</a></div></div>`; return; }
  if (t !== routeToken) return;
  const a = data.advisors.find((x) => x.id === aid);
  if (!a) { if (t === routeToken) app.innerHTML = `<div class="wrap"><div class="empty-state" style="padding-top:80px">未找到该导师<br><br><a href="#/school/${sid}">← 返回学校页</a></div></div>`; return; }
  const m = data.meta;
  document.title = `${a.supervisor} · ${m.name} · ${SITE_TITLE}`;

  /* ---- 头部 ---- */
  const stars = a.rate_avg != null ? "★".repeat(Math.round(a.rate_avg)) + "☆".repeat(5 - Math.round(a.rate_avg)) : "";
  const span = a.dates && a.dates[0] ? `${a.dates[0].slice(0, 7)} ~ ${a.dates[1] ? a.dates[1].slice(0, 7) : "?"}` : "时间跨度不明";

  /* ---- 评分卡主色 ---- */
  const C = a.composite;
  const isProfile = a.basis === "profile";
  const isTestimony = a.basis === "testimony";
  const heroCls = C == null ? "na" : C < 0 ? "neg" : C < 2.5 ? "mid" : "pos";
  const heroNote = isTestimony
    ? `${a.n_reviews} 条存档评价 · 含知情者证言（邮件投稿 · 未验证）计入评分 · 方向分 ${a.direction ? f1(a.direction.score) : "—"}`
    : isProfile
    ? "AI 资料初评 · 零学生口碑：官方名录职称 + 研究方向两因子，置信度低于口碑综合分"
    : C == null
    ? (a.n_reviews > 0 ? "这些评价里没有能用来打分的内容，暂不出综合分" : "评价库里还没有这位的评价，先看官方名录和调研信息")
    : `${a.n_reviews} 条评价 · 网评 rate ${a.rate_avg != null ? f1(a.rate_avg) : "—"} · 基础分 ${f1(a.base)}`;

  /* ---- 组成拆解（为什么打这个分：公式瀑布） ---- */
  const wsum = a.parts.reduce((s, p) => s + p.w, 0) || 1;
  const contrib = (p) => (p.v * p.w) / wsum;
  const partsRows = a.parts.map((p) => {
    const w = Math.max(0, contrib(p)) / 5 * 100;
    return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:7px 0;border-bottom:1px dashed var(--line-2)">
      <span style="width:120px;font-size:13px;font-weight:600;color:var(--ink-2)">${esc(p.label)}</span>
      ${pill(p.v, 1)}
      <span class="chip" style="font-family:var(--mono)">×${p.w}</span>
      <div class="mini-bar" style="flex:1"><i style="width:${w.toFixed(1)}%"></i></div>
      <span style="width:44px;text-align:right;font-family:var(--mono);font-size:12.5px;color:var(--muted)">${f1(contrib(p))}</span>
    </div>`;
  }).join("");
  const penRows = (a.penalties || []).map((p) => `
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:7px 0;border-bottom:1px dashed #ffd9da">
      <span style="width:120px;font-size:13px;font-weight:600;color:var(--danger)">${esc(p.label)}</span>
      <span class="pen-item"><b>${f1(p.pts)}</b></span>
      <div class="mini-bar" style="flex:1"><i class="neg" style="width:${(Math.abs(p.pts) / 7 * 100).toFixed(1)}%"></i></div>
    </div>`).join("");

  /* ---- 九维雷达 ---- */
  const radarItems = [
    ...DIMS.map(([k, cn]) => ({ label: cn, v: a.dims[k] })),
    { label: "实习放行", v: a.internship.score },
    { label: "退学安全", v: (a.dropout.score != null ? a.dropout.score : (() => { if (a.dropout.hard) return a.dropout.mentions >= 3 ? 1 : 2; if (a.dropout.mentions || a.dropout.delay) return 3; return null; })()) },
    ...(a.direction ? [{ label: "方向前途(按AI)", v: a.direction.score }] : []),
  ];

  /* ---- 证据引用 ---- */
  const quote = (txt, d) => {
    if (!txt) return "";
    const t = cleanFrag(txt);
    return `<div class="quote">「${esc(t.length > 120 ? t.slice(0, 120) + "…" : t)}」<span class="d"> ${esc(d || "日期不明")}</span></div>`;
  };
  const dimEvidence = (key) => {
    const hits = [];
    for (const r of a.reviews || []) {
      const t = (r.dims || {})[key];
      if (t) hits.push({ t, d: r.date });
      if (hits.length >= 2) break;
    }
    return hits;
  };
  const internEvidence = (() => {
    const out = [];
    for (const r of a.reviews || []) {
      for (const k of ["outcome", "relationship", "description_raw"]) {
        const t = (r.dims || {})[k] || "";
        if (t.includes("实习")) { out.push({ t, d: r.date }); break; }
      }
      if (out.length >= 2) break;
    }
    return out;
  })();
  const dropEvidence = (() => {
    const kws = ["退学", "劝退", "延毕", "转导师", "换导师", "休学", "毕不了业", "跑路"];
    const out = [];
    for (const r of a.reviews || []) {
      const all = Object.values(r.dims || {}).join(" ");
      const hit = kws.find((k) => all.includes(k));
      if (hit) { const i = all.indexOf(hit); out.push({ t: all.slice(Math.max(0, i - 40), i + 50), d: r.date, kw: hit }); }
      if (out.length >= 2) break;
    }
    return out;
  })();

  const dimCard = (key, cn, extra) => {
    const v = a.dims[key], n = (a.dims_n || {})[key] || 0;
    const ap = key === "academics" && v == null && a.academics_profile ? a.academics_profile
      : key === "outcome" && v == null && a.outcome_profile ? a.outcome_profile : null;
    const ai = (a.dims_ai || {})[key] || null;
    const aiLabel = isTestimony ? "知情证言采信" : key === "academics" ? "AI 论文实锚出分" : key === "outcome" ? "AI 论文实锚（学生前途）" : "AI 读评论出分";
    const aiWhy = isTestimony
      ? `知情者证言（邮件投稿 · 未验证）判读计入。依据：${esc(String(ai).slice(0, 90))}`
      : (key === "academics" || key === "outcome")
      ? `词表无法归一，由 AI 按近 5 年论文实锚判分。依据：${esc(String(ai).slice(0, 90))}`
      : `叙述性评论词表无法归一，由 AI 判读打分。依据：「${esc(String(ai).slice(0, 90))}」`;
    const apLabel = key === "academics" ? "AI 论文/资历档（非口碑）" : "AI 论文实锚（近5年产出，非口碑）";
    const emptyWhy = a.n_reviews > 0
      ? "评价里没人把这块说清楚，这一项不计分"
      : "公开渠道暂无学生反馈——信息缺失，不是安全信号，也不计分";
    return `<div class="dim-card${extra || ""}">
      <div class="hd"><span class="nm">${cn}</span>${ap ? `<span class="pill mid sm">${f1(ap.score)}</span>` : pill(v, 1)}<span class="n">${ap ? apLabel : ai ? aiLabel : n ? n + " 条评价命中" : "无有效证据"}</span></div>
      <div class="why">${ap ? `口碑维零证据，AI 按${key === "academics" ? "论文实锚（职称资历兜底）评学术成果" : "近5年论文实锚评学生前途"} ${f1(ap.score)}：${esc(ap.rationale || "")}——资料层初评，不进口碑综合分` : ai ? aiWhy : v == null ? emptyWhy : `按评价用词打 1–5 分 · 依据 ${n} 条评价`}</div>
      <div class="quotes">${dimEvidence(key).map((h) => quote(h.t, h.d)).join("")}</div>
    </div>`;
  };

  const kwRows = Object.entries(a.dropout.keywords || {}).map(([k, n]) => `<span class="chip danger" style="font-family:var(--mono)">${esc(k)} ×${n}</span>`).join(" ");

  /* ---- 新鲜度 ---- */
  const dated = (a.reviews || []).filter((r) => r.date).map((r) => r.date);
  const latest = dated[0] || (a.dates && a.dates[1]) || null;
  const genDate = "2026-10-03";
  const yearsAgo = latest ? ((new Date(genDate) - new Date(latest)) / 3.15e10).toFixed(1) : null;
  const recent3 = dated.filter((d) => d >= "2023-10").length, recent5 = dated.filter((d) => d >= "2021-10").length;

  /* ---- 网评星级分布 ---- */
  const rateDist = (() => {
    const d = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let n = 0;
    (a.reviews || []).forEach((r) => { if (r.rate != null) { d[Math.min(5, Math.max(1, Math.round(r.rate)))]++; n++; } });
    return { d, n, posPct: n ? Math.round(((d[4] + d[5]) / n) * 100) : null };
  })();
  const rateDistBlock = rateDist.n ? `
        <div class="pen-row" style="background:var(--surface-2)">
          <span class="t" style="font-size:12.5px">${ic("check")} 网评星级分布</span>
          <div class="rate-dist">
            ${[5, 4, 3, 2, 1].map((s) => `<div class="rd-row"><span class="rd-lab">${s}★</span><div class="rd-bar"><i style="width:${Math.round(rateDist.d[s] / rateDist.n * 100)}%"></i></div><span class="rd-n">${rateDist.d[s]}</span></div>`).join("")}
          </div>
          <span style="font-size:12.5px;color:var(--muted);padding-left:12px;border-left:1px dashed var(--line)">好评率 <b style="color:${rateDist.posPct >= 60 ? "var(--ok)" : rateDist.posPct >= 40 ? "var(--warn)" : "var(--danger)"}">${rateDist.posPct}%</b>（4★+5★，共 ${rateDist.n} 条有星评价）</span>
        </div>` : "";

  /* ---- 同校高分参考 ---- */
  const topRefs = data.advisors
    .filter((x) => x.id !== a.id && x.composite != null && x.composite >= 3)
    .sort((x, y) => y.composite - x.composite || y.n_reviews - x.n_reviews)
    .slice(0, 3);
  const refsBlock = topRefs.length ? `
    <section class="sec">
      <div class="sec-h"><span class="bar"></span><span class="zh">同校高分参考</span><span class="en">Also at ${esc(m.name)}</span><span class="desc">本校综合分 ≥3 的导师，供横向对比</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px" class="quick-grid">
        ${topRefs.map((x) => `
        <a class="card quick" href="#/school/${sid}/${x.id}">
          <div class="t">${esc(x.supervisor)}${x.penalty ? ` <span class="chip danger" style="font-size:11px">含红线</span>` : ""} <span class="arr">${ic("arrow")}</span></div>
          <div class="d" style="display:flex;align-items:center;gap:10px">${pill(x.composite, 1)}<span>${x.n_reviews ? fmt(x.n_reviews) + " 条评价" : "库内无评价"}</span>${x.dir_bucket ? `<span class="chip ai" style="font-size:11px">${esc(x.dir_bucket)}</span>` : ""}</div>
        </a>`).join("")}
      </div>
    </section>` : "";

  /* ---- 评价列表 ---- */
  const reviewCards = (a.reviews || []).map((r, i) => `
    <div class="review-card${i < 2 ? " open" : ""}">
      <div class="review-hd" role="button" tabindex="0" onclick="this.parentElement.classList.toggle('open')">
        <span class="rate" style="color:${r.rate == null ? "var(--faint)" : r.rate >= 3.5 ? "var(--ok)" : r.rate >= 2.5 ? "var(--warn)" : "var(--danger)"}">${r.rate != null ? f1(r.rate) : "无分"}</span>
        <span class="stars">${r.rate != null ? "★".repeat(Math.round(r.rate)) + "☆".repeat(5 - Math.round(r.rate)) : ""}</span>
        <span class="sub">${esc(r.date || "日期不明")}</span>
        ${i < 2 ? '<span class="chip">最新</span>' : ""}
        <span class="src">${esc(SRC_CN[r.source] || r.source || "")}</span>
      </div>
      <div class="review-bd">${Object.entries(r.dims || {}).map(([k, v]) => {
        const t = cleanFrag(v);
        return `<div class="row"><span class="k">${esc(REV_DIM_CN[k] || k)}</span><span class="v">${esc(t.length > 400 ? t.slice(0, 400) + "…" : t)}</span></div>`;
      }).join("") || '<div class="row"><span class="k">原文</span><span class="v">（无分维度文本）</span></div>'}
      </div>
    </div>`).join("");

  /* ---- 深挖报告 ---- */
  const reportBlock = a.report ? `
    <details class="rep"${a.research_status === "done" ? " open" : ""}>
      <summary>${ic("doc")} 全网深挖调研报告（Tier ${a.research_tier === "A_done" || !a.research_tier ? "A" : "B"}）<span class="arr">${ic("arrow")}</span></summary>
      <div class="md">${mdRender(a.report)}</div>
    </details>` : "";

  app.innerHTML = `
  <div class="wrap fade-in">
    <div class="crumb"><a href="#/">数据大盘</a><span class="sep">/</span><a href="#/school/${sid}">${esc(m.name)}</a><span class="sep">/</span><span class="cur">${esc(a.supervisor)}</span></div>

    <div class="adv-head">
      <div class="adv-ava">${esc(a.supervisor.trim()[0] || "?")}</div>
      <div style="flex:1">
        <h1>${esc(a.supervisor)}${a.alias ? ` <span style="font-size:16px;font-weight:500;color:var(--muted)">（${esc(a.alias)}）</span>` : ""} ${researchChip(a)} ${aiChip(a)}</h1>
        <div class="affil"><b>${esc(a.university)}</b>${(a.departments || []).length ? " · " + esc(a.departments.slice(0, 2).join(" / ")) : ""}${a.roster && a.roster.title ? " · " + esc(a.roster.title) : ""}${a.joint ? ` · <span style="color:var(--sub)">🏫 ${esc(a.joint)}</span>` : ""}</div>
        <div class="adv-tags">
          ${a.dir_bucket ? `<span class="chip ai">${ic("radar", 12)} ${esc(a.dir_bucket)}</span>` : ""}
          ${a.roster && (a.roster.areas || []).length ? a.roster.areas.slice(0, 6).map((x) => `<span class="chip">${esc(x.length > 18 ? x.slice(0, 18) + "…" : x)}</span>`).join("") : ""}
          ${a.roster && a.roster.homepage ? `<a class="chip" href="${esc(a.roster.homepage)}" target="_blank" rel="noopener">${ic("link", 12)} 官方主页</a>` : ""}
          ${a.roster && a.roster.mentor === "phd_supervisor" ? `<span class="chip">${ic("check", 12)} 博导</span>` : ""}
          ${a.rate_avg != null ? `<span class="chip"><span class="stars">${stars}</span> ${f1(a.rate_avg)} / 5</span>` : ""}
          <span class="chip">${ic("doc")} ${a.n_reviews} 条评价 · ${esc(span)}</span>
          <button class="btn sm" id="favBtn" style="flex:none">${Fav.has(sid, aid) ? "★ 已收藏" : "☆ 收藏"}</button>
        </div>
      </div>
    </div>

    <!-- 评分主卡 + 红线 -->
    <div class="score-hero">
      <div class="score-big ${heroCls}">
        <span class="cap">综合分 COMPOSITE${isTestimony ? "（含知情证言）" : isProfile ? "（AI 资料初评）" : a.penalty ? "（含红线惩罚）" : ""}</span>
        <span class="v">${C == null ? "—" : f1(C)}<small> / 5</small></span>
        <span class="note">${esc(heroNote)}</span>
      </div>
      <div class="score-side">
        <div class="pen-row">
          <span class="t">${ic("radar")} 为什么是这个分</span>
          ${a.parts.length ? `<span class="base-note">基础分 ${f1(a.base)}（${isProfile ? "AI 资料初评：学术资历档+方向" : "加权口碑"}）</span>` : `<span class="base-note">库内证据不足，无加权口碑分</span>`}
          ${(a.penalties || []).length ? a.penalties.map((p) => `<span class="pen-item">${esc(p.label)} <b>${f1(p.pts)}</b></span>`).join("") : `<span class="chip ok">未触发红线惩罚</span>`}
        </div>
        <div class="pen-row" style="background:var(--surface-2)">
          <span class="t" style="font-size:12.5px">${ic("clock")} 新鲜度</span>
          <span style="font-size:12.5px;color:var(--muted)">${latest ? `最近一条评价是 <b>${esc(latest.slice(0, 10))}</b>（约 ${yearsAgo} 年前）；近三年 ${recent3} 条、近五年 ${recent5} 条${yearsAgo > 6 ? "；⚠ 证据大多是六年前的[旧评]" : ""}` : "库内评价均无日期标注"}</span>
        </div>
        ${rateDistBlock}
      </div>
    </div>

    <!-- 为什么这样打分 -->
    <section class="sec" style="margin-top:26px">
      <div class="sec-h"><span class="bar"></span><span class="zh">评分拆解 · 为什么这样打分</span><span class="en">Score Breakdown</span></div>
      <div class="why-grid">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-h"><span class="zh">组成与权重</span><span class="en">Weighted Parts</span></div>
            <div class="card-b" style="padding-top:6px">
              ${partsRows || '<div class="empty-state">无评分组成（库内证据不足）</div>'}
              ${penRows ? `<div style="display:flex;align-items:center;gap:10px;padding:9px 0 2px">
                <span style="width:120px;font-size:13px;font-weight:800">红线扣分</span>
                <span class="pen-item"><b>${f1(-(a.penalty || 0))}</b></span>
                <span style="font-size:12px;color:var(--danger)">阶梯叠加制，多项并存全部累计</span>
              </div>` : ""}
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:9px 0 0;border-top:2px solid var(--line)">
                <span style="width:120px;font-size:13.5px;font-weight:800">= 综合分</span>
                ${pill(C, 1)}
                <span style="font-size:12px;color:var(--muted)">缺的项按剩余权重折算 · 有一条评价就计分</span>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-h"><span class="zh">九维画像雷达</span><span class="en">Radar · 1–5</span></div>
            <div class="card-b" style="display:flex;justify-content:center">${chartRadar(radarItems)}</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px">
          ${a.synthesis ? `<div class="synthesis"><div class="cap">${ic("doc")} AI 综合评价</div>${esc(a.synthesis)}</div>` : ""}
          ${a.human_note ? `<div class="synthesis" style="border-left-color:var(--ok)"><div class="cap">${ic("check")} 知情者证言${a.human_note.weight === "accepted" ? "（已采信 · 计入评分）" : "（待验证 · 不计入评分）"}</div>${esc(a.human_note.text)}<div style="margin-top:8px;font-size:11.5px;color:var(--muted)">自述身份：${esc(a.human_note.role)} · ${esc(a.human_note.submitted)} 提交 · 平台代录 · 邮件/消息投稿默认采信（未验证，可回访核实） · 负面证言同样采信</div></div>` : ""}
          ${dimCard("academics", "学术水平")}
          ${dimCard("funding", "科研经费")}
          ${dimCard("stipend", "学生补助")}
          ${dimCard("relationship", "师生关系")}
          ${dimCard("workload", "工作时间")}
          ${dimCard("outcome", "学生前途")}
          <div class="dim-card${a.internship.score != null && a.internship.score <= 2 ? " danger" : ""}">
            <div class="hd"><span class="nm">实习放行</span>${pill(a.internship.score, 1)}<span class="n">正面证据 ${a.internship.pos} · 负面 ${a.internship.neg}</span></div>
            <div class="why">${a.internship.score == null ? (a.n_reviews > 0 ? "没有评价提到实习这件事，不计分" : "公开渠道暂无实习相关信息——零口碑导师，无据不判") : a.internship.score <= 2 ? "有评价提到不让实习或实习受限，扣 1 分；嘴上放行、实际项目多到走不开的也算" : "按正反说法计数打分（5 分 = 明确放实习）"}</div>
            <div class="quotes">${internEvidence.map((h) => quote(h.t, h.d)).join("")}</div>
          </div>
          <div class="dim-card${a.dropout.hard ? " danger" : ""}">
            <div class="hd"><span class="nm">退学风险（分高=安全）</span>${pill(a.dropout.score != null ? a.dropout.score : (a.dropout.hard ? (a.dropout.mentions >= 3 ? 1 : 2) : ((a.dropout.mentions || a.dropout.delay) ? 3 : null)), 1)}<span class="n">提及 ${a.dropout.mentions} 次 · 延毕类 ${a.dropout.delay} 次</span></div>
            ${a.dropout.reason ? `<div class="why" style="color:var(--muted)">🔎 AI 口径审计（逐条判决命中评论）：${esc(String(a.dropout.reason))}</div>` : ""}
            <div class="why">${a.dropout.reason ? "以上为审计后口径；原始提及计数保留在下方供对照" : a.dropout.hard ? "有多条评价提到退学、劝退或转导师，触发硬信号扣 6 分（和延毕不叠加）" : (a.dropout.mentions || a.dropout.delay) ? "只有延毕或个别提及：按硕/博层次扣 2.5 / 1.5 分" : "没有评价提到退学、延毕、转导师这些"}</div>
            ${kwRows ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${kwRows}</div>` : ""}
            <div class="quotes">${dropEvidence.map((h) => quote(h.t, h.d)).join("")}</div>
            <div style="font-size:11.5px;color:var(--faint);margin-top:6px">这些只是匿名网络评价的统计，成因复杂、未经证实，仅供参考。</div>
          </div>
          ${a.direction ? `
          <div class="dim-card wide">
            <div class="hd"><span class="nm">方向前途（按 AI 学科视角评分）</span>${pill(a.direction.score, 1)}
              <span class="chip ai">AI 判断 · 非客观测量</span><span class="chip">按 AI 学科视角打分</span>
              <span class="chip${a.direction.basis === "pilot" || a.direction.basis === "papers" ? " tierA" : " tierC"}">${a.direction.basis === "pilot" ? "深挖调研定档" : a.direction.basis === "papers" ? "AI 读论文定档" + (a.direction.conf === "low" ? "（身份低置信）" : "") : a.direction.basis === "research" ? "调研实锚复核" : "规则锚点初评"}</span>
            </div>
            <div class="why">${esc(a.direction.rationale)}</div>
            ${a.direction.abstain ? `<div class="why" style="color:var(--muted)">🔎 AI 读论文未能定档（保守放弃）：${esc(String(a.direction.abstain))}</div>` : ""}
            <div style="font-size:11.5px;color:var(--faint);margin-top:6px">方向基准分（rubric v2.2）：当前最热主赛道（大模型/生成式AI/多模态/智能体/具身智能/世界模型等）基准 4.0、贴紧主赛道 4.5、顶线产出头部可到 5；CV/NLP 经典任务 3、传统机器学习 2.5、传统优化 2。判分以导师近 5 年论文为据：贴不贴领域当前主赛道只调 ±0.5-1。方向分和口碑分互相独立，分开看。<div style="font-size:11.5px;color:var(--faint);margin-top:4px">这张打分表是按学科配置的——项目目标是覆盖全学科，每个学科会各有各的表；现在启用的是 AI 这套。</div></div>
          </div>` : ""}
          ${a.freshness ? `<div class="fresh-box"><b>⏱ 新鲜度声明：</b>${esc(a.freshness)}</div>` : ""}
          ${a.notes ? `<div class="fresh-box"><b>🔎 调研注记：</b>${esc(a.notes)}</div>` : ""}
        </div>
      </div>
    </section>

    <!-- 深挖报告 -->
    ${reportBlock}

    <!-- 原始评价 -->
    <section class="sec">
      <div class="sec-h"><span class="bar"></span><span class="zh">原始评价存档</span><span class="en">Raw Reviews · ${fmt(a.n_reviews)}</span>
        <button class="btn sm" style="margin-left:auto" onclick="document.querySelectorAll('.review-card').forEach(c=>c.classList.add('open'))">全部展开</button>
        <button class="btn sm" onclick="document.querySelectorAll('.review-card').forEach(c=>c.classList.remove('open'))">全部折叠</button>
      </div>
      ${reviewCards || '<div class="empty-state">库内无评价（画像卡：仅官方名录基线 + 全网调研）</div>'}
    </section>

    <!-- 同校高分参考 -->
    ${refsBlock}

    <div class="disclaimer-strip" style="margin-top:20px">${ic("alert", 15)}<span>评分卡由程序自动合成，再叠加全网调研的补充修正，每个结论都能查到出处；<b>我们只摆证据，不说「该报 / 不该报」</b>。评价都是匿名网络存档，可能过时、有偏、甚至不实；师德类问题请以官方渠道为准，这里不复述细节。</span></div>
  </div>`;

  /* 收藏切换 */
  const favBtn = $("#favBtn");
  if (favBtn) favBtn.addEventListener("click", () => {
    const on = Fav.toggle({ sid, aid, name: a.supervisor, uni: m.name, score: C, n: a.n_reviews });
    favBtn.textContent = on ? "★ 已收藏" : "☆ 收藏";
  });

  window.scrollTo(0, 0);
}


/* ============================================================
   我的收藏（localStorage，不上传任何数据）
   ============================================================ */
function viewFavs() {
  const app = $("#app");
  const favs = Fav.load();
  const cards = favs.map((f) => `
    <a class="card quick" href="#/school/${esc(f.sid)}/${esc(f.aid)}">
      <div class="t">${esc(f.name || "导师")} <span class="arr">${ic("arrow")}</span></div>
      <div class="d" style="display:flex;align-items:center;gap:10px">${f.score != null ? pill(f.score, 1) : ""}<span>${esc(f.uni || "")}${f.n ? " · " + f.n + " 条评价" : ""}</span></div>
    </a>`).join("");
  app.innerHTML = `
  <div class="wrap fade-in">
    <div class="crumb"><a href="#/">数据大盘</a><span class="sep">/</span><span class="cur">我的收藏</span></div>
    <div class="sec-h" style="margin-top:18px"><span class="bar"></span><span class="zh">我的收藏</span><span class="en">My Favorites · ${favs.length}</span><span class="desc">只存在本设备浏览器里，不上传、不联网</span></div>
    ${favs.length ? `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px" class="quick-grid">${cards}</div>
    <div style="margin-top:18px"><button class="btn sm" id="favsClear">清空收藏（不可恢复）</button></div>
    <div class="disclaimer-strip" style="margin-top:20px">${ic("alert", 15)}<span>收藏里的分数与评价数是收藏那一刻的快照，导师最新评分以点进详情页为准。</span></div>
    ` : `<div class="empty-state" style="padding-top:80px">还没有收藏任何导师<br><br>打开导师评分卡，点右上角「☆ 收藏」即可加入</div>`}
  </div>`;
  const clearBtn = $("#favsClear");
  if (clearBtn) clearBtn.addEventListener("click", () => { if (confirm("确定清空全部收藏？")) viewFavs(); });
  window.scrollTo(0, 0);
}

/* ============================================================
   联系方式 / 加入我们
   ============================================================ */
function viewContact() {
  const app = $("#app");
  app.innerHTML = `
  <div class="wrap fade-in">
    <section class="hero" style="padding-bottom:20px">
      <span class="kicker"><span class="dot"></span>JOIN US · 招募共建者</span>
      <h1>这个项目需要<span class="grad">更多人的手</span>。</h1>
      <p class="sub">AI 导师评价库仍在建设中：调研、扩学科、写代码、审标准，哪样都缺人。能帮上任何一样都欢迎，贡献会署名，标准全开源。</p>
    </section>

    <section class="sec" style="margin-top:8px">
      <div class="grid-2">
        <div class="card">
          <div class="card-h"><span class="zh">${ic("doc")} 需要帮手的方向</span><span class="en">Open Roles</span></div>
          <div class="card-b"><ul class="rule-list">
            <li>${ic("search")}<span><b>各校导师深挖调研</b>：按开源的调研流程（先查官方页面，再看学术成果，然后找风评、专门查实习和退学）给你熟悉的学校补评分卡；会搜索、会存证据就能上手。</span></li>
            <li>${ic("radar")}<span><b>领域扩展共建</b>：把这套「摆证据、说得清」的做法带到别的学科（生物、医学、材料、经管、人文……），负责自己领域的名单和标准。</span></li>
            <li>${ic("logo")}<span><b>前端与数据工程</b>：站点交互、数据管线、CI/CD、可视化——零依赖静态站，改造空间大。</span></li>
            <li>${ic("check")}<span><b>评分标准评审与纠错</b>：帮忙复核红线信号有没有认错人、断错句（比如同名导师、否认句被误算），标准改了就凭证据重算。</span></li>
          </ul></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-h"><span class="zh">${ic("user")} 怎么参与</span><span class="en">How to Join</span></div>
            <div class="card-b"><ul class="rule-list">
              <li>${ic("github")}<span><b>GitHub</b>：提 Issue 讨论 / 直接提 PR（数据、口径文档、站点代码均可）；贡献者名单将列入 README。</span></li>
              <li>${ic("doc")}<span><b>邮件</b>：说说你想参与哪块（调研 / 扩学科 / 工程 / 评审）、有什么背景，我们会回一份上手指南。</span></li>
              <li>${ic("alert")}<span><b>几条底线</b>：只用公开可查的信息；证据要带来源和日期；不说「该报 / 不该报」；学生信息只计数、不展示。</span></li>
            </ul></div>
          </div>
          <div class="card" style="border-color:#c3d8ff;background:linear-gradient(180deg,#eaf1ff,#fff 60%)">
            <div class="card-h"><span class="zh">${ic("link")} 联系方式</span><span class="en">Contact</span></div>
            <div class="card-b">
              ${CONTACT.email
                ? `<div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--brand-deep);word-break:break-all">${esc(CONTACT.email)}</div>`
                : `<div style="font-size:15px;color:var(--ink-2)"><span class="chip warn">邮箱即将公布</span>&nbsp; 联系方式确定后将更新在本页与仓库 README。</div>`}
              <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
                <a class="btn primary" href="${esc(CONTACT.github)}" target="_blank" rel="noopener">${ic("github", 14)} GitHub 仓库</a>
                ${CONTACT.email ? `<a class="btn" href="mailto:${esc(CONTACT.email)}">${ic("link", 13)} 发邮件</a>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>`;
  window.scrollTo(0, 0);
}

/* ============================================================
   路由
   ============================================================ */
const SITE_TITLE = "AI 导师评价库 · 开源版";
const ROUTE_TITLES = { schools: "学校榜单", method: "评分方法论", contact: "加入我们", favs: "我的收藏" };
let routeToken = 0; /* 路由令牌：慢响应回来时若已切换路由，直接丢弃，不覆盖当前视图 */
async function route() {
  const t = ++routeToken;
  const h = location.hash || "#/";
  const parts = h.replace(/^#\//, "").split("/").filter(Boolean);
  $$(".nav-links a").forEach((x) => x.classList.toggle("on", (x.dataset.nav === "/" && parts.length === 0) || (x.dataset.nav && x.dataset.nav !== "/" && parts[0] === x.dataset.nav)));
  document.title = ROUTE_TITLES[parts[0]] ? `${ROUTE_TITLES[parts[0]]} · ${SITE_TITLE}` : SITE_TITLE;
  try {
    if (parts.length === 0) await viewOverview(t);
    else if (parts[0] === "contact") viewContact();
    else if (parts[0] === "favs") viewFavs();
    else if (parts[0] === "schools") await viewSchools(t);
    else if (parts[0] === "method") await viewMethod(t);
    else if (parts[0] === "school" && parts[1] && !parts[2]) await viewSchool(parts[1], t);
    else if (parts[0] === "school" && parts[1] && parts[2]) await viewAdvisor(parts[1], parts[2], t);
    else await viewOverview(t);
  } catch (e) {
    $("#app").innerHTML = `<div class="wrap"><div class="empty-state" style="padding-top:80px">加载失败：${esc(e.message)}<br><br><a href="#/">← 返回总览</a></div></div>`;
  }
  if (parts.length > 0 && t === routeToken) window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();
