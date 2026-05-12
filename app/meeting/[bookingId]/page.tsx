"use client";

import { useParams } from "next/navigation";
import MeetingExperience from "@/components/meeting/MeetingExperience";

export default function MeetingPage() {
  const params = useParams<{ bookingId: string }>();
  return <MeetingExperience bookingId={params.bookingId} />;
}
