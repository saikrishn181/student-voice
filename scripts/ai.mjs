#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PROVIDERS = {
  opencode: {
    name: "OpenCode Zen",
    defaultBaseUrl: "https://opencode.ai/zen/v1",
    defaultModel: "nemotron-3.5-lightning-free",
    envKey: "OPENCODE_API_KEY",
    authField: "opencode"
  },
  astra: {
    name: "ExperientialLabs Astra",
    defaultBaseUrl: "https://api.experientiallabs.ai/v1",
    defaultModel: "claude-sonnet-4.6",
    envKey: "ASTRA_API_KEY",
    authField: "astra"
  }
};

function readAuthFile() {
  try {
    const authPath = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
    if (fs.existsSync(authPath)) {
      return JSON.parse(fs.readFileSync(authPath, "utf-8"));
    }
  } catch {}
  return {};
}

function getApiKey(providerKey) {
  const conf = PROVIDERS[providerKey];
  if (!conf) return "";

  if (process.env[conf.envKey] && process.env[conf.envKey].trim().length > 0) {
    return process.env[conf.envKey].trim();
  }

  const auth = readAuthFile();
  if (providerKey === "astra") {
    return (auth?.astra?.key || auth?.experientiallabs?.key || "").trim();
  }
  return (auth?.[conf.authField]?.key || "").trim();
}

function getBaseUrl(providerKey) {
  const conf = PROVIDERS[providerKey];
  if (!conf) return "";
  if (providerKey === "astra") {
    return (process.env.ASTRA_BASE_URL || conf.defaultBaseUrl).replace(/\/+$/, "");
  }
  return (process.env.OPENCODE_BASE_URL || conf.defaultBaseUrl).replace(/\/+$/, "");
}

async function listOpencodeModels(apiKey) {
  const endpoint = `${getBaseUrl("opencode")}/models`;
  const res = await fetch(endpoint, {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to fetch OpenCode models (${res.status}): ${err}`);
    return;
  }
  const data = await res.json();
  const models = (data.data || []).map((m) => m.id);
  const freeModels = models.filter((id) => id.includes("free"));
  const paidModels = models.filter((id) => !id.includes("free"));

  console.log("=== OpenCode Zen Models ===");
  console.log("\nFree Models (No billing setup needed):");
  for (const m of freeModels) {
    console.log(`  - ${m}`);
  }
  console.log("\nCredit Models (Requires workspace billing):");
  for (const m of paidModels.slice(0, 15)) {
    console.log(`  - ${m}`);
  }
  if (paidModels.length > 15) {
    console.log(`  ... and ${paidModels.length - 15} more credit models`);
  }
}

async function listAstraModels(apiKey) {
  const endpoint = `${getBaseUrl("astra")}/models`;
  const res = await fetch(endpoint, {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to fetch Astra models (${res.status}): ${err}`);
    return;
  }
  const data = await res.json();
  const models = (data.data || []).map((m) => m.id);
  const claudeModels = models.filter((m) => m.startsWith("claude"));
  const codeModels = models.filter((m) => m.includes("code") || m.includes("codestral"));
  const deepseekModels = models.filter((m) => m.startsWith("deepseek"));
  const gptModels = models.filter((m) => m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4"));

  console.log("=== ExperientialLabs Astra Models ===");
  console.log("\nClaude Models:");
  for (const m of claudeModels.slice(0, 10)) {
    console.log(`  - ${m}`);
  }
  console.log("\nDedicated Code Models:");
  for (const m of codeModels.slice(0, 10)) {
    console.log(`  - ${m}`);
  }
  console.log("\nDeepSeek Models:");
  for (const m of deepseekModels.slice(0, 10)) {
    console.log(`  - ${m}`);
  }
  console.log("\nGPT Models:");
  for (const m of gptModels.slice(0, 10)) {
    console.log(`  - ${m}`);
  }
  console.log(`\nTotal Astra models available: ${models.length}`);
}

async function generateCode({ provider, model, prompt, temperature, maxTokens }) {
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    console.error(`Error: No API key found for ${PROVIDERS[provider].name}.`);
    console.error(`Please set ${PROVIDERS[provider].envKey} or update ~/.local/share/opencode/auth.json.`);
    process.exit(1);
  }

  const endpoint = `${getBaseUrl(provider)}/chat/completions`;
  process.stderr.write(`Connecting to ${PROVIDERS[provider].name} (${model})...\n\n`);

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
    if (!(provider === "astra" && model.includes("claude-sonnet-4.6") && temperature !== 1.0)) {
      reqBody.temperature = temperature;
    }
  }

  if (maxTokens) {
    reqBody.max_tokens = maxTokens;
  }

  let res;
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reqBody)
    });

    if (res.status === 503 && attempts < 3) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    break;
  }

  if (!res.ok) {
    const errText = await res.text();
    let msg = errText;
    try {
      const errJson = JSON.parse(errText);
      msg = errJson.error?.message || errJson.message || errText;
    } catch {}

    console.error(`Error (${res.status}): ${msg}`);
    if (provider === "opencode" && (msg.includes("CreditsError") || msg.includes("payment method"))) {
      console.error("\nTip: This OpenCode model requires credits. Free models available include:");
      console.error("  - nemotron-3.5-lightning-free");
      console.error("  - nemotron-3-ultra-free");
      console.error("  - deepseek-v4-flash-free");
      console.error("  - mimo-v2.5-free");
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
  console.log("Unified AI Code Generator (OpenCode Zen + ExperientialLabs Astra)");
  console.log("\nUsage:");
  console.log("  node scripts/ai.mjs \"<prompt>\"");
  console.log("  node scripts/ai.mjs --provider astra --model claude-sonnet-4.6 \"<prompt>\"");
  console.log("  node scripts/ai.mjs --provider opencode --model nemotron-3.5-lightning-free \"<prompt>\"");
  console.log("  node scripts/ai.mjs --models");
  console.log("  node scripts/ai.mjs --provider astra --models");
  console.log("\nNPM Shortcuts:");
  console.log("  npm run astra -- \"<prompt>\"");
  console.log("  npm run opencode -- \"<prompt>\"");
  console.log("  npm run ai -- --models");
}

async function main() {
  const args = [...process.argv.slice(2)];

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  let provider = "astra";
  const invokedAs = path.basename(process.argv[1]);
  if (invokedAs === "opencode.mjs" || process.env.AI_DEFAULT_PROVIDER === "opencode") {
    provider = "opencode";
  }

  const providerIdx = args.indexOf("--provider");
  if (providerIdx !== -1 && args[providerIdx + 1]) {
    const p = args[providerIdx + 1].toLowerCase();
    if (p === "opencode" || p === "zen") {
      provider = "opencode";
    } else if (p === "astra" || p === "experientiallabs") {
      provider = "astra";
    }
    args.splice(providerIdx, 2);
  }

  if (args.includes("--models") || args.includes("-l")) {
    const hasExplicitProvider = process.argv.includes("--provider");
    if (hasExplicitProvider && provider === "opencode") {
      const k = getApiKey("opencode");
      if (k) await listOpencodeModels(k);
    } else if (hasExplicitProvider && provider === "astra") {
      const k = getApiKey("astra");
      if (k) await listAstraModels(k);
    } else {
      const ok = getApiKey("opencode");
      if (ok) await listOpencodeModels(ok);
      console.log("\n----------------------------------------\n");
      const ak = getApiKey("astra");
      if (ak) await listAstraModels(ak);
    }
    return;
  }

  let model = PROVIDERS[provider].defaultModel;
  const modelIdx = args.indexOf("--model");
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    model = args[modelIdx + 1];
    args.splice(modelIdx, 2);
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
    console.error("Example: npm run astra -- \"Write a quicksort in TypeScript\"");
    process.exit(1);
  }

  await generateCode({ provider, model, prompt, temperature, maxTokens });
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
