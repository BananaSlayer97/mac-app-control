use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScriptAction {
    pub name: String,
    pub command: String,
    pub cwd: Option<String>,
}

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
    #[serde(default = "default_theme")]
    pub theme: String,
    pub wallpaper: Option<String>,
    #[serde(default = "default_wallpaper_blur")]
    pub wallpaper_blur: f32,
    #[serde(default = "default_wallpaper_overlay")]
    pub wallpaper_overlay: f32,
    #[serde(default = "default_wallpaper_fit")]
    pub wallpaper_fit: String,
    #[serde(default = "default_wallpaper_position")]
    pub wallpaper_position: String,
}

fn default_theme() -> String {
    "Midnight".to_string()
}

fn default_wallpaper_blur() -> f32 {
    10.0
}

fn default_wallpaper_overlay() -> f32 {
    0.4
}

fn default_wallpaper_fit() -> String {
    "cover".to_string()
}

fn default_wallpaper_position() -> String {
    "center".to_string()
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
            theme: default_theme(),
            wallpaper: None,
            wallpaper_blur: default_wallpaper_blur(),
            wallpaper_overlay: default_wallpaper_overlay(),
            wallpaper_fit: default_wallpaper_fit(),
            wallpaper_position: default_wallpaper_position(),
        }
    }
}

pub(crate) fn get_config_path() -> PathBuf {
    let mut path = home::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("Library/Application Support/MacAppControl");
    let _ = fs::create_dir_all(&path);
    path
}

pub fn load_config() -> AppConfig {
    let mut path = get_config_path();
    path.push("config.json");
    let mut config: AppConfig = if let Ok(content) = fs::read_to_string(path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    };

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
        for cat in &config.user_categories {
            if !default_order.contains(cat) {
                default_order.push(cat.clone());
            }
        }
        config.category_order = default_order;
    }
    config
}

pub fn save_config(config: &AppConfig) {
    let mut path = get_config_path();
    path.push("config.json");
    if let Ok(content) = serde_json::to_string_pretty(config) {
        let _ = fs::write(path, content);
    }
}

#[tauri::command]
pub fn save_config_command(config: AppConfig) {
    save_config(&config);
}

#[tauri::command]
pub fn get_config() -> AppConfig {
    load_config()
}

#[tauri::command]
pub fn add_category(category: String) {
    let mut config = load_config();
    if !config.user_categories.contains(&category) {
        config.user_categories.push(category);
        save_config(&config);
    }
}

#[tauri::command]
pub fn remove_category(category: String) {
    let mut config = load_config();
    config.user_categories.retain(|c| c != &category);
    config.categories.retain(|_, v| v != &category);
    save_config(&config);
}

#[tauri::command]
pub fn update_app_category(path: String, category: String) {
    let mut config = load_config();
    config.categories.insert(path, category);
    save_config(&config);
}
