use axum::{
    body::Body,
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, DefaultBodyLimit, Json, Path, Query, State},
    http::{header::{CACHE_CONTROL, CONTENT_SECURITY_POLICY, CONTENT_TYPE, ORIGIN}, HeaderMap, HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use std::time::Duration;
use tauri::AppHandle;
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::transports::{MediaState, TransportManagerHandle};

const SERVER_ADDR: &str = "127.0.0.1:3030";
const MAX_INGEST_BYTES: usize = 32 * 1024;
const MAX_ARTWORK_BYTES: usize = 8 * 1024 * 1024;
const MAX_ARTWORK_REDIRECTS: usize = 3;

#[derive(Clone)]
struct AppState {
    manager: TransportManagerHandle,
    app: AppHandle,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    has_active_media: bool,
}

#[derive(Deserialize)]
struct ArtworkQuery {
    url: String,
}

pub async fn start_server(manager: TransportManagerHandle, app_handle: AppHandle) -> Result<(), String> {
    let app = Router::new()
        .route("/health", get(health))
        .route("/ingest", post(ingest).delete(clear_ingest))
        .route("/ws", get(ws_handler))
        .route("/widget", get(widget_page))
        .route("/artwork", get(artwork))
        .route("/assets/*path", get(frontend_asset))
        .layer(DefaultBodyLimit::max(MAX_INGEST_BYTES))
        // Content scripts run in the music site's origin, so their loopback requests need CORS.
        .layer(
            CorsLayer::new()
                .allow_origin(AllowOrigin::predicate(|origin, _| is_allowed_origin(origin)))
                .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
                .allow_headers([CONTENT_TYPE]),
        )
        .with_state(AppState { manager, app: app_handle });

    let listener = tokio::net::TcpListener::bind(SERVER_ADDR)
        .await
        .map_err(|error| format!("could not bind {SERVER_ADDR}: {error}"))?;
    axum::serve(listener, app)
        .await
        .map_err(|error| format!("widget server stopped: {error}"))
}

async fn artwork(Query(query): Query<ArtworkQuery>) -> Response {
    let mut url = match reqwest::Url::parse(&query.url) {
        Ok(url) => url,
        Err(_) => return StatusCode::BAD_REQUEST.into_response(),
    };

    for redirect in 0..=MAX_ARTWORK_REDIRECTS {
        let address = match safe_artwork_address(&url).await {
            Some(address) => address,
            None => return StatusCode::FORBIDDEN.into_response(),
        };
        let host = url.host_str().unwrap_or_default().to_string();
        let client = match reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(8))
            .resolve(&host, address)
            .build()
        {
            Ok(client) => client,
            Err(_) => return StatusCode::BAD_GATEWAY.into_response(),
        };
        let response = match client
            .get(url.clone())
            .header(reqwest::header::ACCEPT, "image/avif,image/webp,image/png,image/jpeg,image/gif")
            .header(reqwest::header::USER_AGENT, "OBS Playing artwork proxy")
            .send()
            .await
        {
            Ok(response) => response,
            Err(_) => return StatusCode::BAD_GATEWAY.into_response(),
        };

        if response.status().is_redirection() {
            if redirect == MAX_ARTWORK_REDIRECTS {
                return StatusCode::BAD_GATEWAY.into_response();
            }
            let Some(location) = response.headers().get(reqwest::header::LOCATION).and_then(|value| value.to_str().ok()) else {
                return StatusCode::BAD_GATEWAY.into_response();
            };
            url = match url.join(location) {
                Ok(url) => url,
                Err(_) => return StatusCode::BAD_GATEWAY.into_response(),
            };
            continue;
        }
        if !response.status().is_success() {
            return StatusCode::BAD_GATEWAY.into_response();
        }
        if response.content_length().is_some_and(|size| size > MAX_ARTWORK_BYTES as u64) {
            return StatusCode::PAYLOAD_TOO_LARGE.into_response();
        }
        let content_type = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .and_then(allowed_image_type);
        let Some(content_type) = content_type else {
            return StatusCode::UNSUPPORTED_MEDIA_TYPE.into_response();
        };
        let mut response = response;
        let mut bytes = Vec::new();
        loop {
            match response.chunk().await {
                Ok(Some(chunk)) if bytes.len() + chunk.len() <= MAX_ARTWORK_BYTES => bytes.extend_from_slice(&chunk),
                Ok(Some(_)) => return StatusCode::PAYLOAD_TOO_LARGE.into_response(),
                Ok(None) => break,
                Err(_) => return StatusCode::BAD_GATEWAY.into_response(),
            }
        }
        return (
            [(CONTENT_TYPE, content_type), (CACHE_CONTROL, "private, max-age=86400")],
            bytes,
        ).into_response();
    }

    StatusCode::BAD_GATEWAY.into_response()
}

fn allowed_image_type(value: &str) -> Option<&'static str> {
    match value.split(';').next()?.trim().to_ascii_lowercase().as_str() {
        "image/avif" => Some("image/avif"),
        "image/webp" => Some("image/webp"),
        "image/png" => Some("image/png"),
        "image/jpeg" => Some("image/jpeg"),
        "image/gif" => Some("image/gif"),
        _ => None,
    }
}

async fn safe_artwork_address(url: &reqwest::Url) -> Option<SocketAddr> {
    if !matches!(url.scheme(), "http" | "https") || !url.username().is_empty() || url.password().is_some() {
        return None;
    }
    let host = url.host_str()?;
    let port = url.port_or_known_default()?;
    if !matches!(port, 80 | 443) {
        return None;
    }
    let addresses = tokio::net::lookup_host((host, port)).await.ok()?.collect::<Vec<_>>();
    if addresses.is_empty() || addresses.iter().any(|address| !is_public_ip(address.ip())) {
        return None;
    }
    addresses.into_iter().next()
}

fn is_public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => is_public_ipv4(ip),
        IpAddr::V6(ip) => is_public_ipv6(ip),
    }
}

fn is_public_ipv4(ip: Ipv4Addr) -> bool {
    let [a, b, c, _] = ip.octets();
    !(a == 0
        || a == 10
        || a == 127
        || a >= 224
        || (a == 100 && (64..=127).contains(&b))
        || (a == 169 && b == 254)
        || (a == 172 && (16..=31).contains(&b))
        || (a == 192 && b == 0 && c == 0)
        || (a == 192 && b == 0 && c == 2)
        || (a == 192 && b == 168)
        || (a == 198 && (b == 18 || b == 19))
        || (a == 198 && b == 51 && c == 100)
        || (a == 203 && b == 0 && c == 113))
}

fn is_public_ipv6(ip: Ipv6Addr) -> bool {
    if let Some(ipv4) = ip.to_ipv4_mapped() {
        return is_public_ipv4(ipv4);
    }
    let segments = ip.segments();
    !(ip.is_unspecified()
        || ip.is_loopback()
        || ip.is_multicast()
        || (segments[0] & 0xfe00) == 0xfc00
        || (segments[0] & 0xffc0) == 0xfe80
        || (segments[0] == 0x2001 && segments[1] == 0x0db8))
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
            | "http://127.0.0.1:1422"
            | "http://localhost:3030"
            | "http://localhost:1420"
            | "http://localhost:1422"
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

async fn widget_page(State(_state): State<AppState>) -> Response {
    #[cfg(debug_assertions)]
    {
        const DEV_PAGE: &str = r#"<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src http://127.0.0.1:1420; style-src http://127.0.0.1:1420 'unsafe-inline'; connect-src ws://127.0.0.1:3030 ws://127.0.0.1:1420; img-src http: https: data: blob:; font-src http://127.0.0.1:1420 data:">
<title>OBS Playing Widget</title></head><body><div id="app"></div>
<script type="module" src="http://127.0.0.1:1420/@vite/client"></script>
<script type="module" src="http://127.0.0.1:1420/src/main.ts"></script></body></html>"#;
        return ([(CONTENT_TYPE, "text/html; charset=utf-8")], DEV_PAGE).into_response();
    }

    #[cfg(not(debug_assertions))]
    frontend_response(&_state.app, "index.html")
}

async fn frontend_asset(Path(path): Path<String>, State(state): State<AppState>) -> Response {
    if path
        .split('/')
        .any(|segment| segment.is_empty() || segment == "." || segment == "..")
        || path.contains('\\')
    {
        return StatusCode::NOT_FOUND.into_response();
    }
    frontend_response(&state.app, &format!("assets/{path}"))
}

fn frontend_response(app: &AppHandle, path: &str) -> Response {
    let Some(asset) = app.asset_resolver().get(path.to_string()) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let mut response = Response::new(Body::from(asset.bytes));
    if let Ok(content_type) = HeaderValue::from_str(&asset.mime_type) {
        response.headers_mut().insert(CONTENT_TYPE, content_type);
    }
    if let Some(csp) = asset
        .csp_header
        .and_then(|value| HeaderValue::from_str(&value).ok())
    {
        response.headers_mut().insert(CONTENT_SECURITY_POLICY, csp);
    }
    response
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
