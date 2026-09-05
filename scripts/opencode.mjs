#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_BASE_URL = "https://opencode.ai/zen/v1";
const DEFAULT_MODEL = "nemotron-3.5-lightning-free";

function getApiKey() {
  if (process.env.OPENCODE_API_KEY && process.env.OPENCODE_API_KEY.trim().length > 0) {
    return process.env.OPENCODE_API_KEY.trim();
  }
  try {
    const authPath = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
    if (fs.existsSync(authPath)) {
      const parsed = JSON.parse(fs.readFileSync(authPath, "utf-8"));
      if (parsed?.opencode?.key) {
        return parsed.opencode.key.trim();
      }
    }
  } catch {}
  return "";
}

function getBaseUrl() {
  return (process.env.OPENCODE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function listModels(apiKey) {
  const endpoint = `${getBaseUrl()}/models`;
  const res = await fetch(endpoint, {
    headers: {
      "Authorization": `Bearer ${apiKey}`
    }
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to fetch models (${res.status}): ${err}`);
    process.exit(1);
  }

  const data = await res.json();
  const models = (data.data || []).map((m) => m.id);
  const freeModels = models.filter((id) => id.includes("free"));
  const paidModels = models.filter((id) => !id.includes("free"));

  console.log("=== OpenCode Zen Models ===");
  console.log("\nFree Models (No workspace billing required):");
  for (const m of freeModels) {
    console.log(`  - ${m}`);
  }

  console.log("\nCredit Models (Requires workspace credits):");
  for (const m of paidModels) {
    console.log(`  - ${m}`);
  }
}

async function generateCode(apiKey, model, prompt) {
  const endpoint = `${getBaseUrl()}/chat/completions`;
  process.stderr.write(`Connecting to OpenCode Zen (${model})...\n\n`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert software developer. Write clean, production-ready code with no conversational pleasantries unless asked."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      stream: true
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = errText;
    try {
      const errJson = JSON.parse(errText);
      msg = errJson.error?.message || errJson.message || errText;
    } catch {}

    console.error(`Error (${res.status}): ${msg}`);
    if (msg.includes("CreditsError") || msg.includes("payment method")) {
      console.error("\nTip: This model requires credits. Free models available include:");
      console.error("  - nemotron-3.5-lightning-free");
      console.error("  - nemotron-3-ultra-free");
      console.error("  - mimo-v2.5-free");
      console.error("  - muse-spark-1.2-contributor-free");
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

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("OpenCode Zen Code Generator");
    console.log("Usage:");
    console.log("  node scripts/opencode.mjs \"<prompt>\"");
    console.log("  node scripts/opencode.mjs --model <model-name> \"<prompt>\"");
    console.log("  node scripts/opencode.mjs --models");
    console.log("  npm run opencode -- \"<prompt>\"");
    process.exit(0);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Error: OpenCode API key not found.");
    console.error("Set OPENCODE_API_KEY environment variable or run 'opencode providers login'.");
    process.exit(1);
  }

  if (args.includes("--models") || args.includes("-m-list")) {
    await listModels(apiKey);
    return;
  }

  let model = DEFAULT_MODEL;
  const modelIdx = args.indexOf("--model");
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    model = args[modelIdx + 1];
    args.splice(modelIdx, 2);
  }

  const prompt = args.join(" ").trim();
  if (!prompt) {
    console.error("Error: Please provide a prompt.");
    console.error("Example: node scripts/opencode.mjs \"Write a debounce hook in React\"");
    process.exit(1);
  }

  await generateCode(apiKey, model, prompt);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
