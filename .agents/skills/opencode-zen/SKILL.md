---
name: opencode-zen
description: Generate, refactor, or review code using OpenCode Zen and ExperientialLabs Astra AI models.
---

# AI Code Generation Skill (OpenCode Zen & ExperientialLabs Astra)

This skill allows Antigravity and the user to leverage OpenCode Zen and ExperientialLabs Astra AI models to generate code, refactor code, and solve technical challenges.

## 1. ExperientialLabs Astra Provider
- Endpoint: `https://api.experientiallabs.ai/v1`
- Credentials: Stored in `~/.local/share/opencode/auth.json` (astra key) or `ASTRA_API_KEY`
- Default Model: `gpt-6-astra`
- Supported Models:
  - Claude: `claude-sonnet-4.6`, `claude-sonnet-4`, `claude-3-haiku`, `claude-opus-4.6`
  - Dedicated Code: `codestral-2508`, `qwen3-coder-flash`, `gpt-5.2-codex`, `kat-coder-pro-v2.5`
  - DeepSeek: `deepseek-v4-pro`, `deepseek-r1`, `deepseek-v3.2`
  - GPT: `gpt-4o-mini`, `gpt-4o`, `gpt-5.4`, `gpt-5.5`
  - Gemini: `gemini-2.5-flash`, `gemini-3.8-flash`

## 2. OpenCode Zen Provider
- Endpoint: `https://opencode.ai/zen/v1`
- Credentials: Stored in `~/.local/share/opencode/auth.json` (opencode key) or `OPENCODE_API_KEY`
- Default Model: `nemotron-3.5-lightning-free`
- Free Models: `nemotron-3.5-lightning-free`, `nemotron-3-ultra-free`, `deepseek-v4-flash-free`, `mimo-v2.5-free`
- Workspace Credit Models: `claude-sonnet-4-6`, `gpt-5.4`, `deepseek-v4-pro`

## CLI and NPM Commands
Run commands directly from the project root:

```bash
# ExperientialLabs Astra (default: claude-sonnet-4.6)
npm run astra -- "Write a debounce function in TypeScript"

# ExperientialLabs Astra with specific model
npm run astra -- --model codestral-2508 "Write a binary search function"
npm run astra -- --model deepseek-v4-pro "Explain event bubbling"

# OpenCode Zen (default: nemotron-3.5-lightning-free)
npm run opencode -- "Write a React hook for local storage"

# List available models
npm run astra -- --models
npm run opencode -- --models
npm run ai -- --models
```

## Antigravity MCP Integration
Configured in `~/.gemini/config/mcp_config.json`:
- `opencode-zen`: provides `opencode_zen_generate_code`, `opencode_zen_list_models`
- `astra`: provides `astra_generate_code`, `astra_list_models`
