"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ArrowRight, BadgeCheck, CornerDownRight, Loader2, MessageCircle, RefreshCw, Send, Trash2, X } from "lucide-react";
import { createEventComment, deleteEventComment, getEventComments, type CommentDTO, type CommentViewer } from "@/lib/actions/comments";
import { cn } from "@/lib/utils";

const MAX = 1000;
const NAME_KEY = "domni:comment-name";

// Soft, readable avatar tints; picked by name so a person keeps their color.
const TINTS = ["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-700", "bg-teal-100 text-teal-700"];

function tint(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function Avatar({ name, organizer, small }: { name: string; organizer?: boolean; small?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full font-semibold",
        small ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs",
        organizer ? "bg-domni-gradient text-white" : tint(name)
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

interface Props {
  eventId: string;
  eventTitle: string;
  count: number;
  /** "card": compact row at the bottom of an event card. "section": block for the event page. */
  variant?: "card" | "section";
}

export function EventCommentsSheet({ eventId, eventTitle, count, variant = "card" }: Props) {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(count);
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [viewer, setViewer] = useState<CommentViewer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDTO | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await getEventComments(eventId);
    if (!res.ok) return setLoadError(res.error);
    setComments(res.comments);
    setViewer(res.viewer);
    setTotal(res.total);
  }, [eventId]);

  useEffect(() => {
    if (!open) return;
    if (comments === null) load();
    try {
      setName((n) => n || localStorage.getItem(NAME_KEY) || "");
    } catch {}
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, comments, load]);

  // Auto-grow the composer up to ~5 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [message]);

  function startReply(c: CommentDTO) {
    setReplyTo(c);
    setPostError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function post() {
    const text = message.trim();
    if (!text || posting) return;
    if (!viewer?.name && !name.trim()) return setPostError("Add your name first.");

    setPosting(true);
    setPostError(null);
    const res = await createEventComment({ eventId, parentId: replyTo?.id ?? null, name, message: text, website: honeypot });
    setPosting(false);
    if (!res.ok) return setPostError(res.error);

    try {
      if (!viewer?.name) localStorage.setItem(NAME_KEY, name.trim());
    } catch {}

    const created = res.comment;
    setComments((prev) => {
      const list = prev ?? [];
      if (!replyTo) return [created, ...list];
      const parentId = replyTo.id;
      return list.map((c) =>
        c.id === parentId || c.replies.some((r) => r.id === parentId) ? { ...c, replies: [...c.replies, created] } : c
      );
    });
    setTotal((t) => t + 1);
    setMessage("");
    setReplyTo(null);
  }

  async function remove(c: CommentDTO, parentId?: string) {
    if (!window.confirm(parentId ? "Delete this reply?" : "Delete this comment and its replies?")) return;
    setDeleting(c.id);
    const res = await deleteEventComment(c.id);
    setDeleting(null);
    if (!res.ok) return setPostError(res.error);

    setComments((prev) =>
      (prev ?? [])
        .filter((x) => x.id !== c.id)
        .map((x) => (x.id === parentId ? { ...x, replies: x.replies.filter((r) => r.id !== c.id) } : x))
    );
    setTotal((t) => Math.max(0, t - 1 - (parentId ? 0 : c.replies.length)));
  }

  function CommentItem({ c, parentId }: { c: CommentDTO; parentId?: string }) {
    const isReply = !!parentId;
    return (
      <div className={cn("flex gap-3", isReply && "mt-3")}>
        <Avatar name={c.name} organizer={c.isOrganizer} small={isReply} />
        <div className="min-w-0 flex-1">
          <div className={cn("rounded-2xl px-3.5 py-2.5", c.isOrganizer ? "bg-violet-50 ring-1 ring-violet-100" : "bg-slate-50")}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-ink-800">{c.name}</span>
              {c.isOrganizer && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  <BadgeCheck className="h-3 w-3" /> Organizer
                </span>
              )}
              <time dateTime={c.createdAt} title={new Date(c.createdAt).toLocaleString("en-NG")} className="text-xs text-slate-400">
                {timeAgo(c.createdAt)}
              </time>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{c.message}</p>
          </div>

          <div className="mt-1 flex items-center gap-3 pl-1">
            <button type="button" onClick={() => startReply(c)} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-violet-600">
              <CornerDownRight className="h-3.5 w-3.5" /> Reply
            </button>
            {viewer?.canModerate && (
              <button
                type="button"
                onClick={() => remove(c, parentId)}
                disabled={deleting === c.id}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 disabled:opacity-50"
              >
                {deleting === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
              </button>
            )}
          </div>

          {!isReply && c.replies.length > 0 && (
            <div className="mt-1 border-l-2 border-slate-100 pl-3">
              {c.replies.map((r) => (
                <CommentItem key={r.id} c={r} parentId={c.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const label = total === 0 ? "No comments yet" : `${total} comment${total === 1 ? "" : "s"}`;

  return (
    <>
      {variant === "card" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group/c flex w-full items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50"
        >
          <span className="flex items-center gap-2 text-slate-500">
            <MessageCircle className="h-4 w-4" />
            {label}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-violet-600">
            {total === 0 ? "Ask a question" : "Join the conversation"}
            <ArrowRight className="h-3.5 w-3.5 transition group-hover/c:translate-x-0.5" />
          </span>
        </button>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50">
              <MessageCircle className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-ink-800">Questions & comments</h2>
              <p className="text-sm text-slate-500">{total === 0 ? "Have a question? Ask the organizer." : `${label} — the organizer replies here.`}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-ink-800 px-5 text-sm font-semibold text-white hover:bg-ink-700"
          >
            {total === 0 ? "Ask a question" : "View discussion"}
          </button>
        </div>
      )}

      {/* Portal to <body>: event cards use a hover transform, and a transformed
          ancestor would turn this "fixed" overlay into one trapped inside the card. */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={`Comments on ${eventTitle}`}>
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />

          <div className="absolute inset-x-0 bottom-0 flex h-[88vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[440px] md:rounded-none">
            {/* drag handle (mobile affordance) */}
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 md:hidden" aria-hidden="true" />

            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink-800">Discussion</h2>
                <p className="truncate text-sm text-slate-500">
                  {eventTitle} · {label}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close comments">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loadError ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                  <p className="mt-3 text-sm text-slate-600">{loadError}</p>
                  <button type="button" onClick={load} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
                    <RefreshCw className="h-4 w-4" /> Try again
                  </button>
                </div>
              ) : comments === null ? (
                <div className="space-y-5" aria-busy="true" aria-label="Loading comments">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex animate-pulse gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 rounded bg-slate-100" />
                        <div className="h-12 rounded-2xl bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                    <MessageCircle className="h-6 w-6 text-violet-500" />
                  </div>
                  <p className="mt-4 font-semibold text-ink-800">No questions yet</p>
                  <p className="mt-1 max-w-xs text-sm text-slate-500">Ask about tickets, dress code, location — the organizer will reply here.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {comments.map((c) => (
                    <CommentItem key={c.id} c={c} />
                  ))}
                </div>
              )}
            </div>

            <form
              className="border-t border-slate-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                post();
              }}
            >
              {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-700">
                  <span className="truncate">
                    Replying to <strong>{replyTo.name}</strong>
                  </span>
                  <button type="button" onClick={() => setReplyTo(null)} className="rounded p-0.5 hover:bg-violet-100" aria-label="Cancel reply">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {viewer && !viewer.name && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  placeholder="Your name"
                  aria-label="Your name"
                  className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-violet-400"
                />
              )}
              {/* honeypot: hidden from people, irresistible to bots */}
              <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden="true" />

              <div className="flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={message}
                    maxLength={MAX}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        post();
                      }
                    }}
                    placeholder={replyTo ? "Write a reply…" : viewer?.isOrganizer ? "Post an update or answer…" : "Ask a question…"}
                    aria-label={replyTo ? "Write a reply" : "Write a comment"}
                    className="block w-full resize-none rounded-2xl border border-slate-200 px-4 py-2.5 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-violet-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={posting || !message.trim()}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400"
                  aria-label="Send"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-1.5 flex min-h-[16px] items-center justify-between px-1 text-[11px]">
                <span className="text-red-500">{postError}</span>
                {viewer?.name ? (
                  <span className="text-slate-400">
                    Posting as <strong className="text-slate-600">{viewer.name}</strong>
                    {viewer.isOrganizer && " (organizer)"}
                  </span>
                ) : (
                  message.length > MAX - 150 && <span className="text-slate-400">{MAX - message.length} left</span>
                )}
              </div>
            </form>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
