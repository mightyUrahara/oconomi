"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Mic, Send, X, Loader2, StopCircle, FileText, Bot, ChevronDown, Play, Pause } from "lucide-react";
import { ReceiptForm } from "@/components/ReceiptForm";

// ── Types ────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string | null;
  audio?: string | null;
  pdf?: { name: string; data: string } | null;
  messageType?: "form" | "batch_form" | "text";
  formData?: any;
  isDuplicate?: boolean;
  duplicateMatchDetails?: string | null;
  transactions?: any[];
  transactionCount?: number;
};

const MAX_CHAT_LENGTH = 500;
const MAX_RECORDING_SECONDS = 120;
const COOLDOWN_TIME = 2000;

const DEMO_KEY = process.env.NEXT_PUBLIC_DEMO_INTERNAL_KEY || "";
const demoHeaders = (): Record<string, string> => (DEMO_KEY ? { "x-demo-key": DEMO_KEY } : {});

// ── Security helpers (kept identical to production) ────────────────────
function sanitizeAiHtml(html: string): string {
  return html
    .replace(/<(?!\/?(?:b|br|i|u|strong|em)\b)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:[^;]+;base64,[^\s"']*/gi, "");
}

function sanitizeForAI(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/\0/g, "")
    .replace(/ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|context)/gi, "[removed]")
    .replace(/you\s+are\s+now\s+(a\s+)?(different|new|another)/gi, "[removed]")
    .replace(/forget\s+(everything|all|previous|prior)/gi, "[removed]")
    .replace(/system\s*:\s*/gi, "[removed]")
    .replace(/\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi, "[removed]")
    .replace(/###\s*(instruction|system|prompt)/gi, "[removed]")
    .replace(/act\s+as\s+(if\s+you\s+are\s+)?/gi, "[removed]")
    .replace(/[<>{}[\]\\]{3,}/g, "")
    .replace(/(.)\1{50,}/g, "$1$1$1");
}

function isLikelyBase64(input: string): boolean {
  const stripped = input.replace(/\s/g, "");
  return stripped.length > 200 && /^[A-Za-z0-9+/]{100,}={0,2}$/.test(stripped);
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_SIZE = 1500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    };
  });
};

const isAudioData = (str?: string | null) => !!str && (str.startsWith("data:audio") || str.includes("audio/webm") || str.includes("audio/mp4"));
const MEDIA_PLACEHOLDERS = ["📸 Image Upload", "🎤 Voice Note", "📄 PDF Document", "Message"];
const isMediaPlaceholder = (content: string) => MEDIA_PLACEHOLDERS.includes(content?.trim());

function buildConfirmationHtml(result: string, meta: any, total?: number): string {
  if (result === "saved" && meta?.savedItem) {
    const item = meta.savedItem;
    const isIncome = (item.flow_type || "expense") === "income";
    const amt = parseFloat(String(item.total_with_tax)).toFixed(2);
    const cur = item.currency || "USD";
    const name = item.company_name || "Unknown";
    const cat = item.category || "General";
    return isIncome
      ? `💰 <b>Income Recorded!</b><br><br>Source: <b>${name}</b><br>Amount: <b>${cur} ${amt}</b><br>Category: ${cat}`
      : `✅ <b>Receipt Logged!</b><br><br>Merchant: <b>${name}</b><br>Amount: <b>${cur} ${amt}</b><br>Category: ${cat}`;
  }
  if (result === "batch" && meta) {
    const t = total || 0;
    if (meta.saved === 0) return `🗑️ <b>Batch Discarded</b><br><br>All ${t} receipts were removed.`;
    return `✅ <b>Batch Complete!</b> (${meta.saved} of ${t} saved)`;
  }
  return `🗑️ <b>Discarded</b> — nothing was saved.`;
}

// ── Custom audio player ─────────────────────────────────────────────────
function AudioBubble({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-neutral-900 px-3 py-2 w-56">
      <audio
        ref={ref}
        src={src}
        onTimeUpdate={() => ref.current && setProgress((ref.current.currentTime / (ref.current.duration || 1)) * 100)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={() => (playing ? ref.current?.pause() : ref.current?.play())}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-black"
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={(e) => {
          if (ref.current) ref.current.currentTime = (Number(e.target.value) / 100) * (ref.current.duration || 0);
          setProgress(Number(e.target.value));
        }}
        className="h-1 flex-1 accent-emerald-500"
      />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────
export default function ChatDemo({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<{ name: string; data: string } | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isAnyFileSelected = !!selectedImage || !!selectedPDF || !!selectedAudio;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  const addMessage = (m: Message) => setMessages((prev) => [...prev, m]);
  const dismissMessage = (id: string) => setDismissedIds((prev) => new Set([...prev, id]));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); e.target.value = ""; return; }
    if (file.type.includes("image")) {
      setSelectedImage(await compressImage(file));
    } else if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedPDF({ name: file.name, data: ev.target?.result as string });
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const startRecording = async () => {
    if (isAnyFileSelected || input.trim()) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setSelectedAudio(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) { stopRecording(); return prev; }
          return prev + 1;
        });
      }, 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const sendMessage = async (e: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    if (isLoading || isRateLimited) return;
    const textToSend = overrideInput !== undefined ? overrideInput : input;
    if (!textToSend.trim() && !isAnyFileSelected) return;

    if (textToSend.trim()) {
      if (textToSend.length > MAX_CHAT_LENGTH) {
        addMessage({ id: Date.now().toString(), role: "assistant", content: `⚠️ Message too long (max ${MAX_CHAT_LENGTH} chars)` });
        return;
      }
      if (isLikelyBase64(textToSend)) {
        addMessage({ id: Date.now().toString(), role: "assistant", content: "⚠️ Invalid message format" });
        return;
      }
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: textToSend, image: selectedImage, audio: selectedAudio, pdf: selectedPDF };
    addMessage(userMsg);

    const payload = {
      message: textToSend.trim() ? sanitizeForAI(textToSend) : "",
      image: selectedImage,
      audio: selectedAudio,
      pdf: selectedPDF?.data,
    };

    setInput("");
    setSelectedImage(null);
    setSelectedPDF(null);
    setSelectedAudio(null);
    setIsLoading(true);
    setIsRateLimited(true);

    try {
      const res = await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...demoHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 429) {
        addMessage({ id: Date.now().toString(), role: "assistant", content: `⚠️ ${data.message}` });
        return;
      }

      const msgType = data.message_type || "text";
      if (msgType === "form" || msgType === "duplicate_form") {
        addMessage({ id: Date.now().toString() + "-b", role: "assistant", content: "", messageType: "form", formData: data.form_data, isDuplicate: data.is_duplicate, duplicateMatchDetails: data.duplicate_match_details });
      } else if (msgType === "batch_form") {
        addMessage({ id: Date.now().toString() + "-b", role: "assistant", content: "", messageType: "batch_form", transactions: data.transactions, transactionCount: data.transaction_count });
      } else if (msgType === "alert") {
        addMessage({ id: Date.now().toString() + "-b", role: "assistant", content: data.content || "⚠️ Something went wrong." });
      } else {
        addMessage({ id: Date.now().toString() + "-b", role: "assistant", content: data.content || data.message || "⚠️ Server is busy, try again." });
      }

      if (res.ok) fetch("/api/chat/cleanup", { method: "POST", headers: demoHeaders(), credentials: "same-origin" }).catch(() => {});
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
      addMessage({ id: Date.now().toString(), role: "assistant", content: isNetworkError ? "⚠️ Connection interrupted. Please check your internet." : "⚠️ Server busy. Try again." });
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsRateLimited(false), COOLDOWN_TIME);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || isAnyFileSelected) sendMessage(e as any);
    }
  };

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-neutral-800 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 font-bold text-black">L</div>
        <div>
          <h1 className="text-sm font-semibold">LYDRA Assistant</h1>
          <p className="text-xs text-neutral-500">Demo · finance chat</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center text-neutral-500">
            <Bot size={28} className="mb-3 text-emerald-500" />
            <p className="text-sm">Send a message to get started</p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "user" && (msg.image || msg.audio || msg.pdf)) {
            return (
              <div key={msg.id || i} className="flex justify-end">
                <div className="flex max-w-[60%] flex-col items-end gap-2">
                  {msg.image && !isAudioData(msg.image) && <img src={msg.image} alt="upload" className="max-h-72 rounded-xl border-2 border-emerald-500 object-cover" />}
                  {msg.audio && <AudioBubble src={msg.audio} />}
                  {msg.pdf && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-neutral-900 px-4 py-2">
                      <FileText size={18} className="text-emerald-500" /><span className="text-sm">{msg.pdf.name}</span>
                    </div>
                  )}
                  {msg.content && !isMediaPlaceholder(msg.content) && (
                    <div className="rounded-2xl rounded-tr-sm bg-emerald-500 px-4 py-2 text-sm text-black">{msg.content}</div>
                  )}
                </div>
              </div>
            );
          }

          if (msg.role === "assistant" && msg.messageType === "form") {
            if (dismissedIds.has(msg.id)) return null;
            return (
              <div key={msg.id || i} className="flex justify-start">
                <div className="w-full max-w-[92%]">
                  <ReceiptForm
                    formData={msg.formData}
                    isDuplicate={msg.isDuplicate}
                    duplicateMatchDetails={msg.duplicateMatchDetails}
                    userId={userId}
                    onDone={(result: string, meta: any) => {
                      dismissMessage(msg.id);
                      const text = buildConfirmationHtml(result, meta);
                      addMessage({ id: Date.now().toString(), role: "assistant", content: text });
                      fetch("/api/chat/save-message", { method: "POST", headers: { "Content-Type": "application/json", ...demoHeaders() }, body: JSON.stringify({ content: text, role: "assistant" }) }).catch(() => {});
                    }}
                  />
                </div>
              </div>
            );
          }

          if (msg.role === "assistant" && msg.messageType === "batch_form") {
            if (dismissedIds.has(msg.id)) return null;
            return (
              <div key={msg.id || i} className="flex justify-start">
                <div className="w-full max-w-[92%]">
                  <ReceiptForm
                    transactions={msg.transactions}
                    transactionCount={msg.transactionCount}
                    userId={userId}
                    onDone={(result: string, meta: any) => {
                      dismissMessage(msg.id);
                      const text = buildConfirmationHtml(result, meta, msg.transactionCount);
                      addMessage({ id: Date.now().toString(), role: "assistant", content: text });
                      fetch("/api/chat/save-message", { method: "POST", headers: { "Content-Type": "application/json", ...demoHeaders() }, body: JSON.stringify({ content: text, role: "assistant" }) }).catch(() => {});
                    }}
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id || i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[60%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm bg-emerald-500 text-black" : "rounded-tl-sm border border-neutral-800 bg-neutral-900 text-neutral-100"}`}>
                {msg.role === "user" ? <span>{msg.content}</span> : <div dangerouslySetInnerHTML={{ __html: sanitizeAiHtml(msg.content) }} />}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs text-neutral-400">
            <Loader2 size={14} className="animate-spin" /> Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-neutral-800 bg-neutral-950 px-6 py-4">
        {input.length > MAX_CHAT_LENGTH * 0.7 && (
          <div className={`mb-1 text-right text-xs ${input.length > MAX_CHAT_LENGTH * 0.9 ? "text-red-500" : "text-amber-500"}`}>{input.length}/{MAX_CHAT_LENGTH}</div>
        )}

        {(selectedImage || selectedPDF || selectedAudio) && (
          <div className="mb-2 flex gap-2">
            {selectedImage && (
              <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs">
                <img src={selectedImage} className="h-6 w-6 rounded object-cover" alt="preview" /><span>Image</span>
                <X size={14} className="cursor-pointer" onClick={() => setSelectedImage(null)} />
              </div>
            )}
            {selectedPDF && (
              <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs">
                <FileText size={14} /><span>PDF</span><X size={14} className="cursor-pointer" onClick={() => setSelectedPDF(null)} />
              </div>
            )}
            {selectedAudio && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-neutral-900 px-3 py-1.5 text-xs">
                <span>Voice Note</span><X size={14} className="cursor-pointer" onClick={() => setSelectedAudio(null)} />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 rounded-2xl border border-neutral-800 bg-neutral-900 px-2 py-1">
          <input type="file" ref={fileInputRef} hidden accept="image/*,application/pdf" onChange={handleFileSelect} />

          {isRecording ? (
            <div className="flex flex-1 items-center justify-between px-3">
              <span className="text-xs font-bold text-red-500">Recording {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}</span>
              <button type="button" onClick={stopRecording} className="flex items-center gap-1 text-red-500">
                <StopCircle size={18} /> STOP
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-200 disabled:opacity-30" disabled={input.length > 0 || isLoading || isRateLimited} onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={18} />
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-200 disabled:opacity-30" disabled={input.length > 0 || isLoading || isRateLimited} onClick={startRecording}>
                <Mic size={18} />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                readOnly={isAnyFileSelected}
                disabled={isLoading || isRateLimited}
                maxLength={MAX_CHAT_LENGTH}
                rows={1}
                placeholder={isLoading ? "AI is thinking..." : isAnyFileSelected ? "Press Enter to send file" : "Ask LYDRA..."}
                className="max-h-28 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-neutral-600"
              />
              <button
                type="button"
                onClick={(e) => sendMessage(e)}
                disabled={(!input.trim() && !isAnyFileSelected) || isLoading || isRateLimited}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black disabled:bg-neutral-800 disabled:text-neutral-600"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}