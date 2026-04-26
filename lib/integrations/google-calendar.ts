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

export async function createCoachingCalendarEvent(
  args: CreateCoachingEventArgs,
): Promise<CreatedCalendarEvent> {
  const calendar = getCalendarClient();
  const { calendarId } = getCalendarConfig();

  const startDate = new Date(args.startsAtIso);
  const endDate = new Date(startDate.getTime() + args.durationMin * 60_000);

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
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
      attendees: args.attendeeEmails
        .filter(Boolean)
        .map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `selectwise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: true,
      },
    },
  });

  const event = response.data;
  const meetEntry = event.conferenceData?.entryPoints?.find(
    (x) => x.entryPointType === "video",
  );
  return {
    eventId: event.id ?? "",
    htmlLink: event.htmlLink ?? null,
    meetLink: meetEntry?.uri ?? null,
  };
}
