// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod transports;
mod server;

use transports::{native_media::NativeMediaTransport, ManagerDiagnostics, TransportConfig, TransportManager, TransportManagerHandle};

const WIDGET_URL: &str = "http://127.0.0.1:3030/widget";

#[tokio::main]
async fn main() {
    let mut manager = TransportManager::new();
    manager.add_transport(Box::new(NativeMediaTransport));
    manager.handle().register_priority("extension", 20);
    #[cfg(debug_assertions)]
    manager.add_transport(Box::new(transports::mock::MockTransport));
    manager.start_all();

    let manager_handle = manager.handle();
    tokio::spawn(async move {
        if let Err(error) = server::start_server(manager_handle).await {
            eprintln!("[server] {error}");
        }
    });

    tauri::Builder::default()
        .manage(manager.handle())
        .invoke_handler(tauri::generate_handler![get_widget_url, get_diagnostics, update_transport_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_widget_url() -> String {
    WIDGET_URL.to_string()
}

#[tauri::command]
fn get_diagnostics(manager: tauri::State<'_, TransportManagerHandle>) -> ManagerDiagnostics {
    manager.diagnostics()
}

#[tauri::command]
fn update_transport_config(
    config: TransportConfig,
    manager: tauri::State<'_, TransportManagerHandle>,
) -> ManagerDiagnostics {
    manager.update_config(config)
}
