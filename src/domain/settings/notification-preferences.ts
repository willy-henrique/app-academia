import { z } from "zod";

/**
 * Preferências para avisos exibidos dentro do produto. Elas não representam
 * permissão do navegador nem notificações push: essa infraestrutura ainda não
 * está habilitada e precisa de consentimento próprio quando for implementada.
 */
export const notificationPreferencesSchema = z.object({
  showWeeklyGoalReminder: z.boolean().default(true),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const defaultNotificationPreferences: NotificationPreferences = {
  showWeeklyGoalReminder: true,
};
