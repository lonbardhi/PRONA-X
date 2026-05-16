"use client";

import { FileText, Trash2 } from "lucide-react";

import { deleteMessageAction } from "@/app/messages/actions";
import { PronaAvatar } from "@/components/PronaAvatar";
import {
  formatMessageFileSize,
  formatMessagingDateTime,
  getProfileDisplayName,
  type MessageAttachment,
  type MessageRecord,
} from "@/lib/messaging";
import type { Locale } from "@/lib/i18n";

type MessageBubbleProps = {
  currentUserId: string;
  locale: Locale;
  message: MessageRecord;
  returnTo: string;
};

function isImageAttachment(attachment: MessageAttachment) {
  return attachment.mime_type?.startsWith("image/");
}

function AttachmentPreview({
  attachment,
  locale,
}: {
  attachment: MessageAttachment;
  locale: Locale;
}) {
  const href = attachment.signed_url || "#";

  return (
    <a
      className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-white p-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {isImageAttachment(attachment) && attachment.signed_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={attachment.file_name}
          className="max-h-48 w-full rounded-md object-cover"
          src={attachment.signed_url}
        />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <FileText className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block break-words font-semibold text-slate-950">
          {attachment.file_name}
        </span>
        <span className="block text-xs text-slate-500">
          {formatMessageFileSize(attachment.file_size)}
          {!attachment.signed_url
            ? ` / ${locale === "sq" ? "lidhja nuk u krijua" : "link unavailable"}`
            : ""}
        </span>
      </span>
    </a>
  );
}

export function MessageBubble({
  currentUserId,
  locale,
  message,
  returnTo,
}: MessageBubbleProps) {
  const ownMessage = message.sender_id === currentUserId;
  const senderName = getProfileDisplayName(message.sender);

  return (
    <article className={`flex min-w-0 gap-2 ${ownMessage ? "justify-end" : ""}`}>
      {!ownMessage ? (
        <PronaAvatar
          alt={senderName}
          className="mt-1"
          email={message.sender?.email}
          name={message.sender?.full_name || senderName}
          shape="rounded"
          showBorder={false}
          size="sm"
          src={message.sender?.avatar_url}
        />
      ) : null}
      <div
        className={`min-w-0 max-w-[min(680px,calc(100%-2.5rem))] ${
          ownMessage ? "items-end" : ""
        }`}
      >
        <div
          className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 ${
            ownMessage ? "justify-end" : ""
          }`}
        >
          <p className="min-w-0 truncate text-xs font-semibold text-slate-600">{senderName}</p>
          <p className="shrink-0 text-[11px] text-slate-400">
            {formatMessagingDateTime(message.created_at, locale)}
          </p>
          {message.edited_at && !message.deleted_at ? (
            <span className="text-[11px] text-slate-400">
              {locale === "sq" ? "ndryshuar" : "edited"}
            </span>
          ) : null}
        </div>

        <div
          className={`mt-1 rounded-xl px-3 py-2 shadow-sm ${
            ownMessage
              ? "bg-emerald-600 text-white"
              : "border border-slate-200 bg-white text-slate-950"
          }`}
        >
          {message.deleted_at ? (
            <p className={`text-sm italic ${ownMessage ? "text-white/75" : "text-slate-400"}`}>
              {locale === "sq" ? "Mesazhi u fshi" : "Message deleted"}
            </p>
          ) : message.content ? (
            <p className="whitespace-pre-line break-words text-sm leading-6">
              {message.content}
            </p>
          ) : null}
        </div>

        {!message.deleted_at && message.attachments?.length ? (
          <div className="grid gap-1">
            {message.attachments.map((attachment) => (
              <AttachmentPreview
                attachment={attachment}
                key={attachment.id}
                locale={locale}
              />
            ))}
          </div>
        ) : null}

        {ownMessage && !message.deleted_at ? (
          <form action={deleteMessageAction} className="mt-1 flex justify-end">
            <input name="message_id" type="hidden" value={message.id} />
            <input name="return_to" type="hidden" value={returnTo} />
            <button
              aria-label={locale === "sq" ? "Fshi mesazhin" : "Delete message"}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {locale === "sq" ? "Fshi" : "Delete"}
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

