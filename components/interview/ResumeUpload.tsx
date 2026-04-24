"use client";

import { useRef, useState } from "react";
import { FileText, Upload, Trash2, CheckCircle2, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { parseResumeFile, parseResumeText, type ParsedResume } from "@/lib/resume";
import { cn } from "@/lib/utils";

type Props = {
  value: ParsedResume | null;
  onChange: (resume: ParsedResume | null) => void;
};

export function ResumeUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const parsed = await parseResumeFile(file);
      if (!parsed.text || parsed.text.length < 40) {
        setError(
          "We couldn't extract enough text from that file. Try pasting the content instead.",
        );
        return;
      }
      onChange(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function clear() {
    onChange(null);
    setPastedText("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (value) {
    const highlightCount =
      value.highlights.skills.length +
      value.highlights.projects.length +
      value.highlights.achievements.length;
    return (
      <div className="rounded-2xl border border-success-500/40 bg-success-50/40 p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 flex-none items-center justify-center rounded-xl bg-success-500 text-white">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">
              Resume ready · {value.fileName ?? "pasted text"}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              {value.text.length.toLocaleString()} characters parsed ·{" "}
              {highlightCount} signals detected
            </p>
            {value.highlights.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {value.highlights.skills.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="size-4" />}
            onClick={clear}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <TabButton active={mode === "upload"} onClick={() => setMode("upload")}>
          Upload file
        </TabButton>
        <TabButton active={mode === "paste"} onClick={() => setMode("paste")}>
          Paste text
        </TabButton>
      </div>

      {mode === "upload" ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-white px-4 py-8 text-center transition-colors",
            busy && "opacity-70",
          )}
        >
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-ink-900 text-white">
            <Upload className="size-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink-900">
            Drop your resume here
          </p>
          <p className="mt-1 text-xs text-ink-500">
            PDF or TXT · up to 5 MB · fully processed in your browser
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button
            className="mt-4"
            size="sm"
            leftIcon={<FilePlus2 className="size-4" />}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Extracting…" : "Choose file"}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-ink-200 bg-white p-3">
          <div className="flex items-center gap-2 border-b border-ink-100 pb-2 text-xs text-ink-500">
            <FileText className="size-3.5" /> Paste the text of your resume
          </div>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={6}
            placeholder="Experience, projects, skills, education, achievements…"
            className="mt-2 w-full resize-y rounded-xl border-0 bg-transparent px-2 py-1 text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-ink-500">
              {pastedText.trim().length} characters
            </span>
            <Button
              size="sm"
              disabled={pastedText.trim().length < 80}
              onClick={() => onChange(parseResumeText(pastedText))}
            >
              Use this text
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-danger-600">{error}</p>
      )}
      <p className="text-[11px] text-ink-500">
        Your resume never leaves the browser in MVP mode — we only send a
        trimmed summary to OpenAI when generating questions.
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-ink-900 text-white"
          : "border border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
      )}
    >
      {children}
    </button>
  );
}
