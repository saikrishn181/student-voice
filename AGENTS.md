# Custom AI Model Routing Policy

## Primary Code Generation Engines
All substantive code generation, architectural implementations, and refactoring in this repository should leverage the user's configured API models:

1. **ExperientialLabs Astra** (Default engine):
   - CLI execution: `node scripts/ai.mjs --provider astra --model claude-sonnet-4.6 "<prompt>"`
   - Fast code completions: `node scripts/ai.mjs --provider astra --model codestral-2508 "<prompt>"`
   - Reasoning: `node scripts/ai.mjs --provider astra --model deepseek-v4-pro "<prompt>"`

2. **OpenCode Zen**:
   - CLI execution: `node scripts/ai.mjs --provider opencode --model nemotron-3.5-lightning-free "<prompt>"`

## Workflow
When implementing features or refactoring files, consult the Astra / OpenCode engine for the code generation, verify the output, and ensure zero regressions against test suites.
