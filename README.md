# Session Converter 🤖

A highly modular, robust, and clean Node.js CLI utility designed to parse, analyze, and format complex Codex and IDE assistant dialogue logs (`.jsonl` files).

## Features

- **Chronological Sorting**: Automatically aligns asynchronous interaction events (user, assistant, tool call, tool output) by chronological timestamps.
- **Dialogue Clean Output**: Formats user queries, active files, and open tabs, alongside Codex responses.
- **Dialogue Super Clean Output**: Ideal for quick chat review, displaying only user request text and final assistant responses.
- **Trace History Output**: Rich execution telemetry including intermediate tool names, JSON arguments, and formatted/truncated tool outputs.
- **Split Turns Directory**: Generates a dedicated folder containing standalone, turn-by-turn files (`turn_01.txt`, `turn_02.txt`, ...) documenting queries, tool calls, and final answers step-by-step.

---

## Directory Structure

```
D:\Code\Other\Session/
├── package.json         # Project setup (ES Modules enabled)
├── README.md            # Usage and system architecture documentation
├── .gitignore           # Ignores large source data and outputs
└── src/
    ├── index.js         # Core orchestrator
    ├── config.js        # Config settings, paths and file system validation
    ├── utils/
    │   ├── formatters.js    # Text truncation and timestamp formatting
    │   └── messageParser.js # Extracts clean query, active file, and open tabs
    ├── parser/
    │   └── logParser.js     # Reads logs, extracts chronological events and turn aggregations
    └── writers/
        ├── dialogueWriter.js  # Writes clean and super clean dialogue logs
        ├── historyWriter.js   # Writes full execution tracing (with tool parameters/outputs)
        └── splitTurnsWriter.js# Writes separate files per conversation turn
```

---

## Usage

### Command Line Interface (CLI)

Run the script by passing the target `.jsonl` path:

```bash
npm run convert -- <path_to_jsonl_file>
```

Alternatively, run with direct node execution:

```bash
node src/index.js <path_to_jsonl_file>
```

### Auto-detection Flow
If no path is specified:
1. It looks for a default rollout file defined in `src/config.js`.
2. If the default file is missing, it scans the current directory for `.jsonl` files and automatically picks the **largest** one by default (ideal for parsing active trace sessions).

---

## Extensibility

This project is fully designed with highly testable, independent modules. If you want to:
- Add a new event type (e.g. agent communication, subagent telemetry), modify `src/parser/logParser.js`.
- Customize output styling or add markdown/HTML generation, add a new writer class in `src/writers/` and register it inside `src/index.js`.
- Add parsing for additional IDE variables, adjust `src/utils/messageParser.js`.

---

## License

ISC License. Made with ❤️ by Antigravity.
