# AI 导师评价库 · 开源站点（site/）

基于 **匿名评价存档 + 官方师资名录 + 全网深挖调研** 的导师评分与证据库前端，
**现阶段面向 AI 方向学生**（方向锚点=AI 主赛道）；其他学科想把同一套「证据链+可解释评分」口径带到自己领域的同学，欢迎提 Issue/PR 或直接联系作者共建。
纯静态、零依赖、零构建——克隆即可用任意静态服务器 / GitHub Pages 托管。

## 三层界面

| 层级 | 路由 | 内容 |
|---|---|---|
| 总览大盘 | `#/` | KPI 大盘、AI 导师深挖覆盖进度（done / AI 子集全量）、综合分分布 / 评价时间线 / 七维均分 / 院校层级四图表、学校榜单（四种排序）、项目定位（面向 AI 学生 + 他领域共建邀请）、评分方法论（公式 / 阶梯扣分 / 采信原则 / 红线声明） |
| 学校榜单 | `#/schools` | 469 所按学科切榜单：默认「AI 方向汇总」（六 AI 桶），可切各学科桶；均分排序要求 ≥3 位出分导师 |
| 学校页 | `#/school/:sid` | 校级 KPI 与综合分分布、校内搜索、**方向筛选**（LLM/大模型 · CV/NLP · 机器人/具身 · 传统ML · 网安/系统 · 其他CS · 电子信息 · 自动化 · 其他学科）、排序（综合分 / 评数 / 学术 / 师生关系 / 补助 / 红线优先）、筛选（仅出分 / 负分卡 / 退学硬信号 / 有深挖报告 / AI 方向）、导师总表（每行带方向标签） |
| 导师页 | `#/school/:sid/:aid` | **详细评分 + 为什么这样打分**：综合分 hero（负分红卡）、组成与权重瀑布（七维 0.55 / 实习 0.15 / 退学 0.15 / 方向 0.15 + 红线阶梯扣分明细）、九维雷达、逐维证据引用（评价原文）、实习/退学硬信号（关键词计数 + 原文摘录）、方向前途 AI 评分（含 rationale 与 rubric 版本）、AI 综合评价、新鲜度声明、全网深挖调研报告（markdown 渲染）、原始评价存档（七维原文，可折叠） |

顶部导航与首页 Hero 均支持全局搜索（导师 / 学校，键盘 ↑↓ Enter 可操作）。

## 快速开始

> **普通用户不用跑任何命令**：直接开[线上版](https://open-advisor-review-org.github.io/open-advisor-review/)，
> 或到 [Releases → offline-latest](https://github.com/open-advisor-review-org/open-advisor-review/releases/tag/offline-latest)
> 下载 `advisor-review-offline.html` 双击离线浏览（`python build_offline.py` 生成，约 23MB）。
> 下面是开发者流程。

```bash
# 1) 构建数据（需要 ../data/ 下的管线产物，见下）
python build.py

# 2) 本地预览
python -m http.server 8799
# 打开 http://127.0.0.1:8799
```

GitHub Pages：推送本目录（含 `assets/api/`）到仓库，Settings → Pages → 选分支即可。
无 Node、无 npm、无打包步骤。

## 数据构建（build.py）

从 `../data/` 读取管线产物，合成评分并输出三级 JSON：

- 输入：`advisor_scores.json`（库内九项分）、`merged/advisors.json` + `merged/reviews.json`（评价库）、`roster_all.json`（官方名录）、`ai_subset/advisors_ai.json`、`pilot_direction_scores.json`（方向分 + rationale）、`pilot_signal_adjustments.json`（调研增量：synthesis / delta_internship / dropout_override）、`delay_level_20261003.json`（延毕层级）、`batch_queue_20261002.json`（调研队列状态）、`scores_pilot/*.md`（深挖报告）、`VERSION`
- 输出：
  - `assets/api/stats.json` —— 总览大盘聚合
  - `assets/api/schools.json` —— 学校索引（榜单 + 路由）
  - `assets/api/search.json` —— 全库检索索引（导师 + 学校）
  - `assets/api/school/{sid}.json` —— 每校一文件：全部导师完整评分卡 + 原始评价内嵌（导师页零二次请求）

> ⚠️ `assets/api/school/` 合计约 38MB（含全部评价原文与深挖报告）。若仓库体积敏感：
> `.gitignore` 掉该目录，由 CI 跑 `build.py` 产出，或以 Release 附件分发数据包。

## 评分口径（与 data/batch_pipeline.py 同源）

```
综合分 = (七维口碑均分×0.55 + 实习放行×0.15 + 退学风险×0.15 + 方向前途(AI评)×0.15) / Σ权重
         − 红线阶梯扣分（叠加制：不放实习 −1；延毕 硕 −2.5 / 博 −1.5；退学硬flag −6）
```
- 评数 <3 不出综合分；缺项重归一化；只有综合分可为负
- 实习/退学信号 = **未经证实的网络评价统计**；方向前途为 **AI 判断非客观测量**
- 每卡强制三时间：生成时间 / 库内评价跨度 / 调研截止；6 年以上旧评标 [旧评]

## 红线声明（产品与代码共同遵守）

- **不输出「建议报 / 不建议报」裁决**，只呈现证据与信号
- 单条负面即采信（保守优先），负面证据不随时间衰减
- 师德类指控只链官方来源，不复述细节；学生姓名只计数不呈现
- 评分标准与全部证据链开源可复算——标准变更时凭 evidence_raw 重算，不重新调研

## 目录

```
site/
├── index.html          # SPA 外壳（导航 / 图标库 / 页脚）
├── build.py            # 数据构建管线（源数据 → assets/api/*.json）
└── assets/
    ├── style.css       # 白蓝科技风设计系统
    ├── app.js          # 路由 + 三层视图 + SVG 图表 + 搜索 + markdown 渲染
    └── api/            # build.py 产物（见上）
```

## 共建联系方式配置

总览页「项目定位」卡与页脚的联系方式集中在一处配置：`assets/app.js` 顶部的

```js
const CONTACT = { github: "https://github.com/", email: "" };
```

邮箱已配置（nameless202610@163.com，填了 `email` 会自动渲染 mailto 按钮）；部署前还需把 `github` 替换为真实仓库地址。

## 红线导师脱敏政策（2026-10-04 定调）

为降低指名道姓负面信息带来的法律与骚扰风险，**凡触发红线阶梯扣分的导师，站点数据层一律匿名**：

- 显示名 = 姓氏 + 名字拼音首字母（张雷 → 张L，李刘合 → 李LH；英文名 Xin Yao → Yao X）
- 姓名在全站所有展示面（学校表 / 详情页 / 搜索索引 / 综合评价 / 注记 / 评价原文）全部遮蔽
- 不内嵌其深挖报告全文、不外链官方主页（评分拆解、证据引用、硬信号计数等功能完整保留）
- 总览页不设任何「负面名单」榜；`stats.json` 不含 watchlist / bottom 字段

匿名判定 = `penalties` 非空（任一红线扣分触发：不放实习 / 延毕 / 退学）。构建依赖 `pypinyin`（`pip install pypinyin`）。
正面高分样本保持实名展示。

## 2026-10-04 口径与功能更新

- **评分前提（用户定调）**：拿到的评价一律采信，**任一条评价即出综合分**（取消「评数<3 不出分」门槛）；缺项按剩余权重归一。全库出分 13,271 人。
- **项目重点声明**：全网深挖调研聚焦**最新评论**（某乎/小某书/官方页现势证据），打破存档真空期——首页 Hero、项目定位卡、方法论均已强调。
- **方向筛选**：`dir_bucket` 字段 = 方向词规则 + 子代理归类映射（`data_aux/area_bucket.json` 1,500 条长尾方向词、`data_aux/dept_bucket.json` 284 个院系）+ 学科标签 + AI 队列兜底，优先级依次递降；无法判定为「未标注」。
- **联系方式页** `#/contact`（导航「加入我们」）：招募角色 / 参与方式 / 联系方式。邮箱占位——在 `assets/app.js` 顶部 `CONTACT.email` 填入后自动展示。

## 全学科扩展接口（2026-10-04 预留）

长期目标是**覆盖全学科**：口碑七维、实习、退学这些维度全学科通用，唯独「方向前途」的打分表按学科各配一套。接口已留好：

- **`build.py` 顶部 `DISCIPLINES`**：学科配置注册表。`ai` 已启用（rubric v2.1 锚点表）；`bio / med / mat / econ / hss` 等以注释形式预留，共建者定标后取消注释、填入各自锚点表即可。
- **`rubric_anchors(discipline)`**：按学科取锚点表的分发点，新学科在此分支。
- **`direction.discipline` 字段**：每条方向分都带学科标注，将来多学科并存时前端可按视角切换。
- **`stats.disciplines`**：站点级学科配置（当前视角 + 各 profile 状态），前端据此展示。

扩展一个新学科的三步：① 在 `DISCIPLINES` 注册 profile（定锚点表与 fit 规则）→ ② 给对应学科导师归属学科（默认沿用 `ACTIVE_DISCIPLINE`）→ ③ 重跑 `python build.py`。

## 侵权投诉与更正通道（Takedown & Correction）

本站与离线分发包中的评价类内容，均为公开匿名评价存档与公开网络信息的研究性聚合（非营利研究与社会监督用途）。权利人认为任何内容构成侵权或事实有误的，请通过邮箱（nameless202610@163.com）或仓库 Issue 指明具体条目与理由——**收到指认后 3 个工作日内核实回复，属实内容即时删除或遮蔽**。完整流程见仓库主 README。
