use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::config::{load_config, save_config};

fn parse_shortcut(s: &str) -> Option<Shortcut> {
    let parts: Vec<&str> = s.split('+').collect();
    if parts.len() != 2 {
        return None;
    }

    let modifier = match parts[0].to_lowercase().as_str() {
        "alt" | "option" => Some(Modifiers::ALT),
        "command" | "cmd" | "super" => Some(Modifiers::SUPER),
        "control" | "ctrl" => Some(Modifiers::CONTROL),
        "shift" => Some(Modifiers::SHIFT),
        _ => None,
    }?;

    let code = match parts[1].to_lowercase().as_str() {
        "space" => Some(Code::Space),
        "a" => Some(Code::KeyA),
        "b" => Some(Code::KeyB),
        "c" => Some(Code::KeyC),
        "d" => Some(Code::KeyD),
        "e" => Some(Code::KeyE),
        "f" => Some(Code::KeyF),
        "g" => Some(Code::KeyG),
        "h" => Some(Code::KeyH),
        "i" => Some(Code::KeyI),
        "j" => Some(Code::KeyJ),
        "k" => Some(Code::KeyK),
        "l" => Some(Code::KeyL),
        "m" => Some(Code::KeyM),
        "n" => Some(Code::KeyN),
        "o" => Some(Code::KeyO),
        "p" => Some(Code::KeyP),
        "q" => Some(Code::KeyQ),
        "r" => Some(Code::KeyR),
        "s" => Some(Code::KeyS),
        "t" => Some(Code::KeyT),
        "u" => Some(Code::KeyU),
        "v" => Some(Code::KeyV),
        "w" => Some(Code::KeyW),
        "x" => Some(Code::KeyX),
        "y" => Some(Code::KeyY),
        "z" => Some(Code::KeyZ),
        _ => None,
    }?;

    Some(Shortcut::new(Some(modifier), code))
}

pub(crate) fn register_app_shortcut(app: &AppHandle, shortcut_str: &str) {
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
pub fn update_shortcut(app_handle: AppHandle, shortcut: String) {
    let mut config = load_config();
    config.shortcut = shortcut.clone();
    save_config(&config);
    register_app_shortcut(&app_handle, &shortcut);
}
