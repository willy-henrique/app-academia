"use client";

import { useEffect, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  compareMeasurements,
  computeBodyMassIndex,
  createMeasurement,
  type Measurement,
} from "@/domain/profile/measurement";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import { listMeasurements, saveMeasurement, uploadProgressPhoto } from "./measurements-repository";

const historyLimit = 6;

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
  const [status, setStatus] = useState("Nenhuma medida registrada ainda.");
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
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-xl font-semibold">Medidas e fotos</h2>
        <p className="wt-text-body text-wt-text-secondary">
          Dados privados por padrão. Nenhum parceiro de treino vê suas medidas ou fotos.
        </p>
      </div>

      <div className="grid gap-3">
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

      <div className="grid gap-2">
        <label className="wt-text-label text-wt-text-primary" htmlFor="progress-photo">
          Foto de progresso (privada)
        </label>
        <input
          accept="image/*"
          className="min-h-11 rounded-wt-md border border-wt-border bg-wt-surface px-3 py-2"
          id="progress-photo"
          type="file"
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>

      {latest ? (
        <div className="space-y-1 rounded-wt-md border border-wt-border bg-wt-surface p-4">
          <p className="wt-text-body font-medium">Última medida</p>
          <p className="wt-text-caption text-wt-text-secondary">
            {latest.takenAt.slice(0, 10)} · {latest.weightKg ?? "—"} kg ·{" "}
            {bmi === null ? "IMC indisponível" : `IMC ${bmi}`}
          </p>
          {deltas.length > 0 ? (
            <ul className="wt-text-caption text-wt-text-secondary">
              {deltas.map((delta) => (
                <li key={delta.field}>
                  {delta.field}: {delta.variation > 0 ? `+${delta.variation}` : delta.variation}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <LiveRegion politeness="polite">{status}</LiveRegion>
    </Card>
  );
}
