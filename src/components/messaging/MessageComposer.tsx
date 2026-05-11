"use client";

import { AtSign, Paperclip, SendHorizontal } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { sendMessageAction } from "@/app/messages/actions";
import { MentionPicker } from "@/components/messaging/MentionPicker";
import {
  getMentionHandle,
  type MessagingProfile,
} from "@/lib/messaging";
import type { Locale } from "@/lib/i18n";

type MessageComposerProps = {
  conversationId: string;
  disabled?: boolean;
  locale: Locale;
  profiles: MessagingProfile[];
  returnTo: string;
};

function getMentionQuery(value: string, cursor: number) {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(^|\s)@([a-z0-9._-]*)$/i);

  return match ? match[2] : null;
}

export function MessageComposer({
  conversationId,
  disabled = false,
  locale,
  profiles,
  returnTo,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [cursor, setCursor] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionQuery = useMemo(() => getMentionQuery(content, cursor), [content, cursor]);

  function syncCursor() {
    const position = textareaRef.current?.selectionStart || 0;
    setCursor(position);
  }

  function selectMention(profile: MessagingProfile) {
    const handle = getMentionHandle(profile);
    const beforeCursor = content.slice(0, cursor);
    const afterCursor = content.slice(cursor);
    const nextBefore = beforeCursor.replace(/(^|\s)@([a-z0-9._-]*)$/i, `$1@${handle} `);
    const nextValue = `${nextBefore}${afterCursor}`;
    const nextCursor = nextBefore.length;

    setContent(nextValue);
    setMentionedUserIds((current) =>
      current.includes(profile.id) ? current : [...current, profile.id],
    );

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      setCursor(nextCursor);
    });
  }

  return (
    <form
      action={sendMessageAction}
      className="relative border-t border-slate-200 bg-white p-3"
      ref={formRef}
    >
      <input name="conversation_id" type="hidden" value={conversationId} />
      <input name="return_to" type="hidden" value={returnTo} />
      {mentionedUserIds.map((userId) => (
        <input key={userId} name="mentioned_user_ids" type="hidden" value={userId} />
      ))}

      {mentionQuery !== null ? (
        <MentionPicker
          locale={locale}
          onSelect={selectMention}
          profiles={profiles}
          query={mentionQuery}
          selectedIds={mentionedUserIds}
        />
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
        <textarea
          className="max-h-40 min-h-20 w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400"
          disabled={disabled}
          maxLength={5000}
          name="content"
          onBlur={syncCursor}
          onChange={(event) => {
            setContent(event.target.value);
            setCursor(event.target.selectionStart);
          }}
          onClick={syncCursor}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          onKeyUp={syncCursor}
          placeholder={
            disabled
              ? locale === "sq"
                ? "Biseda eshte vetem per lexim."
                : "This conversation is read-only."
              : locale === "sq"
                ? "Shkruaj mesazh, perdor @ per permendje..."
                : "Write a message, use @ to mention..."
          }
          ref={textareaRef}
          value={content}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              <Paperclip className="h-4 w-4" />
              {locale === "sq" ? "Skedare" : "Files"}
              <input
                className="sr-only"
                disabled={disabled}
                multiple
                name="attachments"
                type="file"
              />
            </label>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <AtSign className="h-3.5 w-3.5" />
              {locale === "sq" ? "Permendje" : "Mentions"}
            </span>
          </div>

          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
          >
            <SendHorizontal className="h-4 w-4" />
            {locale === "sq" ? "Dergo" : "Send"}
          </button>
        </div>
      </div>
    </form>
  );
}

