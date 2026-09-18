import YouTube from "react-youtube";

type YouTubePlayerProps = {
  videoId: string;
};

function YouTubePlayer({
  videoId,
}: YouTubePlayerProps) {
  const opts = {
    width: "800",
    height: "450",
    playerVars: {
      autoplay: 0,
    },
  };

  return (
    <div>
      <h2>🎥 Watch Party Video</h2>

      <YouTube
        videoId={videoId}
        opts={opts}
      />
    </div>
  );
}

export default YouTubePlayer;