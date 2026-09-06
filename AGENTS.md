# Custom AI Model Routing Policy

## Primary Code Generation Engine: OpenRouter
All substantive code generation, architectural implementations, and refactoring in this repository should leverage the user's configured OpenRouter models:

- **Default Engine**: OpenRouter (`openrouter/free` or `nvidia/nemotron-3.5-lightning:free`)
  - CLI execution: `npm run openrouter -- "<prompt>"`
  - Or directly: `node scripts/ai.mjs "<prompt>"`
  - With specific model: `node scripts/ai.mjs --model <model-id> "<prompt>"`

## Workflow
When implementing features or refactoring files, consult the OpenRouter engine for the code generation, verify the output, and ensure zero regressions against test suites.
