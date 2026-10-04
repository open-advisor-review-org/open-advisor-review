# 数据持续更新机制设计（refresh pipeline）

> 状态：v0.1 设计稿。解决三类持续变化：① 风评变化（新评价）② 新导师 ③ 导师跳槽。

## 一、三类变更与信号源

| 变更 | 信号源 | 处理 |
|------|--------|------|
| 风评变化 | 轨道 A 平台新评价（实时）；公开渠道周期性抓取（L3 社交平台，用户授权登录后手动触发） | 新评价带时间戳入库；呈现端按时间衰减（老评价默认折叠，见 dimensions.md 第五节），风评"会变化"由时间轴自然表达 |
| 新导师 | roster diff 的 `added` | 自动建档（零评价状态），进入"待评价"池 |
| 导师跳槽 | roster diff：A 校 `maybe_left` + B 校 `added` 且同名 | 身份合并流程（下节） |

## 二、导师身份主键与跳槽合并

**现状问题**：评价库主键 `(university, supervisor)`，跳槽会分裂成两个档案、评价被腰斩。

**目标**：引入稳定的 `advisor_id`，档案结构改为：

```json
{
  "advisor_id": "scholar:xxxx | dblp:xx | fp:姓名+指纹哈希",
  "name": "",
  "identity_source": "dblp | openreview | scholar | fingerprint",
  "institutions": [
    {"university": "", "department": "", "start": "2018", "end": "2024-06"},
    {"university": "", "department": "", "start": "2024-07", "end": null}
  ],
  "reviews": "挂在 advisor_id 下，跨机构累积"
}
```

**身份 ID 优先级**：DBLP key / OpenReview id / Google Scholar id（天然跨机构稳定，L2 学术画像阶段 join）→ 降级用"姓名 + 学术指纹"（研究方向关键词 + 学历/经历线索，来自导师主页简介）。

**合并流程（半自动）**：
1. roster diff 发现疑似跳槽（A 校消失 + B 校新增同名）→ 生成合并建议
2. agent 自动核验：抓 B 校导师主页的"曾任职"线索（导师主页简历通常会写）；或 DBLP/主页简介变动
3. 置信度判定：高（主页明示 + 方向重合）自动合并；中低进人工确认队列
4. 合并后评价全部挂 `advisor_id`，展示层标注"该导师于 20XX 年由 A 校调入 B 校"

**AI 领域特殊性**：学界↔工业界往返流动常见（教授进大厂再回高校）。`institutions[].type` 允许 `industry`，来源以公开报道/官方声明为准，不确定就只记线索不下结论。

## 三、版本化与审计

- `data/VERSION`：当前版本号（如 `2026.09.30-1`）
- `data/CHANGELOG.md`：每次 refresh 追加一行摘要（日期、新增评价数、新导师数、跳槽合并数、来源）
- `data/snapshots/`：按日期的不可变快照，保证历史分析可复现
- 评价删除：仅作者本人或法律要求，记 tombstone（不物理删，防刷评对抽数据）

## 四、更新节奏（建议，可调）

- **roster 名录**：每学期一轮（3 月/9 月开学季各一轮；导师调动高峰在年底与春节后，1-2 月加一轮）
- **评价**：轨道 A 实时；公开源每月
- **L3 社交平台**：用户授权后手动触发，频率用户定

## 五、与现有工序的关系

- `data/merge.py`（历史三源合并）是一次性回填；本设计的 refresh 管线负责此后的一切增量
- 首次 roster 全量建库后，`merge.py` 产出需按 `advisor_id` 迁移重挂（回填 institutions 历任职）
