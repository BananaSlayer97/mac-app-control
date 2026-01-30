mod apps;
mod config;
mod icons;
mod scripts;
mod shortcuts;
mod wallpaper;

pub use apps::{get_installed_apps, launch_app, reveal_in_finder, AppInfo};
pub use config::{
    add_category, get_config, remove_category, save_config_command, update_app_category, AppConfig, ScriptAction,
};
pub use icons::get_app_icon;
pub use scripts::{add_script, remove_script, run_script, update_script};
pub use shortcuts::update_shortcut;
pub use wallpaper::{delete_wallpaper, get_wallpapers_dir, import_wallpaper, list_wallpapers, WallpaperFile};

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

const TRAY_ID: &str = "main";

pub fn update_tray_menu(app: &AppHandle) {
    let config = config::load_config();
    let tray = match app.tray_by_id(TRAY_ID) {
        Some(t) => t,
        None => return,
    };

    let menu = Menu::new(app).unwrap();
    let _ = MenuItem::with_id(app, "show", "Show app", true, None::<&str>).map(|i| menu.append(&i));
    let _ = PredefinedMenuItem::separator(app).map(|i| menu.append(&i));

    if !config.scripts.is_empty() {
        for script in &config.scripts {
            let id = format!("script:{}", script.name);
            let _ = MenuItem::with_id(app, id, &script.name, true, None::<&str>).map(|i| menu.append(&i));
        }
        let _ = PredefinedMenuItem::separator(app).map(|i| menu.append(&i));
    }

    let _ = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).map(|i| menu.append(&i));

    let _ = tray.set_menu(Some(menu));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            tauri::WindowEvent::Focused(false) => {
                window.hide().unwrap();
            }
            _ => {}
        })
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let config = config::load_config();
            shortcuts::register_app_shortcut(app.handle(), &config.shortcut);

            let _tray = TrayIconBuilder::with_id(TRAY_ID)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app: &AppHandle, event| {
                    let id = event.id.as_ref();
                    if id == "quit" {
                        app.exit(0);
                    } else if id == "show" {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    } else if id.starts_with("script:") {
                        let script_name = &id["script:".len()..];
                        let config = config::load_config();
                        if let Some(script) = config.scripts.iter().find(|s| s.name == script_name) {
                            scripts::run_script(script.command.clone(), script.cwd.clone());
                        }
                    }
                })
                .build(app)?;

            update_tray_menu(app.handle());

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
            update_script,
            get_wallpapers_dir,
            list_wallpapers,
            import_wallpaper,
            delete_wallpaper
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
