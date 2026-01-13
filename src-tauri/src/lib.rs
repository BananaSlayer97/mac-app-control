use serde::{Serialize, Deserialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::collections::HashMap;
use base64::{Engine as _, engine::general_purpose};
use chrono;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
    AppHandle,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Code, Modifiers, Shortcut};
use once_cell::sync::Lazy;
use parking_lot::Mutex;


static APP_CACHE: Lazy<Mutex<Vec<AppInfo>>> = Lazy::new(|| Mutex::new(Vec::new()));


#[derive(Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub categories: HashMap<String, String>,
    pub usage_counts: HashMap<String, u32>,
    pub user_categories: Vec<String>,
    pub shortcut: String,
    #[serde(default)]
    pub scripts: Vec<ScriptAction>,
    #[serde(default)]
    pub category_order: Vec<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        let core_categories = vec![
            "All".to_string(),
            "Frequent".to_string(),
            "Scripts".to_string(),
            "Development".to_string(),
            "Social".to_string(),
            "Design".to_string(),
            "Productivity".to_string(),
            "User Apps".to_string(),
            "System".to_string(),
        ];
        Self {
            categories: HashMap::new(),
            usage_counts: HashMap::new(),
            user_categories: vec![
                "Development".to_string(),
                "Social".to_string(),
                "Design".to_string(),
                "Productivity".to_string(),
            ],
            shortcut: "Alt+Space".to_string(),
            scripts: vec![],
            category_order: core_categories,
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AppInfo {
    name: String,
    path: String,
    is_system: bool,
    category: Option<String>,
    usage_count: u32,
    icon_data: Option<String>,
    date_modified: u64, // Timestamp in seconds
}

fn get_config_path() -> PathBuf {
    let mut path = home::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("Library/Application Support/MacAppControl");
    let _ = fs::create_dir_all(&path);
    path
}

fn load_config() -> AppConfig {
    let mut path = get_config_path();
    path.push("config.json");
    let mut config: AppConfig = if let Ok(content) = fs::read_to_string(path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    };

    // If category_order is empty (migration for existing users), populate it
    if config.category_order.is_empty() {
        let mut default_order = vec![
            "All".to_string(),
            "Frequent".to_string(),
            "Scripts".to_string(),
            "Development".to_string(),
            "Social".to_string(),
            "Design".to_string(),
            "Productivity".to_string(),
            "User Apps".to_string(),
            "System".to_string(),
        ];
        // Add any user categories that are not in the default order
        for cat in &config.user_categories {
            if !default_order.contains(cat) {
                default_order.push(cat.clone());
            }
        }
        config.category_order = default_order;
    }
    config
}

fn save_config(config: &AppConfig) {
    let mut path = get_config_path();
    path.push("config.json");
    if let Ok(content) = serde_json::to_string_pretty(config) {
        let _ = fs::write(path, content);
    }
}

fn get_cache_dir() -> PathBuf {
    let mut path = get_config_path();
    path.push("icons");
    let _ = fs::create_dir_all(&path);
    path
}

#[tauri::command]
fn get_app_icon(path: String) -> Option<String> {
    get_app_icon_cached(&path)
}

fn get_app_icon_cached(app_path: &str) -> Option<String> {
    let cache_dir = get_cache_dir();
    let hashed_name = format!("{:x}", md5::compute(app_path));
    let cache_path = cache_dir.join(format!("{}.png", hashed_name));

    // Return cached if exists
    if cache_path.exists() {
        if let Ok(data) = fs::read(&cache_path) {
            return Some(format!("data:image/png;base64,{}", general_purpose::STANDARD.encode(data)));
        }
    }

    // Official macOS API via Swift one-liner
    let swift_code = format!(
        "import AppKit; \
         let img = NSWorkspace.shared.icon(forFile: \"{}\"); \
         img.size = NSSize(width: 128, height: 128); \
         guard let tiff = img.tiffRepresentation, \
               let bitmap = NSBitmapImageRep(data: tiff), \
               let data = bitmap.representation(using: .png, properties: [:]) \
         else {{ exit(1) }}; \
         try! data.write(to: URL(fileURLWithPath: \"{}\"))",
        app_path.replace("\"", "\\\""),
        cache_path.to_str().unwrap_or_default().replace("\"", "\\\"")
    );

    let status = Command::new("swift")
        .arg("-e")
        .arg(swift_code)
        .status();

    if let Ok(s) = status {
        if s.success() {
            if let Ok(data) = fs::read(&cache_path) {
                return Some(format!("data:image/png;base64,{}", general_purpose::STANDARD.encode(data)));
            }
        }
    }
    None
}

// Helper to parse shortcut string like "Alt+Space" or "Command+P"
fn parse_shortcut(s: &str) -> Option<Shortcut> {
    let parts: Vec<&str> = s.split('+').collect();
    if parts.len() != 2 { return None; }
    
    let modifier = match parts[0].to_lowercase().as_str() {
        "alt" | "option" => Some(Modifiers::ALT),
        "command" | "cmd" | "super" => Some(Modifiers::SUPER),
        "control" | "ctrl" => Some(Modifiers::CONTROL),
        "shift" => Some(Modifiers::SHIFT),
        _ => None,
    }?;

    let code = match parts[1].to_lowercase().as_str() {
        "space" => Some(Code::Space),
        "a" => Some(Code::KeyA), "b" => Some(Code::KeyB), "c" => Some(Code::KeyC),
        "d" => Some(Code::KeyD), "e" => Some(Code::KeyE), "f" => Some(Code::KeyF),
        "g" => Some(Code::KeyG), "h" => Some(Code::KeyH), "i" => Some(Code::KeyI),
        "j" => Some(Code::KeyJ), "k" => Some(Code::KeyK), "l" => Some(Code::KeyL),
        "m" => Some(Code::KeyM), "n" => Some(Code::KeyN), "o" => Some(Code::KeyO),
        "p" => Some(Code::KeyP), "q" => Some(Code::KeyQ), "r" => Some(Code::KeyR),
        "s" => Some(Code::KeyS), "t" => Some(Code::KeyT), "u" => Some(Code::KeyU),
        "v" => Some(Code::KeyV), "w" => Some(Code::KeyW), "x" => Some(Code::KeyX),
        "y" => Some(Code::KeyY), "z" => Some(Code::KeyZ),
        _ => None,
    }?;

    Some(Shortcut::new(Some(modifier), code))
}

fn register_app_shortcut(app: &AppHandle, shortcut_str: &str) {
    if let Some(shortcut) = parse_shortcut(shortcut_str) {
        let _ = app.global_shortcut().unregister_all();
        let app_handle = app.clone();
        let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                if let Some(window) = app_handle.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        });
    }
}

#[tauri::command]
fn save_config_command(config: AppConfig) {
    save_config(&config);
}

#[tauri::command]
fn get_config() -> AppConfig {
    load_config()
}

#[tauri::command]
fn add_category(category: String) {
    let mut config = load_config();
    if !config.user_categories.contains(&category) {
        config.user_categories.push(category);
        save_config(&config);
    }
}

#[tauri::command]
fn remove_category(category: String) {
    let mut config = load_config();
    config.user_categories.retain(|c| c != &category);
    config.categories.retain(|_, v| v != &category);
    save_config(&config);
}

#[tauri::command]
fn update_shortcut(app_handle: AppHandle, shortcut: String) {
    let mut config = load_config();
    config.shortcut = shortcut.clone();
    save_config(&config);
    register_app_shortcut(&app_handle, &shortcut);
}

#[tauri::command]
fn update_app_category(path: String, category: String) {
    let mut config = load_config();
    config.categories.insert(path, category);
    save_config(&config);
}

#[tauri::command]
fn launch_app(path: String) {
    let mut config = load_config();
    let count = config.usage_counts.entry(path.clone()).or_insert(0);
    *count += 1;
    save_config(&config);

    let _ = Command::new("open").arg(path).spawn();
}

fn guess_category(app_path: &str) -> Option<String> {
    // 1. Try to get official category from Info.plist
    let info_plist = Path::new(app_path).join("Contents/Info.plist");
    if info_plist.exists() {
        if let Ok(output) = Command::new("plutil")
            .arg("-extract").arg("LSApplicationCategoryType").arg("raw").arg(&info_plist)
            .output() {
            if output.status.success() {
                let cat_id = String::from_utf8_lossy(&output.stdout).trim().to_lowercase();
                if cat_id.contains("developer-tools") { return Some("Development".to_string()); }
                if cat_id.contains("social-networking") { return Some("Social".to_string()); }
                if cat_id.contains("graphics-design") || cat_id.contains("photography") || cat_id.contains("video") { return Some("Design".to_string()); }
                if cat_id.contains("productivity") || cat_id.contains("business") || cat_id.contains("finance") || cat_id.contains("utilities") { return Some("Productivity".to_string()); }
            }
        }
    }

    None
}

#[tauri::command]
fn get_installed_apps(refresh: Option<bool>) -> Vec<AppInfo> {
    let mut cached = APP_CACHE.lock();
    if !cached.is_empty() && !refresh.unwrap_or(false) {
        return cached.clone();
    }

    let mut apps = Vec::new();
    let config = load_config();
    
    let output = Command::new("mdfind")
        .arg("-onlyin").arg("/Applications")
        .arg("-onlyin").arg("/System/Applications")
        .arg("-onlyin").arg(format!("{}/Applications", home::home_dir().unwrap_or_default().display()))
        .arg("kMDItemContentTypeTree == 'com.apple.application-bundle'")
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut seen_paths = std::collections::HashSet::new();

        for path_str in stdout.lines() {
            let path_buf = PathBuf::from(path_str);
            if !path_str.contains(".app/Contents/") && path_buf.extension().map_or(false, |ext| ext == "app") {
                let path = path_buf.to_string_lossy().to_string();
                if seen_paths.contains(&path) { continue; }
                seen_paths.insert(path.clone());

                if let Some(name) = path_buf.file_stem().and_then(|s| s.to_str()) {
                    let is_system = path.starts_with("/System/Applications") || path.starts_with("/Applications/Utilities");
                    let category = config.categories.get(&path).cloned();
                    let usage_count = *config.usage_counts.get(&path).unwrap_or(&0);
                    
                    // PERFORMANCE: Don't fetch icons here
                    let icon_data = None; 
                    
                    let date_modified = fs::metadata(&path)
                        .and_then(|m| m.modified())
                        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                        .unwrap_or(0);

                    apps.push(AppInfo {
                        name: name.to_string(), path, is_system, category, usage_count, icon_data, date_modified
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
fn auto_categorize() {
    let mut config = load_config();
    let mut modified = false;

    if let Ok(output) = Command::new("mdfind").arg("-onlyin").arg("/Applications").arg("kMDItemContentTypeTree == 'com.apple.application-bundle'").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for path_str in stdout.lines() {
             let path = PathBuf::from(path_str);
             if let Some(_name) = path.file_stem().and_then(|s| s.to_str()) {
                 let path_string = path.to_string_lossy().to_string();
                 if !config.categories.contains_key(&path_string) {
                     if let Some(cat) = guess_category(&path_string) {
                         config.categories.insert(path_string, cat.clone());
                         if !config.user_categories.contains(&cat) {
                             config.user_categories.push(cat);
                         }
                         modified = true;
                     }
                 }
             }
        }
    }
    
    if modified {
        save_config(&config);
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScriptAction {
    name: String,
    command: String,
    cwd: Option<String>,
}

#[tauri::command]
fn run_script(command: String, cwd: Option<String>) {
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
    let file_path = temp_dir.join(format!("macappcontrol_script_{}.command", chrono::Utc::now().timestamp_millis()));
    
    if let Ok(_) = fs::write(&file_path, full_command) {
        let _ = Command::new("chmod").arg("+x").arg(&file_path).status();
        let _ = Command::new("open").arg(file_path).spawn();
    }
}

#[tauri::command]
fn add_script(name: String, command: String, cwd: Option<String>) {
    let mut config = load_config();
    config.scripts.push(ScriptAction { name, command, cwd });
    save_config(&config);
}

#[tauri::command]
fn remove_script(name: String) {
    let mut config = load_config();
    config.scripts.retain(|s| s.name != name);
    save_config(&config);
}

#[tauri::command]
fn reveal_in_finder(path: String) {
    let _ = Command::new("open").arg("-R").arg(path).spawn();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            tauri::WindowEvent::Focused(false) => {
                // Auto-hide when focus is lost
                window.hide().unwrap();
            }
            _ => {}
        })
        .setup(|app| {
            let config = load_config();
            register_app_shortcut(app.handle(), &config.shortcut);

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show app", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app: &AppHandle, event| match event.id.as_ref() {
                    "quit" => { app.exit(0); }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_installed_apps, 
            get_app_icon,
            launch_app,
            update_app_category,
            get_config,
            save_config_command,
            add_category,
            remove_category,
            update_shortcut,
            reveal_in_finder,
            run_script,
            add_script,
            remove_script,
            auto_categorize
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
