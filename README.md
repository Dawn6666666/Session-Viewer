# Session Viewer (会话日志分析与转换工具)

这是一个用于将 Codex 本地 Session 存储的调用与对话记录（`.jsonl` 格式）转换为多种文本文档格式（`.txt`）的高度模块化、健壮且整洁的 Node.js 命令行工具。

同时，它配备了基于 **Claude 克制美学（Paper & Ink）** 精心打造的交互式高级前端可视化分析面板，帮助您深度剖析、浏览和管理 Codex 的会话生命周期。

---

## 🎨 前端 Web 分析面板功能

### 1. 左右分栏气泡对话流 (Left-Right Splitted Bubbles)
- **用户提问（居右 - 陶土暖橘色调）**：自动分析提取用户提问时的 IDE 上下文（活动文件与已开标签页），并以精致的代码胶囊徽章（Badges）紧凑呈现，与清洗后的提问正文完美融合。
- **Codex 回复（居左 - 纯净纸张感）**：将 AI 的心路历程、工具执行链路与 Markdown 回答优雅分离并靠左对齐，形成冷暖对比的阅读体验。

### 2. 双重浏览视图：时间线滚动 VS “单轮聚焦”
- **聚焦单轮 (Focus View - 默认推荐)**：
  - 屏幕中**仅展示当前选中的这一轮对话**（人类问题 + AI 思考 + 工具流水线 + Codex 回答），完全摆脱冗长滚动的疲劳与迷失感。
  - **键盘热键支持**：您可以直接在键盘上按下 **左方向键 (`←`)** 或 **右方向键 (`→`)**，极为丝滑、平滑地切换上一轮或下一轮对话！
- **时间线滚动 (Endless Scroll View)**：一键切换回经典的纵向连续滚动 timeline 对话流。

### 3. 图形化“纯净对话流” (Pure Chat View)
- 开启后自动在时间轴上**彻底屏蔽所有繁杂多余的系统思考评论 (`Commentary`) 和命令行工具执行日志**，仅留下最纯粹的人机直接对话。
- 提供 **`显示 IDE 上下文`** 复选开关，支持一键实时显隐用户卡片中的活动文件和标签页。
- 配备极具质感、带打字机加载动画的 **“一键复制纯净对话文本”** 动作按钮。

### 4. 纸带式复古终端 (Typewriter Ledger Output)
- 所有的 shell 命令行执行参数与 console 终端输出被组装入可折叠的终端面板中。
- 在浅色模式下呈现极佳的**暖纸灰色背景（Typewriter Warm Paper）与墨色墨水字迹**；在深色模式下自动适配为软对比度的**羊皮纸木炭黑**。

### 5. 联动彻底删除本地原始日志 (Secure Local Log Deletion)
- 侧边栏包含 hover 活跃的陶土橘小垃圾桶按钮。
- 点击会唤起毛玻璃磨砂效果的极佳确认弹窗，并带有可勾选项：**“同时一键彻底删除本地原始 .jsonl 日志文件”**。
- **深度递归查找机制**：勾选后，系统除了清空 outputs 隔离输出，还会自动在本地 sessions 工作区目录 (`C:\Users\24831\.codex\sessions`) 内进行深度多层递归查找，定位到对应的原始日志文件并安全擦除，实现一键彻底清空。

### 6. 一键拖拽即时解析与交互式下载
- 浏览器中直接拖入全新的 `.jsonl` 文件，后端将在几微秒内完成解析并无缝同步刷新侧边栏。
- 顶部元数据区常驻“干净版文本”与“极简版文本”纯文本文档（`.txt`）的一键直接下载按钮。

---

## 📂 目录结构说明

```
Session-Viewer/
├── package.json         # 项目配置文件（已启用 ES Modules）
├── README.md            # 项目使用与架构说明文档
├── .gitignore           # 忽略大体积原始日志与生成的文本文档
└── src/
    ├── index.js         # 核心协调器 (Orchestrator - 兼容 CLI 与 Server 运行)
    ├── config.js        # 配置解析、路径计算与文件系统验证
    ├── server.js        # 轻量级 RESTful API 服务，实现路径自动解码与安全删除
    ├── utils/
    │   ├── formatters.js    # 文本截断与时间戳格式化工具函数
    │   └── messageParser.js # 提取 IDE 上下文及清洗用户提问正文
    ├── parser/
    │   └── logParser.js     # 流式读取日志，提取时间线事件并聚合 Turn
    ├── public/          # 前端静态资源托管目录
    │   ├── index.html   # 分析面板主界面（包含毛玻璃 Modal 与控制插槽）
    │   ├── style.css    # 纯 Vanilla CSS 实现的 Claude 极简纸墨设计系统
    │   └── app.js       # 前端控制逻辑（热键切换、纯净对话过滤、动态复制、联动删除）
    └── writers/
        ├── dialogueWriter.js  # 写入 Clean 和 Super Clean 对话日志
        ├── historyWriter.js   # 写入包含工具调用的 verbose 轨迹文件
        └── splitTurnsWriter.js# 写入分轮次文件的专属写入器
```

---

## 🚀 使用指南

### 1. 运行 Web 服务器 (推荐)

启动后端 Web 服务：

```bash
npm run server
```

或者使用 node 启动：

```bash
node src/index.js --server
```

启动后在浏览器中打开 **`http://localhost:3000/`** 即可开启极佳的可视化探索！

### 2. 命令行批量转换 (CLI)

如果您仅需要将特定 `.jsonl` 快速转换为纯文本，运行转换脚本并传入目标文件路径：

```bash
npm run convert -- <path_to_jsonl_file>
```

或者直接 node 执行：

```bash
node src/index.js <path_to_jsonl_file>
```

#### CLI 自动探测机制
如果您没有指定任何路径，命令行工具会智能执行以下策略：
1. 首先在当前目录下寻找默认预设的 rollout 文件。
2. 若不存在，将自动扫描当前工作目录，**默认挑选体积最大的 `.jsonl` 文件**进行即时转换（完美切合“快速分析当前活动日志”的需求）。

---

## 🛠️ 二次开发与扩展

项目代码高度解耦，符合现代工程高内测设计，您可以随时在以下位置横向扩展功能：
- **引入新事件**：如要解析新的日志事件，调整 `src/parser/logParser.js`。
- **自定义导出样式**：如需新增 HTML、Markdown 或 PDF 格式文件，在 `src/writers/` 下建立新的写入器，并在 `src/index.js` 中注册调用。
- **扩展 IDE 上下文变量**：如需提取额外的编辑器状态参数，修改 `src/utils/messageParser.js`。

---

## 📜 开源协议

ISC 协议。由 Antigravity 倾情打造。
