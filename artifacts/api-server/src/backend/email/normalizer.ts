export type EmailProvider = "imap" | "gmail";

export type DateParseConfidence = "high" | "fallback";

export interface EmailMessage {
  provider: EmailProvider;
  provider_message_id: string;
  thread_id: string | null;
  subject: string;
  from: string;
  to: string[];
  snippet: string;
  internal_ts_utc: string | null;
  sent_ts_utc: string | null;
  received_ts_utc: string | null;
  date_parse_confidence: DateParseConfidence;
  raw_date_header: string | null;
  mailbox: string | null;
  labels_or_folders: string[];
  has_attachments: boolean;
  size_bytes: number | null;
  malformed_date: boolean;
}

export interface ImapEnvelopeAddress {
  name?: string;
  mailbox?: string;
  host?: string;
}

export interface ImapEnvelopeLike {
  subject?: string;
  from?: ImapEnvelopeAddress[];
  to?: ImapEnvelopeAddress[];
  date?: Date;
  messageId?: string;
}

export interface ImapMessageLike {
  uid?: string | number;
  internalDate?: Date;
  envelope?: ImapEnvelopeLike;
  headers?: Record<string, string | string[] | undefined>;
  mailbox?: string;
  folders?: string[];
  flags?: Set<string> | string[];
  size?: number;
  threadId?: string;
}

export interface GmailHeaderLike {
  name: string;
  value: string;
}

export interface GmailPayloadLike {
  headers?: GmailHeaderLike[];
  mimeType?: string;
  body?: { size?: number };
  parts?: GmailPayloadLike[];
  filename?: string;
}

export interface GmailMessageLike {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  sizeEstimate?: number;
  payload?: GmailPayloadLike;
}

function asUtcIso(date: Date | null | undefined): string | null {
  if (!date) return null;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseDateWithConfidence(rawDate: string | null | undefined): {
  sentUtc: string | null;
  confidence: DateParseConfidence;
  malformed: boolean;
} {
  if (!rawDate || !rawDate.trim()) {
    return { sentUtc: null, confidence: "fallback", malformed: false };
  }

  const parsedMs = Date.parse(rawDate);
  if (Number.isNaN(parsedMs)) {
    return { sentUtc: null, confidence: "fallback", malformed: true };
  }

  return {
    sentUtc: new Date(parsedMs).toISOString(),
    confidence: "high",
    malformed: false,
  };
}

function formatImapAddress(address: ImapEnvelopeAddress | undefined): string {
  if (!address) return "";
  const email = [address.mailbox, address.host].filter(Boolean).join("@");
  if (address.name && email) return `${address.name} <${email}>`;
  return email || address.name || "";
}

function gmailHeader(headers: GmailHeaderLike[] | undefined, name: string): string | null {
  if (!headers?.length) return null;
  const match = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return match?.value ?? null;
}

function payloadHasAttachments(payload?: GmailPayloadLike): boolean {
  if (!payload) return false;
  if ((payload.filename ?? "").trim().length > 0) return true;
  return (payload.parts ?? []).some((p) => payloadHasAttachments(p));
}

export function normalizeImapMessage(message: ImapMessageLike): EmailMessage {
  const rawDateHeader = Array.isArray(message.headers?.date)
    ? message.headers?.date[0] ?? null
    : (message.headers?.date as string | undefined) ?? null;

  const sentFromHeader = parseDateWithConfidence(rawDateHeader);
  const internalUtc = asUtcIso(message.internalDate ?? message.envelope?.date ?? null);
  const sentUtc = sentFromHeader.sentUtc ?? internalUtc;

  return {
    provider: "imap",
    provider_message_id: String(message.uid ?? message.envelope?.messageId ?? ""),
    thread_id: message.threadId ?? null,
    subject: message.envelope?.subject ?? "",
    from: formatImapAddress(message.envelope?.from?.[0]),
    to: (message.envelope?.to ?? []).map(formatImapAddress).filter(Boolean),
    snippet: "",
    internal_ts_utc: internalUtc,
    sent_ts_utc: sentUtc,
    received_ts_utc: internalUtc,
    date_parse_confidence: sentFromHeader.sentUtc ? sentFromHeader.confidence : "fallback",
    raw_date_header: rawDateHeader,
    mailbox: message.mailbox ?? null,
    labels_or_folders: message.folders ?? (message.mailbox ? [message.mailbox] : []),
    has_attachments: false,
    size_bytes: typeof message.size === "number" ? message.size : null,
    malformed_date: sentFromHeader.malformed,
  };
}

export function normalizeGmailMessage(message: GmailMessageLike): EmailMessage {
  const headers = message.payload?.headers ?? [];
  const rawDateHeader = gmailHeader(headers, "Date");
  const from = gmailHeader(headers, "From") ?? "";
  const toRaw = gmailHeader(headers, "To") ?? "";
  const to = toRaw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const parsedHeaderDate = parseDateWithConfidence(rawDateHeader);
  const internalMs = Number(message.internalDate);
  const internalUtc = Number.isFinite(internalMs) ? new Date(internalMs).toISOString() : null;

  return {
    provider: "gmail",
    provider_message_id: String(message.id ?? ""),
    thread_id: message.threadId ?? null,
    subject: gmailHeader(headers, "Subject") ?? "",
    from,
    to,
    snippet: message.snippet ?? "",
    internal_ts_utc: internalUtc,
    sent_ts_utc: parsedHeaderDate.sentUtc ?? internalUtc,
    received_ts_utc: internalUtc,
    date_parse_confidence: parsedHeaderDate.sentUtc ? parsedHeaderDate.confidence : "fallback",
    raw_date_header: rawDateHeader,
    mailbox: null,
    labels_or_folders: message.labelIds ?? [],
    has_attachments: payloadHasAttachments(message.payload),
    size_bytes: typeof message.sizeEstimate === "number" ? message.sizeEstimate : null,
    malformed_date: parsedHeaderDate.malformed,
  };
}
