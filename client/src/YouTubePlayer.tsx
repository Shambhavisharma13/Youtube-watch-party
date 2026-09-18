
import { useEffect, useRef } from "react";
import YouTube from "react-youtube";

type Props = {
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
};

function YouTubePlayer({
  videoId,
  isPlaying,
  currentTime,
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
      if (!isRemoteUpdate.current) {
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
      if (!isRemoteUpdate.current) {
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
    height: "450",

    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
    },
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "800px",
        margin: "20px auto",
      }}
    >
      <YouTube
        videoId={videoId}
        onReady={handleReady}
        onStateChange={handleStateChange}
        onPlaybackRateChange={
          handlePlaybackRateChange
        }
        opts={opts}
      />

      {/* SEEK BUTTONS FOR TESTING */}

      <div
        style={{
          marginTop: "10px",
          display: "flex",
          gap: "10px",
        }}
      >
        <button
          onClick={() => {
            if (!playerRef.current) {
              return;
            }

            const newTime =
              Math.max(
                0,
                playerRef.current.getCurrentTime() -
                  10
              );

            playerRef.current.seekTo(
              newTime,
              true
            );

            onSeek(newTime);
          }}
        >
          ⏪ -10 sec
        </button>

        <button
          onClick={() => {
            if (!playerRef.current) {
              return;
            }

            const newTime =
              playerRef.current.getCurrentTime() +
              10;

            playerRef.current.seekTo(
              newTime,
              true
            );

            onSeek(newTime);
          }}
        >
          ⏩ +10 sec
        </button>
      </div>
    </div>
  );
}

export default YouTubePlayer;

