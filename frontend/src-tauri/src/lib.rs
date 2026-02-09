#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Start the bundled backend sidecar so the frontend can call http://127.0.0.1:8000
            // If the port is already in use, the backend exits gracefully.
            #[cfg(not(debug_assertions))]
            {
                use std::fs::OpenOptions;
                use std::io::Write;
                use std::path::PathBuf;

                let mut log_path = app
                    .path()
                    .app_data_dir()
                    .unwrap_or_else(|_| PathBuf::from("."));
                log_path.push("sidecar.log");

                let mut log = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&log_path)
                    .ok();

                let exe_dir = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|p| p.to_path_buf()));
                let sidecar_path = exe_dir
                    .as_ref()
                    .map(|dir| dir.join("file-organizer-backend"));

                let result = if let Some(path) = sidecar_path.clone() {
                    std::process::Command::new(path).spawn().map(|_| ())
                } else {
                    Err(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "failed to resolve executable dir",
                    ))
                };

                if let Some(ref mut file) = log {
                    let _ = writeln!(
                        file,
                        "sidecar spawn: path={:?} result={:?}",
                        sidecar_path, result
                    );
                }
            }
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
