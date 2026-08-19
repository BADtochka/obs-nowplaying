use super::{Transport, TransportManagerHandle};

#[cfg(windows)]
use super::{MediaSource, MediaState};

#[cfg(windows)]
use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;

pub struct NativeMediaTransport;

impl Transport for NativeMediaTransport {
    fn id(&self) -> &'static str { "native_media" }
    fn priority(&self) -> i32 { 10 }

    fn start(&self, manager: TransportManagerHandle) -> Result<(), String> {
        #[cfg(windows)]
        tokio::spawn(async move {
            let Ok(operation) = GlobalSystemMediaTransportControlsSessionManager::RequestAsync() else {
                eprintln!("[transport:native_media] unable to request media session manager");
                return;
            };
            let Ok(session_manager) = operation.await else {
                eprintln!("[transport:native_media] unable to initialize media session manager");
                return;
            };

            loop {
                let state = match session_manager.GetCurrentSession() {
                    Ok(session) => match session.TryGetMediaPropertiesAsync() {
                        Ok(operation) => match operation.await {
                            Ok(info) => {
                                let title = info.Title().map(|value| crate::server::normalize_title(&value.to_string())).unwrap_or_default();
                                if title.trim().is_empty() {
                                    None
                                } else {
                                    let artist = info.Artist().map(|value| value.to_string()).unwrap_or_default();
                                    let album = info.AlbumTitle().map(|value| value.to_string()).unwrap_or_default();
                                    let service = session.SourceAppUserModelId().map(|value| value.to_string()).ok();
                                    Some(MediaState {
                                        track_id: None,
                                        title,
                                        artists: if artist.is_empty() { vec![] } else { vec![artist] },
                                        album: if album.is_empty() { None } else { Some(album) },
                                        artwork: None,
                                        duration: None,
                                        position: None,
                                        is_playing: true,
                                        source: MediaSource {
                                            transport_id: "native_media".to_string(),
                                            service,
                                        },
                                        timestamps: None,
                                    })
                                }
                            }
                            Err(_) => None,
                        },
                        Err(_) => None,
                    },
                    Err(_) => None,
                };
                manager.push_update("native_media", state);
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
        });

        #[cfg(not(windows))]
        let _ = manager;

        Ok(())
    }
}
