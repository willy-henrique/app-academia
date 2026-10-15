"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { SectionHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { defaultNotificationPreferences } from "@/domain/settings/notification-preferences";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "./notification-preferences-repository";

const initialStatus = "";

/**
 * This is intentionally an in-app setting. It controls the reminder shown on
 * the dashboard; push notifications are not requested or simulated here.
 */
export function NotificationPreferencesPanel() {
  const { mode, status: authStatus, user } = useAuthSession();
  const [showWeeklyGoalReminder, setShowWeeklyGoalReminder] = useState(
    defaultNotificationPreferences.showWeeklyGoalReminder,
  );
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "local" || authStatus !== "authenticated" || !user) {
      return;
    }

    const uid = user.uid;
    let active = true;

    async function load() {
      try {
        const preferences = await loadNotificationPreferences(uid);
        if (active) {
          setShowWeeklyGoalReminder(preferences.showWeeklyGoalReminder);
        }
      } catch {
        if (active) {
          setStatus("Não foi possível carregar seus lembretes. Você pode tentar salvar novamente.");
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [authStatus, mode, user]);

  async function save() {
    setSaving(true);
    try {
      await saveNotificationPreferences({ showWeeklyGoalReminder });
      setStatus("Preferência de lembrete salva.");
    } catch {
      setStatus("Não foi possível salvar seu lembrete agora.");
    } finally {
      setSaving(false);
    }
  }

  if (authStatus !== "authenticated") {
    return null;
  }

  return (
    <section aria-labelledby="reminders-title" className="space-y-3">
      <SectionHeader
        description="Escolha o que aparece no Início ao abrir o WillTreino."
        id="reminders-title"
        title="Lembretes"
      />
      <Card className="space-y-4 p-5">
        <div className="flex gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-wt-md bg-wt-accent-subtle text-wt-accent-text"
          >
            <Bell className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="wt-text-label font-semibold text-wt-text-primary">
              Lembrete da meta semanal
            </p>
            <p className="text-wt-body-sm text-wt-text-secondary-strong">
              Mostra no Início quantos treinos ainda faltam para sua meta da semana.
            </p>
          </div>
        </div>

        {mode === "local" ? (
          <p className="rounded-wt-lg bg-wt-surface-elevated p-4 text-wt-body-sm text-wt-text-secondary-strong">
            No modo local, o lembrete aparece com a configuração padrão. Conecte o Firebase para
            salvar sua escolha entre dispositivos.
          </p>
        ) : (
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-wt-md border border-wt-border px-3 py-2 text-wt-body-sm text-wt-text-primary">
              <input
                checked={showWeeklyGoalReminder}
                className="size-4 accent-[var(--wt-accent-hover)]"
                type="checkbox"
                onChange={(event) => setShowWeeklyGoalReminder(event.target.checked)}
              />
              Exibir lembrete no Início
            </label>
            <Button
              loading={saving}
              loadingLabel="Salvando"
              onClick={() => void save()}
              variant="secondary"
            >
              Salvar lembretes
            </Button>
          </>
        )}

        <p className="wt-text-caption text-wt-text-secondary-strong">
          Notificações do navegador e push ainda não estão habilitadas; não pediremos essa permissão
          nesta versão.
        </p>
        <LiveRegion politeness="polite" visible={Boolean(status)}>
          {status}
        </LiveRegion>
      </Card>
    </section>
  );
}
