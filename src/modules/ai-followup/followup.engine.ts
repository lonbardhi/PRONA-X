import type {
  FollowUpInsight,
  FollowUpUrgencyLevel,
  LeadActivityEvent,
  LeadActivityEventType,
  LeadChannel,
} from "./followup.types";

const appTimeZone = "Europe/Tirane";
const defaultDay = "Tuesday";
const defaultHour = 10;
const positiveTimeSignalTypes: LeadActivityEventType[] = [
  "email_clicked",
  "email_replied",
  "property_viewed",
  "property_saved",
  "whatsapp_reply_received",
  "phone_call_answered",
  "viewing_requested",
  "appointment_booked",
];

const eventWeights: Record<LeadActivityEventType, number> = {
  appointment_booked: 50,
  document_sent: 8,
  email_clicked: 12,
  email_opened: 5,
  email_replied: 25,
  followup_completed: 5,
  manual_note_added: 3,
  no_response: -15,
  phone_call_answered: 25,
  phone_call_missed: -5,
  property_saved: 20,
  property_viewed: 10,
  viewing_requested: 40,
  whatsapp_message_sent: 2,
  whatsapp_reply_received: 30,
};

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: appTimeZone,
  weekday: "long",
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  hour12: false,
  timeZone: appTimeZone,
});

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function getEventDate(event: LeadActivityEvent) {
  const date = new Date(event.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAgeDays(date: Date, now: Date) {
  return Math.max(0, (now.getTime() - date.getTime()) / 86_400_000);
}

function getRecencyMultiplier(ageDays: number) {
  if (ageDays <= 3) return 1.25;
  if (ageDays <= 7) return 1;
  if (ageDays <= 14) return 0.75;
  if (ageDays <= 30) return 0.45;
  return 0.2;
}

function getRecencyBonus(ageDays: number | null) {
  if (ageDays == null) return 0;
  if (ageDays <= 1) return 20;
  if (ageDays <= 3) return 15;
  if (ageDays <= 7) return 8;
  if (ageDays <= 14) return 3;
  return 0;
}

function getTimeParts(date: Date) {
  const day = dayFormatter.format(date);
  const rawHour = Number(hourFormatter.format(date).replace(/\D/g, ""));
  const hour = Number.isFinite(rawHour) ? rawHour % 24 : defaultHour;

  return { day, hour };
}

function formatWindow(hour: number) {
  const start = `${String(hour).padStart(2, "0")}:00`;
  const endHour = (hour + 2) % 24;
  const end = `${String(endHour).padStart(2, "0")}:00`;

  return `${start}–${end}`;
}

function getLastActivity(events: LeadActivityEvent[]) {
  return events
    .map(getEventDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function countEvents(events: LeadActivityEvent[], eventType: LeadActivityEventType) {
  return events.filter((event) => event.eventType === eventType).length;
}

function hasAnyEvent(events: LeadActivityEvent[], eventTypes: LeadActivityEventType[]) {
  return events.some((event) => eventTypes.includes(event.eventType));
}

function calculateEngagementScore(events: LeadActivityEvent[], now: Date) {
  const weighted = events.reduce((total, event) => {
    const date = getEventDate(event);
    const ageDays = date ? getAgeDays(date, now) : 365;
    return total + eventWeights[event.eventType] * getRecencyMultiplier(ageDays);
  }, 0);

  return clamp(weighted);
}

function calculatePreferredChannel(events: LeadActivityEvent[]) {
  const channelScores: Record<LeadChannel, number> = {
    crm: 0,
    email: 0,
    manual: 0,
    phone: 0,
    unknown: 0,
    whatsapp: 0,
  };

  for (const event of events) {
    if (event.channel) {
      channelScores[event.channel] += Math.max(1, eventWeights[event.eventType] * 0.35);
    }

    if (event.eventType === "whatsapp_reply_received") channelScores.whatsapp += 40;
    if (event.eventType === "whatsapp_message_sent") channelScores.whatsapp += 5;
    if (event.eventType === "email_replied") channelScores.email += 35;
    if (event.eventType === "email_clicked") channelScores.email += 15;
    if (event.eventType === "email_opened") channelScores.email += 5;
    if (event.eventType === "phone_call_answered") channelScores.phone += 35;
    if (event.eventType === "phone_call_missed") channelScores.phone -= 5;
  }

  const [bestChannel, bestScore] = Object.entries(channelScores).sort(
    (a, b) => b[1] - a[1],
  )[0] as [LeadChannel, number];

  return bestScore > 0 && bestChannel !== "unknown" ? bestChannel : "whatsapp";
}

function calculateBestContactTime(events: LeadActivityEvent[], now: Date) {
  const timeScores = new Map<string, { day: string; hour: number; score: number }>();

  for (const event of events) {
    if (!positiveTimeSignalTypes.includes(event.eventType)) continue;

    const date = getEventDate(event);
    if (!date) continue;

    const { day, hour } = getTimeParts(date);
    const key = `${day}:${hour}`;
    const previous = timeScores.get(key);
    const score =
      Math.max(1, eventWeights[event.eventType]) *
      getRecencyMultiplier(getAgeDays(date, now));

    timeScores.set(key, {
      day,
      hour,
      score: (previous?.score || 0) + score,
    });
  }

  const best = Array.from(timeScores.values()).sort((a, b) => b.score - a.score)[0];
  const day = best?.day || defaultDay;
  const hour = best?.hour ?? defaultHour;

  return {
    bestContactDay: day,
    bestContactHour: hour,
    bestContactWindow: formatWindow(hour),
  };
}

function calculateUrgency(
  events: LeadActivityEvent[],
  engagementScore: number,
  lastActivity: Date | null,
  now: Date,
): FollowUpUrgencyLevel {
  if (hasAnyEvent(events, ["appointment_booked", "viewing_requested"])) return "High";

  const lastActivityAgeDays = lastActivity ? getAgeDays(lastActivity, now) : null;
  if (engagementScore >= 75 && lastActivityAgeDays != null && lastActivityAgeDays <= 7) {
    return "High";
  }

  if (
    engagementScore >= 50 ||
    hasAnyEvent(events, ["email_replied", "whatsapp_reply_received", "phone_call_answered"])
  ) {
    return "Medium";
  }

  return "Low";
}

function calculateResponseProbability(
  events: LeadActivityEvent[],
  engagementScore: number,
  lastActivity: Date | null,
  now: Date,
) {
  const lastActivityAgeDays = lastActivity ? getAgeDays(lastActivity, now) : null;
  const replyBonus = hasAnyEvent(events, [
    "email_replied",
    "whatsapp_reply_received",
    "phone_call_answered",
  ])
    ? 10
    : 0;

  return clamp(engagementScore * 0.65 + getRecencyBonus(lastActivityAgeDays) + replyBonus);
}

function getRecommendedAction({
  bestContactWindow,
  preferredChannel,
  urgencyLevel,
}: {
  bestContactWindow: string;
  preferredChannel: LeadChannel;
  urgencyLevel: FollowUpUrgencyLevel;
}) {
  if (urgencyLevel === "High") {
    return `Contact this lead through ${preferredChannel} during ${bestContactWindow}. They are showing strong buying intent.`;
  }

  if (urgencyLevel === "Medium") {
    return `Follow up through ${preferredChannel} during ${bestContactWindow} with similar property options or an investment-focused update.`;
  }

  return `Keep this lead warm. Send a light check-in through ${preferredChannel} during ${bestContactWindow}.`;
}

function getReasoningSignals(
  events: LeadActivityEvent[],
  lastActivity: Date | null,
  now: Date,
) {
  const strongestSignals: string[] = [];
  const weakSignals: string[] = [];

  if (countEvents(events, "appointment_booked") > 0) strongestSignals.push("Appointment booked");
  if (countEvents(events, "viewing_requested") > 0) strongestSignals.push("Viewing requested");
  if (countEvents(events, "whatsapp_reply_received") > 0) strongestSignals.push("Replied on WhatsApp");
  if (countEvents(events, "email_replied") > 0) strongestSignals.push("Replied by email");
  if (countEvents(events, "phone_call_answered") > 0) strongestSignals.push("Phone call answered");
  if (countEvents(events, "property_viewed") >= 2) strongestSignals.push("Viewed properties multiple times");
  if (countEvents(events, "property_saved") > 0) strongestSignals.push("Saved property");
  if (countEvents(events, "email_clicked") > 0) strongestSignals.push("Clicked email link");

  if (countEvents(events, "no_response") > 0) weakSignals.push("Recent no-response signal");
  if (countEvents(events, "phone_call_missed") > 0) weakSignals.push("Missed phone call");
  if (!lastActivity || getAgeDays(lastActivity, now) > 14) weakSignals.push("No recent activity");
  if (events.length < 3) weakSignals.push("Low event count");

  return { strongestSignals, weakSignals };
}

export function generateFollowUpInsight(
  leadId: string,
  events: LeadActivityEvent[],
  now = new Date(),
): FollowUpInsight {
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = getEventDate(a)?.getTime() || 0;
    const bTime = getEventDate(b)?.getTime() || 0;
    return bTime - aTime;
  });

  if (sortedEvents.length === 0) {
    return {
      bestContactDay: defaultDay,
      bestContactHour: defaultHour,
      bestContactWindow: formatWindow(defaultHour),
      engagementScore: 0,
      leadId,
      preferredChannel: "whatsapp",
      reasoning: {
        eventCount: 0,
        strongestSignals: [],
        weakSignals: ["No activity events recorded yet"],
      },
      recommendedAction:
        "No engagement data yet. Log an interaction or send a first WhatsApp message to start tracking this lead.",
      responseProbability: 0,
      urgencyLevel: "Low",
    };
  }

  const engagementScore = calculateEngagementScore(sortedEvents, now);
  const preferredChannel = calculatePreferredChannel(sortedEvents);
  const lastActivity = getLastActivity(sortedEvents);
  const urgencyLevel = calculateUrgency(sortedEvents, engagementScore, lastActivity, now);
  const responseProbability = calculateResponseProbability(
    sortedEvents,
    engagementScore,
    lastActivity,
    now,
  );
  const contactTime = calculateBestContactTime(sortedEvents, now);
  const reasoningSignals = getReasoningSignals(sortedEvents, lastActivity, now);

  return {
    ...contactTime,
    engagementScore,
    leadId,
    preferredChannel,
    reasoning: {
      eventCount: sortedEvents.length,
      lastActivityAt: lastActivity?.toISOString(),
      strongestSignals: reasoningSignals.strongestSignals,
      weakSignals:
        reasoningSignals.weakSignals.length > 0
          ? reasoningSignals.weakSignals
          : ["No weak signals detected"],
    },
    recommendedAction: getRecommendedAction({
      bestContactWindow: contactTime.bestContactWindow,
      preferredChannel,
      urgencyLevel,
    }),
    responseProbability,
    urgencyLevel,
  };
}
