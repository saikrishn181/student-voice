import type { Plugin } from "@opencode-ai/plugin"

const EDIT_TOOLS = new Set([
  "write",
  "edit",
  "multiedit",
  "apply_patch",
  "search_replace",
  "create",
  "rename_element",
])

export default (async ({ $, client }) => {
  let syncing = false

  async function sync(trigger: string) {
    if (syncing) return
    syncing = true
    try {
      const status = await $`git status --porcelain`.trim().nothrow()
      if (!status.trim()) return
      const branch = (await $`git branch --show-current`.trim().nothrow()).trim() || "main"
      await $`git add -A`.quiet().nothrow()
      await $`git commit -m "auto: ${trigger}" --no-verify`.quiet().nothrow()
      await $`git push origin ${branch}`.quiet().nothrow()
      await client.app.log({
        body: {
          service: "auto-sync",
          level: "info",
          message: `Committed and pushed changes after ${trigger}`,
        },
      })
    } catch (e) {
      await client.app.log({
        body: { service: "auto-sync", level: "warn", message: String(e) },
      })
    } finally {
      syncing = false
    }
  }

  return {
    "tool.execute.after": async (info: { tool: string }) => {
      if (EDIT_TOOLS.has(info.tool)) {
        await sync(info.tool)
      }
    },
  }
} satisfies Plugin