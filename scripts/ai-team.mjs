#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

function readApiKey() {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0) {
    return process.env.OPENROUTER_API_KEY.trim();
  }
  try {
    const authPath = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
    if (fs.existsSync(authPath)) {
      const parsed = JSON.parse(fs.readFileSync(authPath, "utf-8"));
      if (parsed?.openrouter?.key) {
        return parsed.openrouter.key.trim();
      }
    }
  } catch {}
  return "";
}

async function callModel(apiKey, model, systemPrompt, userPrompt) {
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const res = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/saikrishn181/student-voice",
          "X-Title": "Student Voice AI Team"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2
        })
      });

      if ((res.status === 503 || res.status === 429) && attempts < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const json = JSON.parse(text);
          msg = json.error?.message || json.message || text;
        } catch {}
        return { error: `HTTP ${res.status}: ${msg}` };
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || "";
      return { content: content.trim() };
    } catch (err) {
      if (attempts < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return { error: err.message };
    }
  }
  return { error: "Exceeded max retry attempts" };
}

function loadConfig(configPath) {
  const p = path.resolve(process.cwd(), configPath || "ai-team.json");
  if (!fs.existsSync(p)) {
    console.error(`Error: Configuration file not found at ${p}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (err) {
    console.error(`Error parsing ${p}:`, err.message);
    process.exit(1);
  }
}

async function runParallel(apiKey, agents) {
  console.log(`\nStarting execution for ${agents.length} specialized AIs in parallel...\n`);
  const promises = agents.map(async (agent, idx) => {
    console.log(`[AI ${idx + 1}: ${agent.name}] Model: ${agent.model}`);
    console.log(`[AI ${idx + 1}: ${agent.name}] Task: ${agent.task.slice(0, 80)}...`);

    const result = await callModel(apiKey, agent.model, agent.systemPrompt, agent.task);
    if (result.error) {
      console.error(`\n[AI ${idx + 1}: ${agent.name}] Failed: ${result.error}`);
      return { ...agent, error: result.error };
    }

    console.log(`\n[AI ${idx + 1}: ${agent.name}] Completed successfully (${result.content.length} chars)`);

    if (agent.outputFile) {
      const outPath = path.resolve(process.cwd(), agent.outputFile);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, result.content + "\n");
      console.log(`[AI ${idx + 1}: ${agent.name}] Output written to ${agent.outputFile}`);
    }

    return { ...agent, output: result.content };
  });

  return Promise.all(promises);
}

async function runPipeline(apiKey, agents) {
  console.log(`\nStarting pipeline execution (${agents.length} stages)...\n`);
  let previousOutput = "";

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`----------------------------------------`);
    console.log(`Stage ${i + 1}/${agents.length}: ${agent.name} (${agent.model})`);
    console.log(`Task: ${agent.task.slice(0, 80)}...`);

    const combinedTask = previousOutput
      ? `${agent.task}\n\n=== Context from previous AI worker (${agents[i - 1].name}) ===\n${previousOutput}`
      : agent.task;

    const result = await callModel(apiKey, agent.model, agent.systemPrompt, combinedTask);
    if (result.error) {
      console.error(`Stage ${i + 1} Failed: ${result.error}`);
      process.exit(1);
    }

    console.log(`Stage ${i + 1} Completed successfully (${result.content.length} chars)`);

    if (agent.outputFile) {
      const outPath = path.resolve(process.cwd(), agent.outputFile);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, result.content + "\n");
      console.log(`Output written to ${agent.outputFile}`);
    }

    previousOutput = result.content;
  }
  console.log(`\nPipeline finished successfully.`);
}

async function main() {
  const args = process.argv.slice(2);
  const apiKey = readApiKey();
  if (!apiKey) {
    console.error("Error: No OpenRouter API key found in auth.json or OPENROUTER_API_KEY.");
    process.exit(1);
  }

  let configFile = "ai-team.json";
  const configIdx = args.indexOf("--config");
  if (configIdx !== -1 && args[configIdx + 1]) {
    configFile = args[configIdx + 1];
  }

  const isPipeline = args.includes("--pipeline");
  const isAgent = args.includes("--agent");

  const config = loadConfig(configFile);
  const agents = config.agents || [];

  if (agents.length === 0) {
    console.error("Error: No agents defined in config file.");
    process.exit(1);
  }

  if (isAgent) {
    const agentName = args[args.indexOf("--agent") + 1];
    const target = agents.find((a) => a.name.toLowerCase() === (agentName || "").toLowerCase());
    if (!target) {
      console.error(`Error: Agent '${agentName}' not found in ${configFile}.`);
      console.log("Available agents:", agents.map((a) => a.name).join(", "));
      process.exit(1);
    }

    const customPromptIdx = args.findIndex((a, idx) => idx > args.indexOf("--agent") + 1 && !a.startsWith("-"));
    const prompt = customPromptIdx !== -1 ? args.slice(customPromptIdx).join(" ") : target.task;

    console.log(`Running single AI: ${target.name} (${target.model})`);
    const res = await callModel(apiKey, target.model, target.systemPrompt, prompt);
    if (res.error) {
      console.error("Error:", res.error);
      process.exit(1);
    }
    console.log("\n=== Output ===\n");
    console.log(res.content);
    return;
  }

  if (isPipeline) {
    await runPipeline(apiKey, agents);
  } else {
    await runParallel(apiKey, agents);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
