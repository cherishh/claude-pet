mod commands;

use commands::{claude, window};
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            window::set_click_through,
            window::toggle_chat_window,
            claude::send_to_claude,
            claude::check_claude_available,
        ])
        .setup(|app| {
            let show = MenuItemBuilder::with_id("show", "Show Pet").build(app)?;
            let chat = MenuItemBuilder::with_id("chat", "Open Chat").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&show)
                .item(&chat)
                .separator()
                .item(&quit)
                .build()?;

            let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))?;

            TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("Claude Pet")
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("pet") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "chat" => {
                        if let Some(w) = app.get_webview_window("chat") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
