use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, DefaultBodyLimit, Json, State},
    http::{header::{CONTENT_TYPE, ORIGIN}, HeaderMap, HeaderValue, Method, StatusCode},
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use serde::Serialize;
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::transports::{MediaState, TransportManagerHandle};

const SERVER_ADDR: &str = "127.0.0.1:3030";
const MAX_INGEST_BYTES: usize = 32 * 1024;

#[derive(Clone)]
struct AppState {
    manager: TransportManagerHandle,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    has_active_media: bool,
}

pub async fn start_server(manager: TransportManagerHandle) -> Result<(), String> {
    let app = Router::new()
        .route("/health", get(health))
        .route("/ingest", post(ingest).delete(clear_ingest))
        .route("/ws", get(ws_handler))
        .route("/widget", get(widget_page))
        .layer(DefaultBodyLimit::max(MAX_INGEST_BYTES))
        // Content scripts run in the music site's origin, so their loopback requests need CORS.
        .layer(
            CorsLayer::new()
                .allow_origin(AllowOrigin::predicate(|origin, _| is_allowed_origin(origin)))
                .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
                .allow_headers([CONTENT_TYPE]),
        )
        .with_state(AppState { manager });

    let listener = tokio::net::TcpListener::bind(SERVER_ADDR)
        .await
        .map_err(|error| format!("could not bind {SERVER_ADDR}: {error}"))?;
    axum::serve(listener, app)
        .await
        .map_err(|error| format!("widget server stopped: {error}"))
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        has_active_media: state.manager.current().is_some(),
    })
}

async fn ingest(
    State(state): State<AppState>,
    Json(mut media): Json<MediaState>,
) -> Result<StatusCode, (StatusCode, &'static str)> {
    if !state.manager.transport_enabled("extension") {
        return Err((StatusCode::SERVICE_UNAVAILABLE, "browser extension transport is disabled"));
    }
    validate_media(&media)?;
    media.title = normalize_title(&media.title);
    media.artists = media.artists.into_iter().map(|artist| artist.trim().to_string()).filter(|artist| !artist.is_empty()).collect();
    media.source.transport_id = "extension".to_string();
    media.timestamps = None;
    state.manager.push_update("extension", Some(media));
    Ok(StatusCode::NO_CONTENT)
}

async fn clear_ingest(State(state): State<AppState>) -> StatusCode {
    state.manager.push_update("extension", None);
    StatusCode::NO_CONTENT
}

pub(crate) fn normalize_title(value: &str) -> String {
    const PROVIDERS: [&str; 6] = ["YouTube Music", "YouTube", "Spotify", "Yandex Music", "Яндекс Музыка", "VK Music"];
    let original = value.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut title = original.clone();
    for provider in PROVIDERS {
        let lower = title.to_lowercase();
        let provider_lower = provider.to_lowercase();
        if lower.ends_with(&provider_lower) {
            let boundary = title.len().saturating_sub(provider.len());
            let before = title[..boundary].trim_end();
            if before.ends_with(['-', '|', '•', '—', '–', ':']) {
                let prefix = before.trim_end_matches(['-', '|', '•', '—', '–', ':']).trim();
                if !prefix.is_empty() { title = prefix.to_string(); }
            }
        }
        let lower = title.to_lowercase();
        if lower.starts_with(&provider_lower) {
            let after = title[provider.len()..].trim_start();
            if after.starts_with(['-', '|', '•', '—', '–', ':']) {
                let suffix = after.trim_start_matches(['-', '|', '•', '—', '–', ':']).trim();
                if !suffix.is_empty() { title = suffix.to_string(); }
            }
        }
    }
    if title.is_empty() { original } else { title }
}

fn validate_media(media: &MediaState) -> Result<(), (StatusCode, &'static str)> {
    if media.title.trim().is_empty() || media.title.len() > 512 {
        return Err((StatusCode::UNPROCESSABLE_ENTITY, "title must be 1-512 characters"));
    }
    if media.artists.len() > 16 || media.artists.iter().any(|artist| artist.len() > 256) {
        return Err((StatusCode::UNPROCESSABLE_ENTITY, "artists exceed limits"));
    }
    if media.artwork.as_ref().is_some_and(|artwork| {
        artwork.len() > 8_192
            || !(artwork.starts_with("https://") || artwork.starts_with("http://"))
            || artwork.chars().any(char::is_whitespace)
    }) {
        return Err((StatusCode::UNPROCESSABLE_ENTITY, "artwork must be an HTTP(S) URL within limits"));
    }
    if media.duration.is_some_and(|value| !value.is_finite() || value < 0.0)
        || media.position.is_some_and(|value| !value.is_finite() || value < 0.0)
    {
        return Err((StatusCode::UNPROCESSABLE_ENTITY, "duration and position must be positive numbers"));
    }
    Ok(())
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if headers.get(ORIGIN).is_some_and(|origin| !is_allowed_origin(origin)) {
        return StatusCode::FORBIDDEN.into_response();
    }
    ws.on_upgrade(move |socket| handle_socket(socket, state.manager)).into_response()
}

fn is_allowed_origin(origin: &HeaderValue) -> bool {
    let value = origin.to_str().unwrap_or_default();
    matches!(
        value,
        "https://music.yandex.ru"
            | "https://www.youtube.com"
            | "https://music.youtube.com"
            | "https://open.spotify.com"
            | "https://vk.com"
            | "http://127.0.0.1:3030"
            | "http://127.0.0.1:1420"
            | "http://localhost:3030"
            | "http://localhost:1420"
            | "tauri://localhost"
            | "http://tauri.localhost"
            | "https://tauri.localhost"
    ) || value.starts_with("moz-extension://")
        || value.starts_with("chrome-extension://")
        || value.starts_with("safari-web-extension://")
}

async fn handle_socket(mut socket: WebSocket, manager: TransportManagerHandle) {
    if send_state(&mut socket, manager.current()).await.is_err() {
        return;
    }

    let mut updates = manager.subscribe();
    let mut refresh = tokio::time::interval(tokio::time::Duration::from_secs(2));
    loop {
        tokio::select! {
            update = updates.recv() => match update {
                Ok(media) => {
                    if send_state(&mut socket, media).await.is_err() { break; }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                    if send_state(&mut socket, manager.current()).await.is_err() { break; }
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            },
            incoming = socket.recv() => {
                match incoming {
                    Some(Ok(Message::Text(payload))) => handle_socket_ingest(&manager, &payload),
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Ok(_)) => {}
                    Some(Err(_)) => break,
                }
                continue;
            }
            _ = refresh.tick() => {
                if send_state(&mut socket, manager.current()).await.is_err() { break; }
                continue;
            }
        }
    }
}

fn handle_socket_ingest(manager: &TransportManagerHandle, payload: &str) {
    let Ok(mut media) = serde_json::from_str::<Option<MediaState>>(payload) else {
        return;
    };
    if let Some(value) = media.as_mut() {
        if !manager.transport_enabled("extension") || validate_media(value).is_err() {
            return;
        }
        value.title = normalize_title(&value.title);
        value.source.transport_id = "extension".to_string();
        value.timestamps = None;
    }
    manager.push_update("extension", media);
}

async fn send_state(socket: &mut WebSocket, media: Option<MediaState>) -> Result<(), ()> {
    let message = serde_json::to_string(&media).map_err(|_| ())?;
    socket.send(Message::Text(message)).await.map_err(|_| ())
}

async fn widget_page() -> Html<&'static str> {
    Html(include_str!("widget.html"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::transports::MediaSource;

    fn media(title: &str) -> MediaState {
        MediaState {
            track_id: None,
            title: title.to_string(),
            artists: vec![],
            album: None,
            artwork: None,
            duration: None,
            position: None,
            is_playing: true,
            source: MediaSource { transport_id: "client".to_string(), service: None },
            timestamps: None,
        }
    }

    #[test]
    fn rejects_empty_titles() {
        assert!(validate_media(&media(" ")).is_err());
    }

    #[test]
    fn strips_only_delimited_provider_names() {
        assert_eq!(normalize_title("Song - YouTube"), "Song");
        assert_eq!(normalize_title("YouTube: Song"), "Song");
        assert_eq!(normalize_title("YouTube Musician"), "YouTube Musician");
    }
}
