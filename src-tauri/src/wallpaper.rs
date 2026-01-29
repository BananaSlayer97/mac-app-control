use crate::config;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
pub struct WallpaperFile {
    pub path: String,
    pub filename: String,
    pub size: u64,
    pub modified_ms: Option<u128>,
}

fn wallpapers_dir() -> PathBuf {
    let mut dir = config::get_config_path();
    dir.push("wallpapers");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn is_supported_image_ext(ext: &str) -> bool {
    matches!(
        ext.to_ascii_lowercase().as_str(),
        "png" | "jpg" | "jpeg" | "webp" | "gif"
    )
}

fn file_modified_ms(meta: &fs::Metadata) -> Option<u128> {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis())
}

#[tauri::command]
pub fn get_wallpapers_dir() -> String {
    wallpapers_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub fn list_wallpapers() -> Vec<WallpaperFile> {
    let dir = wallpapers_dir();
    let mut items: Vec<(Option<u128>, WallpaperFile)> = vec![];

    let Ok(read_dir) = fs::read_dir(&dir) else {
        return vec![];
    };

    for entry in read_dir.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let ext_ok = path
            .extension()
            .and_then(|e| e.to_str())
            .map(is_supported_image_ext)
            .unwrap_or(false);
        if !ext_ok {
            continue;
        }

        let Ok(meta) = entry.metadata() else {
            continue;
        };

        let modified_ms = file_modified_ms(&meta);
        let filename = entry
            .file_name()
            .to_string_lossy()
            .to_string();

        items.push((
            modified_ms,
            WallpaperFile {
                path: path.to_string_lossy().to_string(),
                filename,
                size: meta.len(),
                modified_ms,
            },
        ));
    }

    items.sort_by(|a, b| b.0.unwrap_or(0).cmp(&a.0.unwrap_or(0)));
    items.into_iter().map(|(_, w)| w).collect()
}

#[tauri::command]
pub fn import_wallpaper(source_path: String) -> Result<String, String> {
    let mut raw = source_path.trim().to_string();
    if raw.starts_with("file://") {
        raw = raw.trim_start_matches("file://").to_string();
    }
    let raw = raw.replace("%20", " ");
    let src = PathBuf::from(raw);
    if !src.is_file() {
        return Err("源文件不存在或不是文件（请确认选择的是本地图片文件）".to_string());
    }

    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !is_supported_image_ext(&ext) {
        return Err("不支持的图片格式（支持 PNG/JPG/JPEG/WebP/GIF）".to_string());
    }

    let meta = fs::metadata(&src)
        .map_err(|e| format!("读取源文件信息失败：{e}"))?;
    let modified_ms = file_modified_ms(&meta).unwrap_or(0);
    let size = meta.len();
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let hash = md5::compute(format!(
        "{}:{}:{}",
        src.to_string_lossy(),
        modified_ms,
        size
    ));
    let hash_short = format!("{:x}", hash);
    let hash_short = hash_short.get(0..10).unwrap_or(&hash_short);

    let filename = format!("wallpaper_{ts}_{hash_short}.{ext}");
    let mut dest = wallpapers_dir();
    dest.push(filename);

    fs::copy(&src, &dest).map_err(|e| format!("复制图片失败：{e}"))?;

    let dest_str = dest.to_string_lossy().to_string();
    if !dest.exists() {
        return Err("复制完成但目标文件不存在（异常）".to_string());
    }
    Ok(dest_str)
}

fn ensure_path_under_dir(target: &Path, dir: &Path) -> Result<(), String> {
    let dir = dir
        .canonicalize()
        .map_err(|_| "壁纸目录不可用".to_string())?;
    let target = target
        .canonicalize()
        .map_err(|_| "目标文件不可用".to_string())?;
    if !target.starts_with(&dir) {
        return Err("只能删除应用保存的壁纸".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn delete_wallpaper(path: String) -> Result<(), String> {
    let dir = wallpapers_dir();
    let target = PathBuf::from(path.trim());
    ensure_path_under_dir(&target, &dir)?;
    fs::remove_file(&target).map_err(|_| "删除失败".to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use once_cell::sync::Lazy;
    use parking_lot::Mutex;

    static TEST_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

    fn with_test_home<T>(f: impl FnOnce(PathBuf) -> T) -> T {
        let _g = TEST_LOCK.lock();
        let home = std::env::temp_dir().join(format!(
            "macappcontrol_test_home_{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        ));
        fs::create_dir_all(&home).unwrap();
        std::env::set_var("HOME", &home);
        let out = f(home.clone());
        let _ = fs::remove_dir_all(&home);
        out
    }

    #[test]
    fn import_list_delete_roundtrip() {
        with_test_home(|home| {
            let src = home.join("source.png");
            fs::write(&src, b"not-a-real-png").unwrap();

            let saved = import_wallpaper(src.to_string_lossy().to_string()).unwrap();
            assert!(PathBuf::from(&saved).is_file());

            let items = list_wallpapers();
            assert!(items.iter().any(|w| w.path == saved));

            delete_wallpaper(saved.clone()).unwrap();
            assert!(!PathBuf::from(saved).exists());
        });
    }

    #[test]
    fn delete_rejects_outside_wallpaper_dir() {
        with_test_home(|home| {
            let outside = home.join("outside.png");
            fs::write(&outside, b"outside").unwrap();
            let err = delete_wallpaper(outside.to_string_lossy().to_string()).unwrap_err();
            assert!(err.contains("只能删除应用保存的壁纸"));
        });
    }
}
