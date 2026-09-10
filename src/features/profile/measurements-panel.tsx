"use client";

import { useEffect, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  compareMeasurements,
  computeBodyMassIndex,
  createMeasurement,
  type Measurement,
  type MeasurementDelta,
} from "@/domain/profile/measurement";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import { listMeasurements, saveMeasurement, uploadProgressPhoto } from "./measurements-repository";

const historyLimit = 6;
const initialStatus = "Nenhuma medida registrada ainda.";

/** Nome legível de cada medida comparada — o nome do campo nunca vai para a tela. */
const measurementFieldLabels: Record<MeasurementDelta["field"], string> = {
  armCm: "Braço (cm)",
  chestCm: "Peito (cm)",
  hipCm: "Quadril (cm)",
  thighCm: "Coxa (cm)",
  waistCm: "Cintura (cm)",
  weightKg: "Peso (kg)",
};

function parseOptionalNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Private measurements and progress photos. Nothing here is ever visible to a
 * training partner: the collection and the Storage folder are owner-only.
 */
export function MeasurementsPanel() {
  const { status: authStatus, user } = useAuthSession();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [waist, setWaist] = useState("");
  const [history, setHistory] = useState<Measurement[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!user) {
        return;
      }

      try {
        const measurements = await listMeasurements(user.uid, historyLimit);
        if (!active) {
          return;
        }

        setHistory(measurements);
        if (measurements.length > 0) {
          setStatus(`${measurements.length} medida(s) no seu histórico privado.`);
        }
      } catch {
        if (active) {
          setStatus("Não foi possível carregar suas medidas agora.");
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [user]);

  async function save() {
    if (!user) {
      return;
    }

    setSaving(true);
    try {
      const measurement = createMeasurement({
        armCm: null,
        bodyFatPercent: null,
        chestCm: null,
        heightCm: parseOptionalNumber(height),
        hipCm: null,
        id: `measurement-${crypto.randomUUID()}`,
        notes: null,
        ownerUid: user.uid,
        thighCm: null,
        waistCm: parseOptionalNumber(waist),
        weightKg: parseOptionalNumber(weight),
      });

      await saveMeasurement(measurement);
      setHistory((current) => [measurement, ...current].slice(0, historyLimit));
      setStatus("Medida registrada de forma privada.");
    } catch {
      setStatus("Não foi possível registrar a medida agora. Revise os valores.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) {
      return;
    }

    setSaving(true);
    try {
      await uploadProgressPhoto(file);
      setStatus("Foto de progresso enviada para a sua pasta privada.");
    } catch {
      setStatus("Não foi possível enviar a foto agora.");
    } finally {
      setSaving(false);
    }
  }

  if (authStatus !== "authenticated") {
    return null;
  }

  const latest = history.at(0) ?? null;
  const previous = history.at(1) ?? null;
  const bmi = latest ? computeBodyMassIndex(latest) : null;
  const deltas = latest && previous ? compareMeasurements(previous, latest) : [];

  return (
    <section aria-labelledby="measurements-title" className="space-y-3">
      <SectionHeader
        description="Privadas por padrão. Nenhum parceiro de treino vê suas medidas ou fotos."
        id="measurements-title"
        title="Medidas e fotos"
      />
      <Card className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            id="measurement-weight"
            inputMode="decimal"
            label="Peso (kg)"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
          <Input
            id="measurement-height"
            inputMode="decimal"
            label="Altura (cm)"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
          />
          <Input
            id="measurement-waist"
            inputMode="decimal"
            label="Cintura (cm)"
            value={waist}
            onChange={(event) => setWaist(event.target.value)}
          />
        </div>

        <Button disabled={saving} onClick={() => void save()}>
          Registrar medida
        </Button>

        <div className="grid gap-2 border-t border-wt-border pt-5">
          <label className="wt-text-label text-wt-text-primary" htmlFor="progress-photo">
            Foto de progresso (privada)
          </label>
          <input
            accept="image/*"
            className="min-h-11 rounded-wt-md border border-wt-border bg-wt-surface px-3 py-2 text-wt-body-sm file:mr-3 file:rounded-wt-sm file:border-0 file:bg-wt-accent-subtle file:px-3 file:py-1.5 file:font-semibold file:text-wt-accent-text"
            id="progress-photo"
            type="file"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </div>

        {latest ? (
          <div className="space-y-1 rounded-wt-lg bg-wt-surface-elevated p-4">
            <p className="text-wt-label font-semibold">Última medida</p>
            <p className="text-wt-body-sm text-wt-text-secondary-strong">
              {latest.takenAt.slice(0, 10).split("-").reverse().join("/")} ·{" "}
              {latest.weightKg ?? "—"} kg · {bmi === null ? "IMC indisponível" : `IMC ${bmi}`}
            </p>
            <p className="wt-text-caption text-wt-text-secondary-strong">
              O IMC é só uma referência; ele não é usado para montar seu treino.
            </p>
            {deltas.length > 0 ? (
              <ul className="pt-1 text-wt-body-sm text-wt-text-secondary-strong">
                {deltas.map((delta) => (
                  <li key={delta.field}>
                    {measurementFieldLabels[delta.field]}:{" "}
                    {delta.variation > 0 ? `+${delta.variation}` : delta.variation}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <LiveRegion politeness="polite" visible={Boolean(status) && status !== initialStatus}>
          {status}
        </LiveRegion>
      </Card>
    </section>
  );
}
