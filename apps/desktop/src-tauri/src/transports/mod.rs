use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::broadcast;
use ts_rs::TS;

#[cfg(debug_assertions)]
pub mod mock;
pub mod native_media;

#[derive(TS, Serialize, Deserialize, Clone, Debug)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct MediaState {
    #[serde(default)]
    pub track_id: Option<String>,
    pub title: String,
    pub artists: Vec<String>,
    #[serde(default)]
    pub album: Option<String>,
    #[serde(default)]
    pub artwork: Option<String>,
    #[serde(default)]
    pub duration: Option<f64>,
    #[serde(default)]
    pub position: Option<f64>,
    pub is_playing: bool,
    pub source: MediaSource,
    #[serde(default)]
    pub timestamps: Option<MediaTimestamps>,
}

#[derive(TS, Serialize, Deserialize, Clone, Debug)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct MediaSource {
    pub transport_id: String,
    #[serde(default)]
    pub service: Option<String>,
}

#[derive(TS, Serialize, Deserialize, Clone, Debug)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct MediaTimestamps {
    #[serde(default)]
    pub started_at: Option<u64>,
    pub updated_at: u64,
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub trait Transport: Send + Sync {
    fn id(&self) -> &'static str;
    fn priority(&self) -> i32;
    fn start(&self, manager: TransportManagerHandle) -> Result<(), String>;
}

/// Stale threshold: source considered inactive if no update within this window.
const STALE_MS: u64 = 15_000;
/// Hysteresis: do not switch away from current playing source unless the
/// challenger has strictly higher priority or the current source stopped.
const SWITCH_DEBOUNCE_MS: u64 = 2_000;

struct SourceEntry {
    priority: i32,
    state: MediaState,
    updated_at: u64,
}

#[derive(Default)]
struct ManagerInner {
    sources: HashMap<String, SourceEntry>,
    priorities: HashMap<String, i32>,
    active_id: Option<String>,
    last_switch_at: u64,
    config: TransportConfig,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TransportConfig {
    pub native_media_enabled: bool,
    pub browser_extension_enabled: bool,
    pub native_media_priority: i32,
    pub browser_extension_priority: i32,
    pub browser_extension_providers: Vec<ExtensionProvider>,
    pub browser_extension_provider: ExtensionProviderSelection,
    pub mode: TransportMode,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub enum ExtensionProvider { YandexMusic, YoutubeMusic, Youtube, Spotify, VkMusic }

impl ExtensionProvider {
    pub fn from_service(service: Option<&str>) -> Option<Self> {
        match service {
            Some("Yandex Music") => Some(Self::YandexMusic),
            Some("YouTube Music") => Some(Self::YoutubeMusic),
            Some("YouTube") => Some(Self::Youtube),
            Some("Spotify") => Some(Self::Spotify),
            Some("VK Music") => Some(Self::VkMusic),
            _ => None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ExtensionProviderSelection { Auto, YandexMusic, YoutubeMusic, Youtube, Spotify, VkMusic }

impl ExtensionProviderSelection {
    fn provider(self) -> Option<ExtensionProvider> {
        match self {
            Self::Auto => None,
            Self::YandexMusic => Some(ExtensionProvider::YandexMusic),
            Self::YoutubeMusic => Some(ExtensionProvider::YoutubeMusic),
            Self::Youtube => Some(ExtensionProvider::Youtube),
            Self::Spotify => Some(ExtensionProvider::Spotify),
            Self::VkMusic => Some(ExtensionProvider::VkMusic),
        }
    }
}

impl Default for TransportConfig {
    fn default() -> Self {
        Self {
            native_media_enabled: true,
            browser_extension_enabled: true,
            native_media_priority: 10,
            browser_extension_priority: 20,
            browser_extension_providers: vec![
                ExtensionProvider::YandexMusic, ExtensionProvider::YoutubeMusic, ExtensionProvider::Youtube,
                ExtensionProvider::Spotify, ExtensionProvider::VkMusic,
            ],
            browser_extension_provider: ExtensionProviderSelection::Auto,
            mode: TransportMode::Auto,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum TransportMode { Auto, BrowserExtension, NativeMedia, Mock }

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TransportDiagnostic {
    pub id: String,
    pub enabled: bool,
    pub priority: i32,
    pub status: String,
    pub last_updated_at: Option<u64>,
    pub active: bool,
    pub message: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ManagerDiagnostics {
    pub config: TransportConfig,
    pub active_media: Option<MediaState>,
    pub transports: Vec<TransportDiagnostic>,
}

#[derive(Clone)]
pub struct TransportManagerHandle {
    inner: Arc<Mutex<ManagerInner>>,
    tx: broadcast::Sender<Option<MediaState>>,
}

impl TransportManagerHandle {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(64);
        Self {
            inner: Arc::new(Mutex::new(ManagerInner::default())),
            tx,
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<Option<MediaState>> {
        self.tx.subscribe()
    }

    pub fn register_priority(&self, transport_id: &str, priority: i32) {
        let mut inner = self.inner.lock().unwrap();
        inner.priorities.insert(transport_id.to_string(), priority);
    }

    pub fn config(&self) -> TransportConfig {
        self.inner.lock().unwrap().config.clone()
    }

    pub fn update_config(&self, mut config: TransportConfig) -> ManagerDiagnostics {
        config.native_media_priority = config.native_media_priority.clamp(-100, 100);
        config.browser_extension_priority = config.browser_extension_priority.clamp(-100, 100);
        let mut seen = HashSet::new();
        config.browser_extension_providers.retain(|provider| seen.insert(*provider));
        #[cfg(not(debug_assertions))]
        if config.mode == TransportMode::Mock {
            config.mode = TransportMode::Auto;
        }
        let mut inner = self.inner.lock().unwrap();
        inner.priorities.insert("native_media".into(), config.native_media_priority);
        inner.priorities.insert("extension".into(), config.browser_extension_priority);
        let priorities = inner.priorities.clone();
        for (id, entry) in &mut inner.sources {
            if let Some(priority) = priorities.get(id) {
                entry.priority = *priority;
            }
        }
        inner.config = config;
        if inner.sources.get("extension").is_some_and(|entry| !Self::extension_provider_allowed(&inner.config, &entry.state)) {
            inner.sources.remove("extension");
        }
        // A deliberate configuration change should take effect without source-switch debounce.
        inner.last_switch_at = 0;
        let selected = Self::select_active(&mut inner, now_ms());
        let diagnostics = Self::diagnostics_locked(&mut inner, selected.clone());
        drop(inner);
        let _ = self.tx.send(selected);
        diagnostics
    }

    pub fn transport_enabled(&self, transport_id: &str) -> bool {
        let config = self.config();
        match transport_id {
            "native_media" => config.native_media_enabled,
            "extension" => config.browser_extension_enabled,
            "mock" => config.mode == TransportMode::Mock,
            _ => true,
        }
    }

    /// Push an update from any transport. The manager resolves the active source.
    pub fn push_update(&self, transport_id: &str, state: Option<MediaState>) {
        let now = now_ms();
        let mut inner = self.inner.lock().unwrap();
        let priority = *inner.priorities.get(transport_id).unwrap_or(&0);

        match state {
            Some(mut s) => {
                s.source.transport_id = transport_id.to_string();
                if s.timestamps.is_none() {
                    s.timestamps = Some(MediaTimestamps {
                        started_at: None,
                        updated_at: now,
                    });
                }
                inner.sources.insert(
                    transport_id.to_string(),
                    SourceEntry {
                        priority,
                        state: s,
                        updated_at: now,
                    },
                );
            }
            None => {
                inner.sources.remove(transport_id);
            }
        }

        let selected = Self::select_active(&mut inner, now);
        drop(inner);
        let _ = self.tx.send(selected);
    }

    fn select_active(inner: &mut ManagerInner, now: u64) -> Option<MediaState> {
        // Purge stale sources.
        inner
            .sources
            .retain(|_, e| now.saturating_sub(e.updated_at) < STALE_MS);

        // Candidate: playing sources first, then priority, then recency.
        let mode = inner.config.mode.clone();
        let best = inner
            .sources
            .iter()
            .filter(|(id, _)| Self::source_allowed(&inner.config, id, &mode))
            .max_by_key(|(_, e)| (e.state.is_playing, e.priority, e.updated_at))
            .map(|(id, _)| id.clone());

        let current_valid = inner
            .active_id
            .as_ref()
            .and_then(|id| inner.sources.get(id))
            .map(|e| e.state.is_playing)
            .unwrap_or(false);

        if let Some(best_id) = best {
            let should_switch = match &inner.active_id {
                Some(cur) if *cur == best_id => false,
                Some(cur) => {
                    let cur_prio = inner.sources.get(cur).map(|e| e.priority).unwrap_or(i32::MIN);
                    let best_prio = inner
                        .sources
                        .get(&best_id)
                        .map(|e| e.priority)
                        .unwrap_or(i32::MIN);
                    // Hysteresis: switch only if current stopped/stale, or
                    // challenger outranks it and debounce window elapsed.
                    !current_valid
                        || (best_prio > cur_prio
                            && now.saturating_sub(inner.last_switch_at) > SWITCH_DEBOUNCE_MS)
                }
                None => true,
            };
            if should_switch {
                inner.active_id = Some(best_id);
                inner.last_switch_at = now;
            }
        } else {
            inner.active_id = None;
        }

        inner
            .active_id
            .as_ref()
            .and_then(|id| inner.sources.get(id))
            .map(|e| e.state.clone())
    }

    pub fn current(&self) -> Option<MediaState> {
        let mut inner = self.inner.lock().unwrap();
        Self::select_active(&mut inner, now_ms())
    }

    pub fn diagnostics(&self) -> ManagerDiagnostics {
        let mut inner = self.inner.lock().unwrap();
        let selected = Self::select_active(&mut inner, now_ms());
        Self::diagnostics_locked(&mut inner, selected)
    }

    fn source_allowed(config: &TransportConfig, id: &str, mode: &TransportMode) -> bool {
        match mode {
            TransportMode::Auto => match id {
                "native_media" => config.native_media_enabled,
                "extension" => config.browser_extension_enabled,
                "mock" => false,
                _ => true,
            },
            TransportMode::BrowserExtension => id == "extension" && config.browser_extension_enabled,
            TransportMode::NativeMedia => id == "native_media" && config.native_media_enabled,
            TransportMode::Mock => id == "mock",
        }
    }

    pub fn extension_provider_allowed(config: &TransportConfig, media: &MediaState) -> bool {
        let Some(provider) = ExtensionProvider::from_service(media.source.service.as_deref()) else { return false; };
        config.browser_extension_providers.contains(&provider)
            && config.browser_extension_provider.provider().map_or(true, |selected| selected == provider)
    }

    fn diagnostics_locked(inner: &mut ManagerInner, active: Option<MediaState>) -> ManagerDiagnostics {
        let active_id = active.as_ref().map(|media| media.source.transport_id.as_str());
        let config = inner.config.clone();
        let diagnostic = |id: &str, enabled: bool, priority: i32, message: &str| {
            let entry = inner.sources.get(id);
            let status = if !enabled { "disabled" } else if entry.is_some() { "connected" } else { "waiting" };
            TransportDiagnostic {
                id: id.into(), enabled, priority, status: status.into(),
                last_updated_at: entry.map(|entry| entry.updated_at),
                active: active_id == Some(id), message: message.into(),
            }
        };
        #[allow(unused_mut)]
        let mut transports = vec![
            diagnostic("native_media", config.native_media_enabled, config.native_media_priority, "Reads the operating system media session."),
            diagnostic("extension", config.browser_extension_enabled, config.browser_extension_priority, "Receives updates at the local /ingest endpoint."),
        ];
        #[cfg(debug_assertions)]
        transports.push(diagnostic("mock", config.mode == TransportMode::Mock, -100, "Development-only sample source."));
        ManagerDiagnostics { config, active_media: active, transports }
    }
}

pub struct TransportManager {
    handle: TransportManagerHandle,
    transports: Vec<Box<dyn Transport>>,
}

impl TransportManager {
    pub fn new() -> Self {
        Self {
            handle: TransportManagerHandle::new(),
            transports: vec![],
        }
    }

    pub fn handle(&self) -> TransportManagerHandle {
        self.handle.clone()
    }

    pub fn add_transport(&mut self, transport: Box<dyn Transport>) {
        self.handle
            .register_priority(transport.id(), transport.priority());
        self.transports.push(transport);
    }

    pub fn start_all(&self) {
        for t in &self.transports {
            if let Err(e) = t.start(self.handle.clone()) {
                eprintln!("[transport:{}] failed to start: {}", t.id(), e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state(title: &str, playing: bool) -> MediaState {
        MediaState {
            track_id: None,
            title: title.into(),
            artists: vec!["Artist".into()],
            album: None,
            artwork: None,
            duration: Some(180.0),
            position: Some(10.0),
            is_playing: playing,
            source: MediaSource {
                transport_id: String::new(),
                service: Some("test".into()),
            },
            timestamps: None,
        }
    }

    #[test]
    fn test_media_state_serializes_camel_case() {
        let s = state("Test Track", true);
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("Test Track"));
        assert!(json.contains("isPlaying"));
        assert!(json.contains("transportId"));
    }

    #[test]
    fn test_manager_selects_playing_source() {
        let m = TransportManagerHandle::new();
        m.register_priority("a", 10);
        m.register_priority("b", 5);
        m.push_update("b", Some(state("B track", true)));
        m.push_update("a", Some(state("A track", false)));
        // Playing beats priority.
        assert_eq!(m.current().unwrap().title, "B track");
    }

    #[test]
    fn test_manager_priority_between_playing() {
        let m = TransportManagerHandle::new();
        m.register_priority("ext", 10);
        m.register_priority("native", 5);
        m.push_update("native", Some(state("Native", true)));
        // First source wins immediately.
        assert_eq!(m.current().unwrap().title, "Native");
    }

    #[test]
    fn test_manager_clears_on_removal() {
        let m = TransportManagerHandle::new();
        m.register_priority("a", 1);
        m.push_update("a", Some(state("A", true)));
        assert!(m.current().is_some());
        m.push_update("a", None);
        assert!(m.current().is_none());
    }

    #[test]
    fn config_changes_apply_to_existing_sources() {
        let m = TransportManagerHandle::new();
        m.register_priority("native_media", 10);
        m.register_priority("extension", 20);
        m.push_update("native_media", Some(state("Native", true)));
        m.push_update("extension", Some(state("Extension", true)));
        let config = TransportConfig {
            native_media_enabled: true,
            browser_extension_enabled: true,
            native_media_priority: 30,
            browser_extension_priority: 20,
            browser_extension_providers: TransportConfig::default().browser_extension_providers,
            browser_extension_provider: ExtensionProviderSelection::Auto,
            mode: TransportMode::Auto,
        };
        m.update_config(config);
        assert_eq!(m.current().unwrap().title, "Native");
    }

    #[test]
    fn extension_provider_selection_rejects_other_services() {
        let mut config = TransportConfig::default();
        config.browser_extension_provider = ExtensionProviderSelection::Spotify;
        let mut spotify = state("Spotify", true);
        spotify.source.service = Some("Spotify".into());
        let mut yandex = state("Yandex", true);
        yandex.source.service = Some("Yandex Music".into());
        assert!(TransportManagerHandle::extension_provider_allowed(&config, &spotify));
        assert!(!TransportManagerHandle::extension_provider_allowed(&config, &yandex));
    }
}
