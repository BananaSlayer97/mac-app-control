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
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

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
            let config = config::load_config();
            shortcuts::register_app_shortcut(app.handle(), &config.shortcut);

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show app", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app: &AppHandle, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
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
            update_script,
            get_wallpapers_dir,
            list_wallpapers,
            import_wallpaper,
            delete_wallpaper
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
