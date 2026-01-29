use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::config::{load_config, save_config};

static APP_CACHE: Lazy<Mutex<Vec<AppInfo>>> = Lazy::new(|| Mutex::new(Vec::new()));

#[derive(Serialize, Deserialize, Clone)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    pub is_system: bool,
    pub category: Option<String>,
    pub usage_count: u32,
    pub icon_data: Option<String>,
    pub date_modified: u64,
}

#[tauri::command]
pub fn launch_app(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err("App not found".to_string());
    }

    let status = Command::new("open")
        .arg(&path)
        .status()
        .map_err(|e| format!("Failed to execute open: {}", e))?;
    if !status.success() {
        return Err("Failed to launch app".to_string());
    }

    let mut config = load_config();
    let count = config.usage_counts.entry(path.clone()).or_insert(0);
    *count += 1;
    save_config(&config);
    Ok(())
}

#[tauri::command]
pub fn get_installed_apps(refresh: Option<bool>) -> Vec<AppInfo> {
    let mut cached = APP_CACHE.lock();
    if !cached.is_empty() && !refresh.unwrap_or(false) {
        let config = load_config();
        let updated: Vec<AppInfo> = cached
            .iter()
            .filter(|app| Path::new(&app.path).exists())
            .map(|app| {
                let mut next = app.clone();
                next.category = config.categories.get(&next.path).cloned();
                next.usage_count = *config.usage_counts.get(&next.path).unwrap_or(&0);
                next
            })
            .collect();
        *cached = updated.clone();
        return updated;
    }

    let mut apps = Vec::new();
    let config = load_config();

    let output = Command::new("mdfind")
        .arg("-onlyin")
        .arg("/Applications")
        .arg("-onlyin")
        .arg("/System/Applications")
        .arg("-onlyin")
        .arg(format!("{}/Applications", home::home_dir().unwrap_or_default().display()))
        .arg("kMDItemContentTypeTree == 'com.apple.application-bundle'")
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut seen_paths = std::collections::HashSet::new();

        for path_str in stdout.lines() {
            let path_buf = PathBuf::from(path_str);
            if !path_str.contains(".app/Contents/")
                && path_buf.extension().map_or(false, |ext| ext == "app")
            {
                let path = path_buf.to_string_lossy().to_string();
                if seen_paths.contains(&path) {
                    continue;
                }
                seen_paths.insert(path.clone());

                if let Some(name) = path_buf.file_stem().and_then(|s| s.to_str()) {
                    let is_system = path.starts_with("/System/Applications")
                        || path.starts_with("/Applications/Utilities");
                    let category = config.categories.get(&path).cloned();
                    let usage_count = *config.usage_counts.get(&path).unwrap_or(&0);
                    let icon_data = None;

                    let date_modified = fs::metadata(&path)
                        .and_then(|m| m.modified())
                        .map(|t| {
                            t.duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs()
                        })
                        .unwrap_or(0);

                    apps.push(AppInfo {
                        name: name.to_string(),
                        path,
                        is_system,
                        category,
                        usage_count,
                        icon_data,
                        date_modified,
                    });
                }
            }
        }
    }
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    *cached = apps.clone();
    apps
}


#[tauri::command]
pub fn reveal_in_finder(path: String) {
    let _ = Command::new("open").arg("-R").arg(path).spawn();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prunes_nonexistent_cached_apps() {
        let existing_app = std::env::temp_dir().join("macappcontrol_test_existing.app");
        let _ = fs::remove_dir_all(&existing_app);
        fs::create_dir_all(&existing_app).unwrap();

        let missing_app = std::env::temp_dir().join("macappcontrol_test_missing.app");
        let _ = fs::remove_dir_all(&missing_app);

        {
            let mut cache = APP_CACHE.lock();
            *cache = vec![
                AppInfo {
                    name: "Existing".to_string(),
                    path: existing_app.to_string_lossy().to_string(),
                    is_system: false,
                    category: None,
                    usage_count: 0,
                    icon_data: None,
                    date_modified: 0,
                },
                AppInfo {
                    name: "Missing".to_string(),
                    path: missing_app.to_string_lossy().to_string(),
                    is_system: false,
                    category: None,
                    usage_count: 0,
                    icon_data: None,
                    date_modified: 0,
                },
            ];
        }

        let result = get_installed_apps(Some(false));
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "Existing");

        let _ = fs::remove_dir_all(&existing_app);
        APP_CACHE.lock().clear();
    }
}
