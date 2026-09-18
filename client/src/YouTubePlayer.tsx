import { useEffect, useRef } from "react";

type YouTubePlayerProps = {
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
};

function YouTubePlayer({
  videoId,
  isPlaying,
  currentTime,
  onTimeUpdate,
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  // =========================
  // SEND COMMAND TO YOUTUBE
  // =========================
  const sendCommand = (command: string, value?: number) => {
    if (!iframeRef.current) {
      return;
    }

    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: command,
        args: value !== undefined ? [value] : [],
      }),
      "*"
    );
  };

  // =========================
  // PLAY / PAUSE
  // =========================
  useEffect(() => {
    if (!videoId) {
      return;
    }

    if (isPlaying) {
      sendCommand("playVideo");
    } else {
      sendCommand("pauseVideo");
    }
  }, [isPlaying, videoId]);

  // =========================
  // SEEK
  // =========================
  useEffect(() => {
    if (!videoId) {
      return;
    }

    if (currentTime > 0) {
      sendCommand("seekTo", currentTime);
    }
  }, [currentTime, videoId]);

  // =========================
  // CURRENT TIME
  // =========================
  useEffect(() => {
    if (!videoId) {
      return;
    }

    intervalRef.current = window.setInterval(() => {
      sendCommand("getCurrentTime");
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [videoId]);

  // =========================
  // RECEIVE YOUTUBE MESSAGE
  // =========================
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (
          data.event === "infoDelivery" &&
          data.info &&
          typeof data.info.currentTime === "number"
        ) {
          onTimeUpdate(data.info.currentTime);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onTimeUpdate]);

  // =========================
  // NO VIDEO
  // =========================
  if (!videoId) {
    return (
      <div>
        <p>No YouTube video selected.</p>
      </div>
    );
  }

  // =========================
  // YOUTUBE PLAYER
  // =========================
  return (
    <div>
      <h2>🎬 Watch Party Video</h2>

      <iframe
        ref={iframeRef}
        width="800"
        height="450"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=http://localhost:5173`}
        title="YouTube Watch Party Player"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />

      <p>
        Current Time: {Math.floor(currentTime)} seconds
      </p>

      <p>
        Status: {isPlaying ? "▶️ Playing" : "⏸️ Paused"}
      </p>
    </div>
  );
}

export default YouTubePlayer;