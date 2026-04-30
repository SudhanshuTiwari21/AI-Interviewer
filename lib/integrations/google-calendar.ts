import "server-only";

import { google } from "googleapis";

type CreateCoachingEventArgs = {
  summary: string;
  description: string;
  startsAtIso: string;
  durationMin: number;
  timezone: string;
  attendeeEmails: string[];
};

type CreatedCalendarEvent = {
  eventId: string;
  htmlLink: string | null;
  meetLink: string | null;
};

function isUsableMeetLink(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "meet.google.com") return false;
    // Google returns this placeholder on invalid conference links.
    if (parsed.pathname.startsWith("/_meet/whoops")) return false;
    return true;
  } catch {
    return false;
  }
}

function getCalendarConfig() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!calendarId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "Google Calendar env vars are missing. Set GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }
  // JSON private keys are commonly pasted with escaped newlines.
  const privateKey = privateKeyRaw.replaceAll("\\n", "\n");
  return { calendarId, clientEmail, privateKey };
}

function getCalendarClient() {
  const { clientEmail, privateKey } = getCalendarConfig();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

function normalizeEmails(emails: string[]) {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    cleaned.push(email);
  }
  return cleaned;
}

function isServiceAccountInviteRestriction(err: unknown) {
  const msg =
    typeof err === "object" && err !== null
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  return msg.includes(
    "Service accounts cannot invite attendees without Domain-Wide Delegation of Authority.",
  );
}

export async function createCoachingCalendarEvent(
  args: CreateCoachingEventArgs,
): Promise<CreatedCalendarEvent> {
  const calendar = getCalendarClient();
  const { calendarId } = getCalendarConfig();

  const startDate = new Date(args.startsAtIso);
  const endDate = new Date(startDate.getTime() + args.durationMin * 60_000);

  const attendees = normalizeEmails(args.attendeeEmails).map((email) => ({ email }));
  const requestBody = {
    summary: args.summary,
    description: args.description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: args.timezone || "Asia/Kolkata",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: args.timezone || "Asia/Kolkata",
    },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: `selectwise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: {
      useDefault: true,
    },
  };

  let response;
  try {
    response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody,
    });
  } catch (err) {
    if (!isServiceAccountInviteRestriction(err)) throw err;
    // Service account lacks domain-wide delegation for attendee invites.
    // Fallback: create event + Meet link without attendees.
    response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      sendUpdates: "none",
      requestBody: {
        ...requestBody,
        attendees: [],
      },
    });
  }

  const event = response.data;
  const meetEntry = event.conferenceData?.entryPoints?.find(
    (x) => x.entryPointType === "video",
  );
  const conferenceId = event.conferenceData?.conferenceId;
  const fallbackMeetByConferenceId = conferenceId
    ? `https://meet.google.com/${conferenceId}`
    : null;
  const meetLinkCandidates = [
    event.hangoutLink ?? null,
    meetEntry?.uri ?? null,
    fallbackMeetByConferenceId,
  ];
  const meetLink = meetLinkCandidates.find((url) => isUsableMeetLink(url)) ?? null;

  return {
    eventId: event.id ?? "",
    htmlLink: event.htmlLink ?? null,
    meetLink,
  };
}
