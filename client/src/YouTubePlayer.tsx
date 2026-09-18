
import { useEffect, useRef } from "react";
import YouTube from "react-youtube";

type Props = {
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  canControl?: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
};

function YouTubePlayer({
  videoId,
  isPlaying,
  currentTime,
  canControl = true,
  onPlay,
  onPause,
  onSeek,
}: Props) {
  const playerRef = useRef<any>(null);

  // Prevent infinite synchronization loop
  const isRemoteUpdate = useRef(false);

  // =====================================
  // YOUTUBE PLAYER READY
  // =====================================

  const handleReady = (event: any) => {
    console.log("YouTube READY");

    playerRef.current = event.target;

    if (currentTime > 0) {
      event.target.seekTo(currentTime, true);
    }

    if (isPlaying) {
      event.target.playVideo();
    }
  };

  // =====================================
  // PLAY / PAUSE STATE CHANGE
  // =====================================

  const handleStateChange = (event: any) => {
    const player = event.target;

    // 1 = PLAYING
    if (event.data === 1) {
      const time = player.getCurrentTime();

      console.log(
        "YouTube PLAY:",
        time
      );

      // Don't send remote changes back
      if (!isRemoteUpdate.current && canControl) {
        onPlay(time);
      }

      isRemoteUpdate.current = false;
    }

    // 2 = PAUSED
    if (event.data === 2) {
      const time = player.getCurrentTime();

      console.log(
        "YouTube PAUSE:",
        time
      );

      // Don't send remote changes back
      if (!isRemoteUpdate.current && canControl) {
        onPause(time);
      }

      isRemoteUpdate.current = false;
    }
  };

  // =====================================
  // DETECT MANUAL SEEK
  // =====================================

  const handlePlaybackRateChange = () => {
    console.log("Playback rate changed");
  };

  // =====================================
  // CONTROL PLAYER FROM PROPS
  // =====================================

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    const player = playerRef.current;

    const playerTime =
      player.getCurrentTime();

    // =====================================
    // SYNCHRONIZE CURRENT TIME
    // =====================================

    if (
      Math.abs(
        playerTime - currentTime
      ) > 1
    ) {
      console.log(
        "Synchronizing video time:",
        currentTime
      );

      isRemoteUpdate.current = true;

      player.seekTo(
        currentTime,
        true
      );
    }

    // =====================================
    // SYNCHRONIZE PLAY / PAUSE
    // =====================================

    if (isPlaying) {
      if (
        player.getPlayerState() !== 1
      ) {
        console.log(
          "Remote PLAY"
        );

        isRemoteUpdate.current = true;

        player.playVideo();
      }
    } else {
      if (
        player.getPlayerState() === 1
      ) {
        console.log(
          "Remote PAUSE"
        );

        isRemoteUpdate.current = true;

        player.pauseVideo();
      }
    }
  }, [
    isPlaying,
    currentTime,
  ]);

  // =====================================
  // PLAYER OPTIONS
  // =====================================

  const opts = {
    width: "100%",
    height: "100%",
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      origin: window.location.origin,
    },
  };

  return (
    <div className="player-wrapper">
      <div className="player-responsive">
        <YouTube
          videoId={videoId}
          className="youtube-iframe"
          onReady={handleReady}
          onStateChange={handleStateChange}
          onPlaybackRateChange={
            handlePlaybackRateChange
          }
          opts={opts}
        />
      </div>

      {/* SEEK CONTROLS (Enabled if permitted) */}
      {canControl && (
        <div className="player-quick-scrub">
          <button
            type="button"
            className="quick-scrub-btn"
            onClick={() => {
              if (!playerRef.current) return;
              const newTime = Math.max(0, playerRef.current.getCurrentTime() - 10);
              playerRef.current.seekTo(newTime, true);
              onSeek(newTime);
            }}
          >
            ⏪ -10s
          </button>
          <button
            type="button"
            className="quick-scrub-btn"
            onClick={() => {
              if (!playerRef.current) return;
              const newTime = playerRef.current.getCurrentTime() + 10;
              playerRef.current.seekTo(newTime, true);
              onSeek(newTime);
            }}
          >
            ⏩ +10s
          </button>
        </div>
      )}
    </div>
  );
}

export default YouTubePlayer;

