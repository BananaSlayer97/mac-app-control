import type { AppConfig, AppInfo } from "../types/app";

export function mergeScriptsIntoApps(installedApps: AppInfo[], cfg: AppConfig): AppInfo[] {
  const scriptApps: AppInfo[] = (cfg.scripts || []).map((script) => ({
    name: script.name,
    path: "Script: " + script.command,
    is_system: false,
    is_script: true,
    command: script.command,
    cwd: script.cwd,
    usage_count: 0,
    category: "Scripts",
    date_modified: Date.now() / 1000,
  }));

  return [...scriptApps, ...installedApps];
}

