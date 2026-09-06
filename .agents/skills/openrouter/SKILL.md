---
name: openrouter
description: Generate, refactor, or review code using OpenRouter AI models with the user's OpenRouter API key.
---

# OpenRouter AI Code Generation Skill

This skill allows Antigravity and the user to leverage OpenRouter AI models to generate code, refactor code, and solve technical challenges.

## 1. Provider Configuration
- Endpoint: `https://openrouter.ai/api/v1`
- Credentials: Stored in `~/.local/share/opencode/auth.json` (openrouter key) or `OPENROUTER_API_KEY`
- Default Model: `openrouter/free` (automatically routes to available high-performing free models)

## 2. Available Free Models
- `openrouter/free` (Recommended default)
- `nvidia/nemotron-3.5-lightning:free`
- `nvidia/nemotron-3-super-120b-a12b:free`
- `google/gemma-4-26b-a4b-it:free`
- `z-ai/glm-5.2:free`
- `minimax/minimax-m3:free`
- `cohere/north-mini-code:free`

## 3. Premium Models (When credits added)
- `anthropic/claude-3.7-sonnet`
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4o`
- `deepseek/deepseek-r1`
- `deepseek/deepseek-chat`
- `qwen/qwen-2.5-coder-32b-instruct`

## CLI and NPM Commands
```bash
# Generate code using default free model
npm run openrouter -- "Write a debounce hook in React"

# Generate code using specific model
npm run openrouter -- --model nvidia/nemotron-3.5-lightning:free "Write a binary search function"

# List available models
npm run openrouter -- --models
```

## Antigravity MCP Integration
Configured in `~/.gemini/config/mcp_config.json`:
- Server: `openrouter`
- Tool: `openrouter_generate_code`
- Tool: `openrouter_list_models`
