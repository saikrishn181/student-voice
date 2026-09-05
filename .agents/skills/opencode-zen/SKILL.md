---
name: opencode-zen
description: Generate, refactor, or review code using OpenCode Zen AI models with the user's OpenCode API key.
---

# OpenCode Zen Code Generation Skill

This skill allows Antigravity and the user to leverage OpenCode Zen AI models to generate code, refactor code, and solve technical challenges.

## Available Models
- Free models: `nemotron-3.5-lightning-free`, `nemotron-3-ultra-free`, `mimo-v2.5-free`, `muse-spark-1.2-contributor-free`
- Credit/Paid models (requires workspace billing): `claude-sonnet-4-6`, `gpt-5.4`, `deepseek-v4-pro`, `gemini-3.5-flash`

## How to Use via MCP Tool
Antigravity connects to OpenCode Zen via MCP server configured in `~/.gemini/config/mcp_config.json`.
- Tool name: `opencode_zen_generate_code`
- Tool name: `opencode_zen_list_models`

## How to Use via Terminal / NPM
Run the script directly from the project root:
```bash
# Generate code using default free model
npm run opencode -- "Write a TypeScript debounce function"

# Generate code using specific model
npm run opencode -- --model nemotron-3.5-lightning-free "Write a binary search function"

# List available models
npm run opencode -- --models
```

## API Credentials
Stored in `~/.local/share/opencode/auth.json` or overridden via `OPENCODE_API_KEY` environment variable.
