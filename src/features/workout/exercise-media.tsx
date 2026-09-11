"use client";

import { VideoOff } from "lucide-react";
import { useState } from "react";

import type { Exercise } from "@/domain/workout/exercise";

export function isPlayableMediaUrl(url: string | null): url is string {
  if (!url) {
    return false;
  }

  if (url.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "firebasestorage.googleapis.com" ||
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "youtu.be" ||
      parsed.hostname === "www.youtube-nocookie.com"
    );
  } catch {
    return false;
  }
}

export function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let videoId = "";
    if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.replace("/embed/", "");
      } else {
        videoId = parsed.searchParams.get("v") || "";
      }
    }
    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
    }
  } catch {
    return null;
  }
  return null;
}

type ExerciseMediaProps = Readonly<{
  exercise: Pick<Exercise, "accessibleDescription" | "captions" | "name" | "video">;
}>;

export function ExerciseMedia({ exercise }: ExerciseMediaProps) {
  const [failed, setFailed] = useState(false);
  const { video } = exercise;
  const playable = isPlayableMediaUrl(video.src) && !failed;
  const ytEmbedUrl = getYouTubeEmbedUrl(video.src);
  const poster = isPlayableMediaUrl(video.posterUrl) ? video.posterUrl : undefined;

  return (
    <figure className="m-0 space-y-2">
      {playable && ytEmbedUrl ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-wt-lg bg-wt-surface-elevated">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            src={ytEmbedUrl}
            title={`Demonstração: ${exercise.name}`}
          />
        </div>
      ) : playable && video.src ? (
        <video
          aria-label={`Demonstração: ${exercise.name}`}
          className="aspect-video w-full rounded-wt-lg bg-wt-surface-elevated object-cover"
          controls
          muted
          playsInline
          poster={poster}
          preload="none"
          src={video.src}
          onError={() => setFailed(true)}
        >
          {exercise.captions.map((caption) => (
            <track
              key={caption.src}
              kind={caption.kind === "closed_caption" ? "captions" : "subtitles"}
              label={caption.label}
              src={caption.src}
              srcLang={caption.language}
            />
          ))}
        </video>
      ) : (
        <div className="flex items-center gap-3 rounded-wt-lg bg-wt-surface-elevated px-4 py-3 text-wt-body-sm text-wt-text-secondary-strong">
          <VideoOff aria-hidden="true" className="size-5 shrink-0 text-wt-text-secondary" />
          <span>Vídeo em preparação. Siga a descrição passo a passo abaixo.</span>
        </div>
      )}
      <figcaption className="text-wt-body-sm text-wt-text-secondary-strong">
        {exercise.accessibleDescription}
      </figcaption>
    </figure>
  );
}
