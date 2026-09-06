#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openrouter/free";

function readAuthFile() {
  try {
    const authPath = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
    if (fs.existsSync(authPath)) {
      return JSON.parse(fs.readFileSync(authPath, "utf-8"));
    }
  } catch {}
  return {};
}

function getApiKey() {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0) {
    return process.env.OPENROUTER_API_KEY.trim();
  }
  const auth = readAuthFile();
  return (auth?.openrouter?.key || "").trim();
}

function getBaseUrl() {
  return (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function listModels(apiKey) {
  const endpoint = `${getBaseUrl()}/models`;
  const res = await fetch(endpoint, {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to fetch OpenRouter models (${res.status}): ${err}`);
    return;
  }
  const data = await res.json();
  const allModels = data.data || [];
  const freeModels = allModels.filter((m) => m.id.endsWith(":free") || (m.pricing && m.pricing.prompt === "0" && m.pricing.completion === "0"));
  const popularPaid = allModels.filter((m) => !m.id.endsWith(":free") && (
    m.id.includes("claude-3.7") ||
    m.id.includes("claude-3.5-sonnet") ||
    m.id.includes("gpt-4o") ||
    m.id.includes("deepseek-r1") ||
    m.id.includes("deepseek-chat") ||
    m.id.includes("qwen-2.5-coder")
  ));

  console.log("=== OpenRouter Models ===");
  console.log("\nFree Models (Active with no credits required):");
  console.log("  - openrouter/free (Automatic smart routing to available free models)");
  for (const m of freeModels) {
    console.log(`  - ${m.id}`);
  }

  console.log("\nPopular Premium Models (Requires account credits):");
  for (const m of popularPaid.slice(0, 15)) {
    console.log(`  - ${m.id}`);
  }
  console.log(`\nTotal OpenRouter models catalog: ${allModels.length}`);
}

async function generateCode({ model, prompt, temperature, maxTokens }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Error: No OpenRouter API key found.");
    console.error("Please set OPENROUTER_API_KEY environment variable or configure ~/.local/share/opencode/auth.json.");
    process.exit(1);
  }

  const endpoint = `${getBaseUrl()}/chat/completions`;
  process.stderr.write(`Connecting to OpenRouter (${model})...\n\n`);

  const reqBody = {
    model,
    messages: [
      {
        role: "system",
        content: "You are an expert software engineer. Write clean, production-ready code with no conversational pleasantries unless asked."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    stream: true
  };

  if (typeof temperature === "number") {
    reqBody.temperature = temperature;
  }
  if (maxTokens) {
    reqBody.max_tokens = maxTokens;
  }

  let res;
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/saikrishn181/student-voice",
          "X-Title": "Student Voice"
        },
        body: JSON.stringify(reqBody)
      });
      if ((res.status === 503 || res.status === 429) && attempts < 3) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      break;
    } catch (err) {
      if (attempts < 3) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw err;
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    let msg = errText;
    try {
      const errJson = JSON.parse(errText);
      msg = errJson.error?.message || errJson.message || errText;
    } catch {}

    console.error(`Error (${res.status}): ${msg}`);
    if (msg.includes("credit") || msg.includes("payment") || res.status === 402) {
      console.error("\nTip: This model requires credits. You can use free models instead:");
      console.error("  - openrouter/free");
      console.error("  - nvidia/nemotron-3.5-lightning:free");
      console.error("  - z-ai/glm-5.2:free");
    }
    process.exit(1);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta;
          const text = delta?.content || delta?.reasoning || "";
          if (text) {
            process.stdout.write(text);
          }
        } catch {}
      }
    }
  }
  process.stdout.write("\n");
}

function printHelp() {
  console.log("OpenRouter AI Code Generator");
  console.log("\nUsage:");
  console.log("  node scripts/ai.mjs \"<prompt>\"");
  console.log("  node scripts/ai.mjs --model openrouter/free \"<prompt>\"");
  console.log("  node scripts/ai.mjs --model nvidia/nemotron-3.5-lightning:free \"<prompt>\"");
  console.log("  node scripts/ai.mjs --model anthropic/claude-3.5-sonnet \"<prompt>\"");
  console.log("  node scripts/ai.mjs --models");
  console.log("\nNPM Shortcuts:");
  console.log("  npm run ai -- \"<prompt>\"");
  console.log("  npm run openrouter -- \"<prompt>\"");
  console.log("  npm run openrouter -- --models");
}

async function main() {
  const args = [...process.argv.slice(2)];

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Error: No OpenRouter API key configured in auth.json or OPENROUTER_API_KEY.");
    process.exit(1);
  }

  if (args.includes("--models") || args.includes("-l")) {
    await listModels(apiKey);
    return;
  }

  let model = DEFAULT_MODEL;
  const modelIdx = args.indexOf("--model");
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    model = args[modelIdx + 1];
    args.splice(modelIdx, 2);
  }

  const providerIdx = args.indexOf("--provider");
  if (providerIdx !== -1) {
    args.splice(providerIdx, 2);
  }

  let temperature;
  const tempIdx = args.indexOf("--temperature");
  if (tempIdx !== -1 && args[tempIdx + 1]) {
    temperature = parseFloat(args[tempIdx + 1]);
    args.splice(tempIdx, 2);
  }

  let maxTokens;
  const maxIdx = args.indexOf("--max-tokens");
  if (maxIdx !== -1 && args[maxIdx + 1]) {
    maxTokens = parseInt(args[maxIdx + 1], 10);
    args.splice(maxIdx, 2);
  }

  const prompt = args.join(" ").trim();
  if (!prompt) {
    console.error("Error: Please provide a prompt.");
    console.error("Example: npm run openrouter -- \"Write a quicksort in TypeScript\"");
    process.exit(1);
  }

  await generateCode({ model, prompt, temperature, maxTokens });
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
