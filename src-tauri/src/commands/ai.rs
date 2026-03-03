use serde::Serialize;
use std::process::Stdio;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::Command;

const ALLOWED_BINARIES: &[&str] = &["claude"];
const ALLOWED_CHECK_COMMANDS: &[&str] = &["which", "where"];

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum AIStreamEvent {
    TextDelta { text: String },
    Done { text: String },
    Error { error: String },
}

#[tauri::command]
pub async fn send_message(
    prompt: String,
    binary: String,
    args: Vec<String>,
    env_remove: Vec<String>,
    on_event: Channel<AIStreamEvent>,
) -> Result<(), String> {
    if !ALLOWED_BINARIES.contains(&binary.as_str()) {
        return Err(format!("Binary '{}' is not allowed", binary));
    }

    let mut cmd = Command::new(&binary);
    for key in &env_remove {
        cmd.env_remove(key);
    }
    cmd.args(&args)
        .arg(&prompt)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn {binary}: {e}"))?;

    let stdout = child.stdout.take().ok_or("No stdout")?;
    let stderr_handle = child.stderr.take();
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
                let _ = on_event.send(AIStreamEvent::TextDelta {
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
        let _ = on_event.send(AIStreamEvent::Done { text: full_text });
    } else {
        let stderr_output = if let Some(mut stderr) = stderr_handle {
            let mut buf = String::new();
            let _ = stderr.read_to_string(&mut buf).await;
            buf
        } else {
            String::new()
        };
        let msg = if stderr_output.trim().is_empty() {
            format!("{binary} exited with {status}")
        } else {
            format!("{binary} exited with {status}: {stderr_output}")
        };
        let _ = on_event.send(AIStreamEvent::Error { error: msg });
    }

    Ok(())
}

#[tauri::command]
pub async fn check_ai_available(binary: String, check_command: String) -> Result<bool, String> {
    if !ALLOWED_BINARIES.contains(&binary.as_str()) {
        return Err(format!("Binary '{}' is not allowed", binary));
    }
    if !ALLOWED_CHECK_COMMANDS.contains(&check_command.as_str()) {
        return Err(format!("Check command '{}' is not allowed", check_command));
    }

    match Command::new(&check_command)
        .arg(&binary)
        .output()
        .await
    {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}
