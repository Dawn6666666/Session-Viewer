# Session Converter 🤖

一个高度模块化、健壮且整洁的 Node.js CLI 工具，专为解析、分析和格式化 Codex 和 IDE 助手对话日志（`.jsonl` 文件）而设计。

## 功能特性

- **按时间线严格排序**：自动将异步交互事件（用户输入、助手回复、工具调用、工具输出）按时间戳进行精确排序。
- **干净对话输出 (Dialogue Clean)**：格式化输出用户提问、活动文件、打开的标签页以及 AI 助手的完整回复。
- **极简对话输出 (Dialogue Super Clean)**：非常适合快速浏览，仅显示用户的问题正文与 Codex 的最终解答。
- **完整历史追踪 (Trace History)**：包含丰富的执行遥测数据，包括中间执行的工具名称、JSON 参数、以及格式化和截断后的工具输出。
- **分轮次输出目录 (Split Turns)**：生成一个专属文件夹，为每轮对话创建独立文件（`turn_01.txt`, `turn_02.txt`, ...），详尽记录该轮的问题、所有工具调用细节与最终解答。

---

## 目录结构

```
D:\Code\Other\Session/
├── package.json         # 项目配置文件（已启用 ES Modules）
├── README.md            # 项目中文使用与架构说明文档
├── .gitignore           # 忽略大体积原始日志与生成的文本文档
└── src/
    ├── index.js         # 核心协调器 (Orchestrator)
    ├── config.js        # 配置解析、路径计算与文件系统验证
    ├── utils/
    │   ├── formatters.js    # 文本截断与时间戳格式化工具函数
    │   └── messageParser.js # 提取 IDE 上下文及清洗用户提问正文
    ├── parser/
    │   └── logParser.js     # 流式读取日志，提取时间线事件并聚合 Turn
    └── writers/
        ├── dialogueWriter.js  # 写入 Clean 和 Super Clean 对话日志
        ├── historyWriter.js   # 写入包含工具调用的 verbose 轨迹文件
        └── splitTurnsWriter.js# 写入分轮次文件的专属写入器
```

---

## 使用指南

### 命令行运行 (CLI)

运行脚本并传入目标 `.jsonl` 文件的路径：

```bash
npm run convert -- <path_to_jsonl_file>
```

或者使用 node 直接执行：

```bash
node src/index.js <path_to_jsonl_file>
```

### 自动探测机制
如果您没有指定任何路径：
1. 工具会首先在当前运行目录下寻找在 `src/config.js` 里定义的默认 rollout 文件。
2. 如果该默认文件不存在，工具将自动扫描当前终端工作目录中的所有 `.jsonl` 文件，并默认挑选**体积最大**的一个进行解析（特别适合快速分析当前活动的会话日志）。

---

## 扩展性

本项目专为高可测试性、独立的解耦模块而设计。如果您需要：
- 新增事件类型（例如：代理通信、子代理遥测），修改 `src/parser/logParser.js`。
- 自定义输出格式或添加 Markdown/HTML 导出，在 `src/writers/` 中新建写入模块，并在 `src/index.js` 中引入注册。
- 解析其他 IDE 上下文变量，调整 `src/utils/messageParser.js`。

---

## 开源协议

ISC 协议。由 Antigravity 倾情打造 ❤️。
