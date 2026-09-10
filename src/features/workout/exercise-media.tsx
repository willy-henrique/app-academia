"use client";

import { VideoOff } from "lucide-react";
import { useState } from "react";

import type { Exercise } from "@/domain/workout/exercise";

/**
 * A CSP só libera mídia da própria origem e do Firebase Storage
 * (`media-src` em `security-headers.ts`). Uma URL fora disso seria bloqueada
 * pelo navegador e mostraria um player quebrado — então nem tentamos.
 */
export function isPlayableMediaUrl(url: string | null): url is string {
  if (!url) {
    return false;
  }

  if (url.startsWith("/")) {
    return true;
  }

  try {
    return new URL(url).hostname === "firebasestorage.googleapis.com";
  } catch {
    return false;
  }
}

type ExerciseMediaProps = Readonly<{
  exercise: Pick<Exercise, "accessibleDescription" | "captions" | "name" | "video">;
}>;

/**
 * Vídeo do exercício: nunca toca sozinho, começa mudo, não baixa nada até a
 * pessoa apertar play (`preload="none"`) e mantém a descrição acessível em
 * texto. Sem vídeo disponível, a descrição textual assume o lugar.
 */
export function ExerciseMedia({ exercise }: ExerciseMediaProps) {
  const [failed, setFailed] = useState(false);
  const { video } = exercise;
  const playable = isPlayableMediaUrl(video.src) && !failed;
  const poster = isPlayableMediaUrl(video.posterUrl) ? video.posterUrl : undefined;

  return (
    <figure className="m-0 space-y-2">
      {playable ? (
        <video
          aria-label={`Demonstração: ${exercise.name}`}
          className="aspect-video w-full rounded-wt-lg bg-wt-surface-elevated object-cover"
          controls
          muted
          playsInline
          poster={poster}
          preload="none"
          src={video.src ?? undefined}
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
          <span>Vídeo indisponível no momento. Siga a descrição abaixo.</span>
        </div>
      )}
      <figcaption className="text-wt-body-sm text-wt-text-secondary-strong">
        {exercise.accessibleDescription}
      </figcaption>
    </figure>
  );
}
