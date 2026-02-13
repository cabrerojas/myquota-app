import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getBillingPeriodsByCreditCard } from "@/features/billingPeriods/services/billingPeriodsApi";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotificationSettings {
  enabled: boolean;
  daysBeforeClosing: number; // 1-5 days before billing period closes
  daysBeforeDueDate: number; // 1-5 days before payment due date
  notificationHour: number; // 0-23, hour of day to send
}

export interface CreditCardForNotification {
  id: string;
  cardLastDigits: string;
  cardType: string;
}

const SETTINGS_KEY = "@myquota_notification_settings";
const SCHEDULED_KEY = "@myquota_scheduled_notifications";

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  daysBeforeClosing: 2,
  daysBeforeDueDate: 3,
  notificationHour: 9,
};

// ─── Settings Persistence ────────────────────────────────────────────────────

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Permission ──────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn("Notifications only work on physical devices");
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Configuration ───────────────────────────────────────────────────────────

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Android Channel ─────────────────────────────────────────────────────────

export async function setupAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("card-reminders", {
      name: "Recordatorios de Tarjeta",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#007BFF",
    });
  }
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

/**
 * Find the next future occurrence of a date.
 * If the date is already in the future, return it as-is.
 */
function getNextFutureDate(dateInput: string | Date): Date | null {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Compute the notification trigger date: N days before the target date,
 * at the specified hour.
 */
function getTriggerDate(
  targetDate: Date,
  daysBefore: number,
  hour: number,
): Date {
  const trigger = new Date(targetDate);
  trigger.setDate(trigger.getDate() - daysBefore);
  trigger.setHours(hour, 0, 0, 0);
  return trigger;
}

// ─── Schedule Notifications ──────────────────────────────────────────────────

export async function scheduleCardNotifications(
  cards: CreditCardForNotification[],
): Promise<number> {
  const settings = await getNotificationSettings();

  if (!settings.enabled) {
    await cancelAllScheduledNotifications();
    return 0;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return 0;

  // Cancel previous notifications before scheduling new ones
  await cancelAllScheduledNotifications();

  const now = new Date();
  let scheduledCount = 0;
  const scheduledIds: string[] = [];

  for (const card of cards) {
    const label = `${card.cardType} •${card.cardLastDigits}`;

    // Fetch billing periods for this card and find the current/next one
    let closingDate: Date | null = null;
    let dueDateForCard: Date | null = null;

    try {
      const periods = await getBillingPeriodsByCreditCard(card.id);
      // Find the next period whose endDate is in the future (sorted by endDate asc)
      const upcoming = periods
        .map((p) => ({
          endDate: new Date(p.endDate),
          dueDate: p.dueDate ? new Date(p.dueDate) : null,
        }))
        .filter((p) => p.endDate > now)
        .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

      if (upcoming.length > 0) {
        closingDate = upcoming[0].endDate;
        dueDateForCard = upcoming[0].dueDate;
      }
    } catch {
      // If billing periods can't be fetched, skip this card
      continue;
    }

    // ── Cierre (billing period end) ──
    if (closingDate) {
      const closingTrigger = getTriggerDate(
        closingDate,
        settings.daysBeforeClosing,
        settings.notificationHour,
      );

      if (closingTrigger > now) {
        const daysText =
          settings.daysBeforeClosing === 1
            ? "mañana"
            : `en ${settings.daysBeforeClosing} días`;
        const dateStr = closingDate.toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
        });

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "🔔 Cierre de tarjeta próximo",
            body: `Tu tarjeta ${label} cierra ${daysText} (${dateStr})`,
            data: { type: "closing", cardId: card.id },
            ...(Platform.OS === "android" && {
              channelId: "card-reminders",
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: closingTrigger,
          },
        });
        scheduledIds.push(id);
        scheduledCount++;
      }
    }

    // ── Vencimiento (due date del período) ──
    if (dueDateForCard) {
      const dueTrigger = getTriggerDate(
        dueDateForCard,
        settings.daysBeforeDueDate,
        settings.notificationHour,
      );

      if (dueTrigger > now) {
        const daysText =
          settings.daysBeforeDueDate === 1
            ? "mañana"
            : `en ${settings.daysBeforeDueDate} días`;
        const dateStr = dueDateForCard.toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
        });

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "⚠️ Vencimiento de tarjeta próximo",
            body: `Tu tarjeta ${label} vence ${daysText} (${dateStr}). ¡No olvides pagar!`,
            data: { type: "dueDate", cardId: card.id },
            ...(Platform.OS === "android" && {
              channelId: "card-reminders",
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dueTrigger,
          },
        });
        scheduledIds.push(id);
        scheduledCount++;
      }
    }
  }

  // Persist scheduled IDs for potential future cancellation
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(scheduledIds));

  return scheduledCount;
}

// ─── Cancel All ──────────────────────────────────────────────────────────────

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(SCHEDULED_KEY);
}

// ─── Debug: List Scheduled ───────────────────────────────────────────────────

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
