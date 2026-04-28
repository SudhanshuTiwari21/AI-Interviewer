"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/utils";
import { Star } from "lucide-react";

type FeedbackPayload = {
  booking: {
    id: string;
    coachName: string;
    techArea: string;
    startsAt: string;
    durationMin: number;
    candidateName: string;
  };
  alreadySubmitted: boolean;
  canSubmit: boolean;
  message: string | null;
};

export default function CoachFeedbackPage() {
  return (
    <Suspense fallback={null}>
      <FeedbackContent />
    </Suspense>
  );
}

function FeedbackContent() {
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [payload, setPayload] = useState<FeedbackPayload | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing feedback token.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void fetch(`/api/coaching/feedback?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPayload(d);
        else setError(d.message ?? "Could not load feedback request.");
      })
      .catch(() => setError("Could not load feedback request."))
      .finally(() => setLoading(false));
  }, [token]);

  async function submitFeedback() {
    if (!token || !payload?.canSubmit || rating < 1) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/coaching/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          feedbackText,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "Could not submit feedback.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not submit feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50/40 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <Badge tone="accent" dot>
                Coach Feedback
              </Badge>
              <h1 className="mt-2 text-xl font-semibold text-ink-900">Rate your coaching session</h1>
            </div>
            {loading ? (
              <p className="text-sm text-ink-500">Loading...</p>
            ) : error ? (
              <p className="text-sm text-danger-600">{error}</p>
            ) : payload ? (
              <>
                <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-sm">
                  <p className="font-medium text-ink-900">{payload.booking.coachName}</p>
                  <p className="mt-1 text-ink-600">
                    {payload.booking.techArea} · {formatDate(payload.booking.startsAt)} at{" "}
                    {formatTime(payload.booking.startsAt)} · {payload.booking.durationMin} min
                  </p>
                </div>
                {submitted || payload.alreadySubmitted ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-success-600">
                      Feedback submitted successfully. Thank you.
                    </p>
                    <Link href="/dashboard" className="text-sm underline">
                      Back to dashboard
                    </Link>
                  </div>
                ) : payload.canSubmit ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-ink-900">Star rating</p>
                      <div className="mt-2 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => {
                          const active = value <= rating;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setRating(value)}
                              className="rounded-md p-1"
                              aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                            >
                              <Star
                                className={`size-6 ${active ? "fill-amber-400 text-amber-400" : "text-ink-300"}`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-900">Additional feedback</p>
                      <textarea
                        rows={4}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
                        placeholder="Share what went well and what can improve"
                      />
                    </div>
                    <Button onClick={submitFeedback} disabled={saving || rating < 1}>
                      {saving ? "Submitting..." : "Submit feedback"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-ink-600">
                    {payload.message ?? "Feedback will be available after the session."}
                  </p>
                )}
              </>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
