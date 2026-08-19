use super::{MediaSource, MediaState, Transport, TransportManagerHandle};

/// Development-only transport that emits a fake looping track.
pub struct MockTransport;

impl Transport for MockTransport {
    fn id(&self) -> &'static str {
        "mock"
    }
    fn priority(&self) -> i32 {
        -100
    }

    fn start(&self, manager: TransportManagerHandle) -> Result<(), String> {
        tokio::spawn(async move {
            let duration = 215.0_f64;
            let mut position = 0.0_f64;
            loop {
                let state = MediaState {
                    track_id: Some("mock-1".into()),
                    title: "Midnight City".into(),
                    artists: vec!["M83".into()],
                    album: Some("Hurry Up, We're Dreaming".into()),
                    artwork: None,
                    duration: Some(duration),
                    position: Some(position),
                    is_playing: true,
                    source: MediaSource {
                        transport_id: "mock".into(),
                        service: Some("mock".into()),
                    },
                    timestamps: None,
                };
                manager.push_update("mock", Some(state));
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                position = (position + 5.0) % duration;
            }
        });
        Ok(())
    }
}
