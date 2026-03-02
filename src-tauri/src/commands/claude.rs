use serde::Serialize;
use std::process::Stdio;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum ClaudeStreamEvent {
    TextDelta { text: String },
    Done { text: String },
    Error { error: String },
}

#[tauri::command]
pub async fn send_to_claude(prompt: String, on_event: Channel<ClaudeStreamEvent>) -> Result<(), String> {
    let mut child = Command::new("claude")
        .env_remove("CLAUDECODE")
        .args(["--print", "--output-format", "stream-json", &prompt])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn claude: {e}"))?;

    let stdout = child.stdout.take().ok_or("No stdout")?;
    let mut reader = BufReader::new(stdout).lines();
    let mut full_text = String::new();

    while let Some(line) = reader.next_line().await.map_err(|e| e.to_string())? {
        if line.trim().is_empty() {
            continue;
        }

        let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) else {
            continue;
        };

        // content_block_delta → delta.text
        if value.get("type").and_then(|t| t.as_str()) == Some("content_block_delta") {
            if let Some(text) = value
                .get("delta")
                .and_then(|d| d.get("text"))
                .and_then(|t| t.as_str())
            {
                full_text.push_str(text);
                let _ = on_event.send(ClaudeStreamEvent::TextDelta {
                    text: text.to_string(),
                });
            }
        }

        // result → final
        if value.get("type").and_then(|t| t.as_str()) == Some("result") {
            if let Some(text) = value.get("result").and_then(|r| r.as_str()) {
                full_text = text.to_string();
            }
        }
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;

    if status.success() {
        let _ = on_event.send(ClaudeStreamEvent::Done { text: full_text });
    } else {
        let _ = on_event.send(ClaudeStreamEvent::Error {
            error: format!("claude exited with {status}"),
        });
    }

    Ok(())
}

#[tauri::command]
pub async fn check_claude_available() -> Result<bool, String> {
    match Command::new("which")
        .arg("claude")
        .output()
        .await
    {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}
