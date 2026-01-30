use std::fs;
use std::process::Command;

use crate::config::{load_config, save_config, ScriptAction};

#[tauri::command]
pub fn run_script(command: String, cwd: Option<String>) {
    let mut full_command = String::new();
    full_command.push_str("#!/bin/sh\n");
    full_command.push_str("echo 'Running Custom Script...'\n");

    if let Some(path) = cwd {
        if !path.trim().is_empty() {
            full_command.push_str(&format!("cd \"{}\" || exit\n", path));
            full_command.push_str(&format!("echo 'Changed directory to: {}'\n", path));
        }
    }

    full_command.push_str(&format!("{}\n", command));
    full_command.push_str("echo '\n-----------------------------------'\n");
    full_command.push_str("echo 'Script finished. Press any key to close.'\n");
    full_command.push_str("read -n 1\n");

    let temp_dir = std::env::temp_dir();
    let file_path =
        temp_dir.join(format!("macappcontrol_script_{}.command", chrono::Utc::now().timestamp_millis()));

    if fs::write(&file_path, full_command).is_ok() {
        let _ = Command::new("chmod").arg("+x").arg(&file_path).status();
        let _ = Command::new("open").arg(file_path).spawn();
    }
}

#[tauri::command]
pub fn add_script(app: tauri::AppHandle, name: String, command: String, cwd: Option<String>) {
    let mut config = load_config();
    config.scripts.push(ScriptAction { name, command, cwd });
    save_config(&config);
    crate::update_tray_menu(&app);
}

#[tauri::command]
pub fn remove_script(app: tauri::AppHandle, name: String) {
    let mut config = load_config();
    config.scripts.retain(|s| s.name != name);
    save_config(&config);
    crate::update_tray_menu(&app);
}

#[tauri::command]
pub fn update_script(
    app: tauri::AppHandle,
    original_name: String,
    name: String,
    command: String,
    cwd: Option<String>,
) {
    let mut config = load_config();
    config
        .scripts
        .retain(|s| s.name != original_name && s.name != name);
    config.scripts.push(ScriptAction { name, command, cwd });
    save_config(&config);
    crate::update_tray_menu(&app);
}
