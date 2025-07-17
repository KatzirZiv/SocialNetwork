import React, { useState } from "react";

const MediaPreview = ({ media, mediaType, alt = "Post media", style = {} }) => {
  const [error, setError] = useState(false);

  if (!media || error) return null;

  if (mediaType === "video") {
    return (
      <video
        src={media}
        controls
        style={{ width: "100%", borderRadius: 12, display: "block", ...style }}
        onError={() => setError(true)}
      />
    );
  }

  if (mediaType === "image") {
    return (
      <img
        src={media}
        alt={alt}
        style={{ width: "100%", borderRadius: 12, display: "block", ...style }}
        onError={() => setError(true)}
      />
    );
  }

  return null;
};

export default MediaPreview; 