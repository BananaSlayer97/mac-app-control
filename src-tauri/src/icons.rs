use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

use crate::config::get_config_path;

fn get_cache_dir() -> PathBuf {
    let mut path = get_config_path();
    path.push("icons");
    let _ = fs::create_dir_all(&path);
    path
}

#[tauri::command]
pub fn get_app_icon(path: String) -> Option<String> {
    get_app_icon_cached(&path)
}

fn get_app_icon_cached(app_path: &str) -> Option<String> {
    let cache_dir = get_cache_dir();
    let hashed_name = format!("{:x}", md5::compute(app_path));
    let cache_path = cache_dir.join(format!("{}.png", hashed_name));

    if cache_path.exists() {
        if let Ok(data) = fs::read(&cache_path) {
            return Some(format!(
                "data:image/png;base64,{}",
                general_purpose::STANDARD.encode(data)
            ));
        }
    }

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

    let status = Command::new("swift").arg("-e").arg(swift_code).status();

    if let Ok(s) = status {
        if s.success() {
            if let Ok(data) = fs::read(&cache_path) {
                return Some(format!(
                    "data:image/png;base64,{}",
                    general_purpose::STANDARD.encode(data)
                ));
            }
        }
    }
    None
}

