use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn set_click_through(app: AppHandle, ignore: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("pet")
        .ok_or("Pet window not found")?;
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_chat_window(app: AppHandle) -> Result<(), String> {
    let chat = app
        .get_webview_window("chat")
        .ok_or("Chat window not found")?;

    if chat.is_visible().unwrap_or(false) {
        chat.hide().map_err(|e| e.to_string())?;
    } else {
        // Position chat window near pet window
        if let Some(pet) = app.get_webview_window("pet") {
            if let Ok(pos) = pet.outer_position() {
                let _ = chat.set_position(tauri::Position::Physical(
                    tauri::PhysicalPosition {
                        x: pos.x + 320,
                        y: pos.y,
                    },
                ));
            }
        }
        chat.show().map_err(|e| e.to_string())?;
        chat.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
