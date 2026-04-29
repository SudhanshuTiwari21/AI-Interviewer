"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ResumeUpload } from "@/components/interview/ResumeUpload";
import { store } from "@/lib/store";
import { FOCUS_AREAS, type Role, type Level } from "@/lib/mock-data";
import { TARGET_ROLES } from "@/lib/target-roles";
import type { ParsedResume } from "@/lib/resume";
import type { Difficulty, InterviewerMode } from "@/lib/question-engine";
import { INTERVIEW_PRICE_INR } from "@/lib/plan-access";
import { ensureRazorpayScriptLoaded } from "@/lib/payments/client";
import { cn, uid } from "@/lib/utils";
import { LiveTranscriber } from "@/lib/speech";
import {
  Check,
  ChevronDown,
  Mic,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Volume2,
  ArrowLeft,
  Crown,
  FileText,
  Gauge,
  AlertTriangle,
  Search,
} from "lucide-react";

const EXPERIENCE_BANDS = [
  "Fresher",
  "1-3 Years",
  "3-5 Years",
  "5-8 Years",
  "8+ Years",
  "Leadership Level",
] as const;

const INTERVIEW_TYPES = [
  "Technical Round",
  "Managerial Round",
  "Leadership Round",
  "HR Round",
  "Behavioral Round",
  "Scenario Based Round",
] as const;

const COMPANY_TYPES = [
  "Startup",
  "Product Company",
  "Service Company",
  "MNC",
  "Leadership/Internal Promotion",
] as const;

const INTERVIEWER_MODE_LABEL: Record<InterviewerMode, string> = {
  standard: "Professional Interview Mode",
  "ex-google": "FAANG-style Interview Mode",
  "ex-amazon": "High-Bar Interview Mode",
  "ex-meta": "Enterprise Interview Mode",
};

function mapTargetRole(role: string): Role {
  switch (role) {
    case "Software Engineer":
    case "Senior Software Engineer":
    case "Staff Software Engineer":
    case "Full Stack Developer":
      return "Full-Stack Engineer";
    case "Engineering Manager":
    case "Program Manager":
    case "Technical Program Manager":
    case "Scrum Master":
    case "Agile Delivery Manager":
    case "Agile Coach":
    case "Delivery Manager":
    case "Product Manager":
    case "Senior Product Manager":
    case "Associate Product Manager":
    case "Project Manager":
    case "Business Analyst":
      return "Product Manager";
    case "Solution Architect":
    case "Technical Architect":
    case "Cloud Architect":
    case "QA Lead":
    case "QA Engineer":
    case "SDET":
    case "Test Automation Engineer":
    case "DevOps Engineer":
    case "Site Reliability Engineer":
    case "Platform Engineer":
    case "Cloud Engineer":
    case "Cybersecurity Engineer":
    case "Security Analyst":
    case "Network Engineer":
    case "Systems Engineer":
    case "QA Lead":
    case "Java Developer":
    case "Spring Boot Developer":
    case ".Net Developer":
    case "C# Developer":
    case "Node.js Developer":
    case "Golang Developer":
    case "PHP Developer":
    case "Ruby on Rails Developer":
    case "Back End Developer":
    case "Salesforce Developer":
    case "SAP Consultant":
    case "Blockchain Developer":
      return "Backend Engineer";
    case "Python Developer":
    case "Data Analyst":
    case "BI Analyst":
    case "Analytics Engineer":
    case "Data Engineer":
    case "Big Data Engineer":
    case "Machine Learning Engineer":
    case "AI/ML Engineer":
    case "MLOps Engineer":
    case "NLP Engineer":
    case "Data Scientist":
    case "Prompt Engineer":
    case "GenAI Engineer":
      return "Data Scientist";
    case "UI/UX Designer":
    case "Product Designer":
      return "Designer";
    case "Mobile App Developer":
    case "Android Developer":
    case "iOS Developer":
    case "React Native Developer":
    case "Front End Developer":
    case "React Developer":
    case "Angular Developer":
    case "Vue.js Developer":
      return "Frontend Engineer";
    default:
      return "Full-Stack Engineer";
  }
}

function mapExperienceToLevel(experience: string): Level {
  switch (experience) {
    case "Fresher":
      return "Junior";
    case "1-3 Years":
      return "Mid";
    case "3-5 Years":
      return "Senior";
    case "5-8 Years":
    case "8+ Years":
    case "Leadership Level":
      return "Staff";
    default:
      return "Senior";
  }
}

export default function SetupPage() {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState<string>("Scrum Master");
  const [experienceBand, setExperienceBand] = useState<string>("3-5 Years");
  const [interviewType, setInterviewType] = useState<
    "Technical Round" | "Managerial Round" | "Leadership Round" | "HR Round" | "Behavioral Round" | "Scenario Based Round"
  >("Technical Round");
  const [companyType, setCompanyType] = useState<
    "Startup" | "Product Company" | "Service Company" | "MNC" | "Leadership/Internal Promotion"
  >("Product Company");
  const [role, setRole] = useState<Role>("Product Manager");
  const [level, setLevel] = useState<Level>("Senior");
  const [focusAreas, setFocusAreas] = useState<string[]>([
    "System design",
    "Communication",
  ]);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [micChecked, setMicChecked] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [interviewerStyle, setInterviewerStyle] = useState<
    "balanced" | "bar-raiser" | "friendly"
  >("bar-raiser");
  const [interviewerMode, setInterviewerMode] = useState<InterviewerMode>("ex-google");
  const [stressTest, setStressTest] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [roleQuery, setRoleQuery] = useState("");
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([...TARGET_ROLES]);
  const rolePickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const user = store.getUser();
    if (!user) router.replace("/login?next=/interview/setup");
    const draft = store.getInterviewDraft();
    setDraftSessionId(draft?.sessionId ?? null);
    void fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const roles = d?.settings?.targetRoles;
        if (Array.isArray(roles) && roles.length > 0) {
          setAvailableRoles(roles);
        }
      })
      .catch(() => {
        setAvailableRoles([...TARGET_ROLES]);
      });
  }, [router]);

  useEffect(() => {
    if (availableRoles.length === 0) return;
    if (!availableRoles.includes(targetRole)) {
      setTargetRole(availableRoles[0]);
    }
  }, [availableRoles, targetRole]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!rolePickerOpen) return;
      const picker = rolePickerRef.current;
      if (!picker) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!picker.contains(target)) {
        setRolePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [rolePickerOpen]);

  function toggleFocus(f: string) {
    setFocusAreas((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  async function checkMic() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicChecked(true);
    } catch {
      setMicError("Microphone permission was denied. You can still answer by typing.");
    }
  }

  function beginInterviewSession(parsedResume: ParsedResume) {
    const mapped = mapTargetRole(targetRole);
    const mappedLevel = mapExperienceToLevel(experienceBand);
    setRole(mapped);
    setLevel(mappedLevel);
    store.setConfig({
      role: mapped,
      level: mappedLevel,
      targetRoleLabel: targetRole,
      experienceBand,
      interviewType,
      companyType,
      focusAreas,
      difficulty,
      resume: parsedResume,
      interviewerStyle,
      interviewerMode,
      companyTarget: companyType,
      stressTest,
    });
    const id = uid("ses");
    router.push(`/interview/${id}`);
  }

  async function payAndStartInterview() {
    if (draftSessionId) {
      router.push(`/interview/${draftSessionId}`);
      return;
    }
    if (!resume || paying) return;
    const user = store.getUser();
    if (!user) {
      router.replace("/login?next=/interview/setup");
      return;
    }

    setPayError(null);
    setPaying(true);
    try {
      const scriptReady = await ensureRazorpayScriptLoaded();
      if (!scriptReady || !globalThis.window?.Razorpay) {
        setPayError("Could not load payment gateway. Please refresh and try again.");
        return;
      }

      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productType: "interview",
          amountInr: INTERVIEW_PRICE_INR,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.ok) {
        setPayError(orderData.message ?? "Unable to initiate interview payment.");
        return;
      }

      const paymentResult = await new Promise<{
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      } | null>((resolve) => {
        const rz = new globalThis.window.Razorpay({
          key: orderData.razorpayKeyId,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: "SelectWise",
          description: "Interview access payment",
          order_id: orderData.order.id,
          prefill: {
            name: user.name,
            email: user.email,
          },
          notes: { productType: "interview", paymentMode: "one_time" },
          theme: { color: "#111827" },
          handler: (response) => resolve(response),
          modal: { ondismiss: () => resolve(null) },
        });
        rz.open();
      });

      if (!paymentResult) {
        setPayError("Payment was cancelled.");
        return;
      }

      const verifyRes = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: paymentResult.razorpay_order_id,
          razorpayPaymentId: paymentResult.razorpay_payment_id,
          razorpaySignature: paymentResult.razorpay_signature,
          transactionId: orderData.transactionId,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.ok) {
        setPayError(verifyData.message ?? "Payment verification failed.");
        return;
      }

      beginInterviewSession(resume);
    } catch {
      setPayError("Something went wrong while processing payment.");
    } finally {
      setPaying(false);
    }
  }

  const sttSupported =
    globalThis.window !== undefined && LiveTranscriber.isSupported();

  function discardSavedInterview() {
    if (!confirm("Discard your saved in-progress interview? You will need a new payment to start again.")) {
      return;
    }
    store.clearInterviewDraft();
    store.clearConfig();
    setDraftSessionId(null);
  }

  const canStart = !!resume || !!draftSessionId;
  const filteredRoles = availableRoles.filter((item) =>
    item.toLowerCase().includes(roleQuery.trim().toLowerCase()),
  );
  let startButtonLabel = "Pay and Start";
  if (paying) startButtonLabel = "Processing payment...";
  else if (draftSessionId) startButtonLabel = "Resume paid interview";
  else if (resume) startButtonLabel = `Pay ₹${INTERVIEW_PRICE_INR} and Start`;

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-5xl items-center justify-between">
          <Logo size={24} />
          <Button
            href="/dashboard"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="size-4" />}
            className="px-2 sm:px-3"
          >
            <span className="hidden sm:inline">Back to dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </header>
      <main className="container max-w-5xl px-4 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="accent" dot>
            Configure interview
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Drop your resume. We'll tailor every question.
          </h1>
          <p className="mt-3 text-sm text-ink-500">
            Selectwise uses your experience, projects and achievements to brief
            Hiro, then calibrates difficulty to your role and target company.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700">
            <Crown className="size-3.5 text-amber-500" />
            All premium interview controls are enabled for everyone.
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-xl bg-ink-900 text-white">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      Step 1 · Upload resume
                    </p>
                    <p className="text-xs text-ink-500">
                      Required. We'll drive the whole interview from this.
                    </p>
                  </div>
                </div>
                {resume && (
                  <Badge tone="success" dot>
                    Parsed
                  </Badge>
                )}
              </div>
              <ResumeUpload value={resume} onChange={setResume} />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-6">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-ink-900 text-white">
                  <Gauge className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    Step 2 · Role & difficulty
                  </p>
                  <p className="text-xs text-ink-500">
                    Shapes the question bar and counter-question aggressiveness.
                  </p>
                </div>
              </div>

              <Field label="Target role">
                <div ref={rolePickerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setRolePickerOpen((v) => !v)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 outline-none ring-accent-500 transition-colors hover:border-ink-300 focus:ring-2"
                  >
                    <span className="truncate text-left">{targetRole}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-ink-500 transition-transform",
                        rolePickerOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {rolePickerOpen && (
                    <div className="absolute z-30 mt-2 w-full rounded-xl border border-ink-200 bg-white p-2 shadow-xl">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
                          <input
                            value={roleQuery}
                            onChange={(e) => setRoleQuery(e.target.value)}
                            placeholder="Search role..."
                            className="h-9 w-full rounded-lg border border-ink-200 bg-white pl-8 pr-3 text-xs text-ink-800 outline-none ring-accent-500 focus:ring-2"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setRoleQuery("")}
                          className="h-9 rounded-lg border border-ink-200 px-2.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                        >
                          Search
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-ink-100">
                        {filteredRoles.length === 0 ? (
                          <p className="px-3 py-3 text-xs text-ink-500">No matching roles found.</p>
                        ) : (
                          filteredRoles.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setTargetRole(option);
                                setRolePickerOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                                targetRole === option
                                  ? "bg-ink-900 text-white"
                                  : "text-ink-700 hover:bg-ink-50",
                              )}
                            >
                              <span>{option}</span>
                              {targetRole === option && <Check className="size-3.5" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Experience level">
                <select
                  value={experienceBand}
                  onChange={(e) => setExperienceBand(e.target.value)}
                  className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 outline-none ring-accent-500 focus:ring-2"
                >
                  {EXPERIENCE_BANDS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Difficulty"
                hint="Controls question bar; Hard also raises grading rigor."
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      {
                        id: "easy",
                        title: "Easy",
                        sub: "Warm-up mode. Fundamentals and ramp questions.",
                      },
                      {
                        id: "medium",
                        title: "Medium",
                        sub: "Realistic loop. Mix of depth and trade-off probes.",
                      },
                      {
                        id: "hard",
                        title: "Hard",
                        sub: "Bar-raiser. Terse, demanding, metric-first.",
                      },
                    ] as Array<{ id: Difficulty; title: string; sub: string }>
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-sm transition-all",
                        difficulty === d.id
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                      )}
                    >
                      <p className="text-sm font-semibold">{d.title}</p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          difficulty === d.id ? "text-white/80" : "text-ink-500",
                        )}
                      >
                        {d.sub}
                      </p>
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label="Focus areas"
                hint="Pick the dimensions you want stressed during the mock."
              >
                <div className="flex flex-wrap gap-2">
                  {FOCUS_AREAS.map((f) => (
                    <Pill
                      key={f}
                      active={focusAreas.includes(f)}
                      onClick={() => toggleFocus(f)}
                    >
                      {f}
                    </Pill>
                  ))}
                </div>
              </Field>
             
              <Field
                label="Interviewer style"
                hint="Simulate strict or supportive interviewer behavior."
              >
                <div className="flex flex-wrap gap-2">
                  <Pill
                    active={interviewerStyle === "bar-raiser"}
                    onClick={() => setInterviewerStyle("bar-raiser")}
                  >
                    Bar-raiser
                  </Pill>
                  <Pill
                    active={interviewerStyle === "balanced"}
                    onClick={() => setInterviewerStyle("balanced")}
                  >
                    Balanced
                  </Pill>
                  <Pill
                    active={interviewerStyle === "friendly"}
                    onClick={() => setInterviewerStyle("friendly")}
                  >
                    Friendly
                  </Pill>
                </div>
              </Field>
              <Field
                label="Premium interview mode"
                hint="Choose your interview style profile."
              >
                <div className="flex flex-wrap gap-2">
                  <Pill
                    active={interviewerMode === "ex-google"}
                    onClick={() => setInterviewerMode("ex-google")}
                  >
                    {INTERVIEWER_MODE_LABEL["ex-google"]}
                  </Pill>
                  <Pill
                    active={interviewerMode === "ex-amazon"}
                    onClick={() => setInterviewerMode("ex-amazon")}
                  >
                    {INTERVIEWER_MODE_LABEL["ex-amazon"]}
                  </Pill>
                  <Pill
                    active={interviewerMode === "ex-meta"}
                    onClick={() => setInterviewerMode("ex-meta")}
                  >
                    {INTERVIEWER_MODE_LABEL["ex-meta"]}
                  </Pill>
                  <Pill
                    active={interviewerMode === "standard"}
                    onClick={() => setInterviewerMode("standard")}
                  >
                    {INTERVIEWER_MODE_LABEL.standard}
                  </Pill>
                </div>
              </Field>

              <Field label="Interview type">
                <select
                  value={interviewType}
                  onChange={(e) =>
                    setInterviewType(
                      e.target.value as
                        | "Technical Round"
                        | "Managerial Round"
                        | "Leadership Round"
                        | "HR Round"
                        | "Behavioral Round"
                        | "Scenario Based Round",
                    )
                  }
                  className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 outline-none ring-accent-500 focus:ring-2"
                >
                  {INTERVIEW_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Company type">
                <select
                  value={companyType}
                  onChange={(e) =>
                    setCompanyType(
                      e.target.value as
                        | "Startup"
                        | "Product Company"
                        | "Service Company"
                        | "MNC"
                        | "Leadership/Internal Promotion",
                    )
                  }
                  className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 outline-none ring-accent-500 focus:ring-2"
                >
                  {COMPANY_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Interview intensity">
                <button
                  type="button"
                  onClick={() => setStressTest((v) => !v)}
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1.5 text-xs font-medium",
                    stressTest
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-ink-200 bg-white text-ink-700",
                  )}
                >
                  {stressTest ? "High Pressure Simulation" : "Standard Simulation"}
                </button>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Volume2 className="size-4 text-accent-600" /> Mic check
                </p>
                <p className="mt-1.5 text-xs leading-5 text-ink-500">
                  The 3D interviewer will speak questions out loud. You can
                  answer by typing or speaking back.
                </p>
                <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Button
                    variant={micChecked ? "outline" : "primary"}
                    size="sm"
                    onClick={checkMic}
                    leftIcon={
                      micChecked ? <Check className="size-4" /> : <Mic className="size-4" />
                    }
                  >
                    {micChecked ? "Microphone ready" : "Test microphone"}
                  </Button>
                  {micError && <span className="text-xs text-danger-600">{micError}</span>}
                </div>
              </div>
              <div className="rounded-xl bg-ink-50 p-4 text-xs text-ink-700">
                <p className="inline-flex items-center gap-2 font-medium text-ink-900">
                  <ShieldCheck className="size-3.5 text-success-500" />{" "}
                  Browser support
                </p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        sttSupported ? "bg-success-500" : "bg-warn-500",
                      )}
                    />
                    Live transcription:{" "}
                    {sttSupported
                      ? "available in this browser"
                      : "fallback to typed answers"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success-500" />
                    Voice recording: MediaRecorder API
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success-500" />
                    Speaking interviewer: Web Speech TTS
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success-500" />
                    Adaptive follow-ups: enabled
                  </li>
                </ul>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex items-start gap-3 text-sm text-ink-700">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-ink-900 text-white">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="font-medium text-ink-900">Ready to begin?</p>
                <p className="text-xs text-ink-500">
                  Resume-driven · {difficulty} difficulty · ~25–45 min · {targetRole} · ₹{INTERVIEW_PRICE_INR} per interview
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => void payAndStartInterview()}
              rightIcon={<ArrowRight className="size-4" />}
              disabled={!canStart || paying}
              className="w-full sm:w-auto"
            >
              {startButtonLabel}
            </Button>
          </div>
          {draftSessionId && (
            <div className="flex items-center justify-between rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-xs text-accent-800">
              <span>
                Saved paid interview found. Resume it without paying again.
              </span>
              <button
                type="button"
                onClick={discardSavedInterview}
                className="font-semibold underline"
              >
                Discard and start fresh
              </button>
            </div>
          )}
          {payError && (
            <div className="flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              <AlertTriangle className="size-4" />
              {payError}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: Readonly<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className="mb-2.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        {hint && <p className="text-xs text-ink-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  children,
  onClick,
}: Readonly<{
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-ink-900 bg-ink-900 text-white"
          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50",
      )}
    >
      {active && <Check className="size-3" />}
      {children}
    </button>
  );
}
