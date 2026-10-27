"use client";

import { useState } from "react";
import { createEventComment } from "@/lib/actions/comments";
import {
  X,
  Send,
  MessageCircle,
  CornerDownRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";


interface Comment {
  id: string;
  name: string;
  message: string;
  createdAt: Date;
  parentId?: string | null;

  replies?: Comment[];
}

interface Props {
  eventId: string;
  comments: Comment[];
  count: number;
}

export function EventCommentsSheet({
  eventId,
  comments,
  count,
}: Props) {
  const [open, setOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
const [user, setUser] = useState<any>(null);
 const [loadingUser, setLoadingUser] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(
    null
  );

  async function handleSubmit() {
    if (!message.trim()) return;

    const formData = new FormData();

    formData.set("eventId", eventId);
    formData.set("name", name);
    formData.set("message", message);

    if (replyingTo) {
      formData.set("parentId", replyingTo);
    }

    await createEventComment(formData);

    setMessage("");
    setReplyingTo(null);
  }

  useEffect(() => { async function loadUser() {
     const supabase = createClient(); 
     const { data: { user }, } = await supabase.auth.getUser(); setUser(user); if (user) { setName( user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User" ); } setLoadingUser(false); } loadUser(); }, []);

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex w-full items-center gap-2 px-5 text-sm text-slate-500"
      >
        <MessageCircle className="h-4 w-4" />

        <div className="flex w-full items-center justify-between">
          <span>{count}</span>

          <span>Comments</span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="
              absolute bottom-0 left-0 right-0
              h-[85vh]
              rounded-t-3xl
              bg-white
              p-5

              md:right-0 md:left-auto md:top-0
              md:h-screen md:w-[420px]
              md:rounded-none
            "
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Comments ({count})
              </h2>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 h-[60vh] space-y-4 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                      {comment.name?.[0] || "A"}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {comment.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {new Date(
                          comment.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    {comment.message}
                  </p>

                  <button
                    onClick={() =>
                      setReplyingTo(comment.id)
                    }
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-600"
                  >
                    <CornerDownRight className="h-3.5 w-3.5" />
                    Reply
                  </button>

{comment.replies &&
  comment.replies.length > 0 && (
    <div className="mt-4 space-y-3 border-l border-slate-200 pl-4">
      {comment.replies.map((reply) => (
        <div
          key={reply.id}
          className="rounded-xl bg-white p-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
              {reply.name?.[0] || "A"}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                {reply.name}
              </p>

              <p className="text-[11px] text-slate-400">
                {new Date(
                  reply.createdAt
                ).toLocaleString()}
              </p>
            </div>
          </div>

          <p className="mt-2 text-sm text-slate-700">
            {reply.message}
          </p>
        </div>
      ))}
    </div>
)}

                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              {replyingTo && (
                <div className="mb-3 flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700">
                  <span>Replying to comment</span>

                  <button
                    onClick={() =>
                      setReplyingTo(null)
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
{user ? ( <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700"> {name} </div> ) : ( <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value) } className="h-12 w-24 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400" /> )}

                <input
                  placeholder={
                    replyingTo
                      ? "Write a reply..."
                      : "Ask a question..."
                  }
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  className="h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400"
                />

                <button
                  onClick={handleSubmit}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
