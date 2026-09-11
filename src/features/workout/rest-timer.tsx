"use client";

import { SkipForward, Timer } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

import { formatClock } from "./workout-summary";

type RestTimerProps = Readonly<{
  disabled?: boolean;
  elapsedSeconds: number;
  nextLabel: string;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
  remainingSeconds: number;
}>;

/**
 * Descanso entre séries. O âmbar é só indicador (ícone, barra e borda) — a tela
 * não vira laranja — e o formulário da próxima série continua visível e
 * utilizável: dá para começar antes se a pessoa quiser.
 *
 * O número muda a cada segundo, então fica fora da árvore acessível; o leitor
 * de tela recebe um texto que só muda de estado (ver `WorkoutPageClient`).
 */

function playBeep(freq = 880, duration = 0.15) {
  if (typeof window === "undefined") return;
  try {
    const AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // áudio silencioso se bloqueado pelo browser
  }
}

export function RestTimer({
  disabled,
  elapsedSeconds,
  nextLabel,
  onAdjust,
  onSkip,
  remainingSeconds,
}: RestTimerProps) {
  // Beep tátil/sonoro sutil nos últimos 3 segundos para alertar o atleta sem precisar olhar a tela
  useEffect(() => {
    if (remainingSeconds === 3 || remainingSeconds === 2 || remainingSeconds === 1) {
      playBeep(660, 0.1);
    } else if (remainingSeconds === 0) {
      playBeep(980, 0.25);
    }
  }, [remainingSeconds]);

  const targetSeconds = Math.max(1, elapsedSeconds + remainingSeconds);

  return (
    <section
      aria-label="Descanso"
      className="wt-pop-in rounded-wt-card border border-wt-warning/40 bg-wt-surface p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-wt-label font-semibold text-wt-warning-text">
            <Timer aria-hidden="true" className="size-4" />
            Descanso
          </p>
          <p
            aria-hidden="true"
            className="mt-1 text-[2.75rem] font-extrabold leading-none tracking-[-0.03em] text-wt-text-primary wt-tabular"
          >
            {formatClock(remainingSeconds)}
          </p>
          <p className="mt-2 truncate text-wt-body-sm text-wt-text-secondary-strong">
            Próxima: {nextLabel}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex gap-2">
            <Button
              aria-label="Diminuir descanso em 15 segundos"
              disabled={disabled}
              size="icon"
              variant="secondary"
              onClick={() => onAdjust(-15)}
            >
              −15
            </Button>
            <Button
              aria-label="Adicionar 15 segundos de descanso"
              disabled={disabled}
              size="icon"
              variant="secondary"
              onClick={() => onAdjust(15)}
            >
              +15
            </Button>
          </div>
          <Button disabled={disabled} variant="ghost" onClick={onSkip}>
            <SkipForward aria-hidden="true" className="size-4" />
            Pular
          </Button>
        </div>
      </div>
      <ProgressBar
        className="mt-4"
        label="Tempo de descanso"
        max={targetSeconds}
        tone="warning"
        value={elapsedSeconds}
        valueText={`${formatClock(elapsedSeconds)} de ${formatClock(targetSeconds)}`}
      />
    </section>
  );
}
