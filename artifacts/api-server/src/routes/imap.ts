import { Router, type Request, type Response } from "express";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";

const router = Router();

async function withImap(cfg: { host: string; port: number; user: string; pass: string; tls: boolean }, fn: (c: ImapFlow) => Promise<any>) {
    const client = new ImapFlow({
        host: cfg.host,
        port: cfg.port || (cfg.tls ? 993 : 143),
        secure: cfg.tls !== false,
        auth: { user: cfg.user, pass: cfg.pass },
        logger: false,
        connectionTimeout: 15000,
    });
    await client.connect();
    try {
        return await fn(client);
    } finally {
        try { await client.logout(); } catch (_) {}
    }
}


function cleanHost(host: unknown): string {
    return String(host || "").trim().toLowerCase();
}

function resolveSmtpHost(imapHost: string, requestedSmtpHost?: string): string {
    const explicit = cleanHost(requestedSmtpHost);
    if (explicit) return explicit;

    const host = cleanHost(imapHost);
    const knownHosts: Record<string, string> = {
        "imap.mail.me.com": "smtp.mail.me.com",
        "imap.icloud.com": "smtp.mail.me.com",
        "outlook.office365.com": "smtp.office365.com",
        "imap-mail.outlook.com": "smtp-mail.outlook.com",
        "imap.outlook.com": "smtp-mail.outlook.com",
        "imap.gmx.com": "mail.gmx.com",
        "imap.gmx.net": "mail.gmx.net",
        "imap.ionos.com": "smtp.ionos.com",
        "imap.mail.com": "smtp.mail.com",
        "imap.yandex.com": "smtp.yandex.com",
    };
    if (knownHosts[host]) return knownHosts[host];

    if (host.startsWith("imap.")) return `smtp.${host.slice(5)}`;
    if (host.startsWith("imap-")) return `smtp-${host.slice(5)}`;
    if (host.startsWith("imapmail.")) return `smtpmail.${host.slice(9)}`;
    return host;
}

function parseOptionalPort(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    const lowered = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(lowered)) return true;
    if (["false", "0", "no", "off"].includes(lowered)) return false;
    return undefined;
}

function buildSmtpAttempts(smtpPort?: number, smtpSecure?: boolean): Array<{ port: number; secure: boolean }> {
    if (smtpPort) return [{ port: smtpPort, secure: smtpSecure ?? smtpPort === 465 }];
    if (smtpSecure !== undefined) return [{ port: smtpSecure ? 465 : 587, secure: smtpSecure }];
    return [
        { port: 587, secure: false },
        { port: 465, secure: true },
    ];
}

function smtpErrorMessage(err: any, smtpHost: string, attempts: Array<{ port: number; secure: boolean }>): string {
    const attemptedPorts = attempts.map((a) => `${a.port}${a.secure ? "/SSL" : "/STARTTLS"}`).join(", ");
    const original = err?.message || "SMTP send failed";
    const code = err?.code ? ` (${err.code})` : "";
    return `${original}${code}. Tried SMTP host ${smtpHost} on ${attemptedPorts}. If this is not your provider's SMTP server, edit the account and set SMTP Host/Port.`;
}

function addr(a: any) {
    if (!a) return "";
    const name = a.name || "";
    const address = a.address || "";
    return name ? `${name} <${address}>` : address;
}

function flattenAddresses(list: any): string[] {
    if (!Array.isArray(list)) return [];
    return list
        .map((entry: any) => (entry?.address || "").toString().trim().toLowerCase())
        .filter(Boolean);
}

function normalizeSubject(subject: string): string {
    return (subject || "")
        .replace(/^(re|fwd|fw|aw|sv|vs|ref|回复|转发)[\s:：]+/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function normalizeMessageId(value: unknown): string {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    const match = raw.match(/<[^>]+>/);
    return (match?.[0] || raw).trim();
}

function extractMessageIdsFromHeader(value: unknown): string[] {
    const raw = String(value || "");
    if (!raw) return [];
    const matches = raw.match(/<[^>]+>/g) || [];
    if (!matches.length) {
        const normalized = normalizeMessageId(raw);
        return normalized ? [normalized] : [];
    }
    return [...new Set(matches.map((v) => normalizeMessageId(v)).filter(Boolean))];
}

function readHeaderValue(headers: unknown, key: string): string {
    if (!headers) return "";
    if (headers instanceof Map) {
        const value = headers.get(key);
        return value === undefined || value === null ? "" : String(value);
    }
    if (Buffer.isBuffer(headers)) {
        const raw = headers.toString("utf8");
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const headerRe = new RegExp(`^${escaped}:\\s*([\\s\\S]*?)(?:\\r?\\n[^\\s]|$)`, "im");
        const match = raw.match(headerRe);
        if (!match?.[1]) return "";
        return match[1].replace(/\r?\n[\t ]+/g, " ").trim();
    }
    return "";
}

function resolveThreadIdentity(
    mailboxOwner: string,
    envelope: any,
    headers?: unknown,
): { threadId: string; threadRootId: string } {
    const owner = mailboxOwner.toLowerCase();
    const normalizedSubject = normalizeSubject(envelope?.subject || "(no subject)");
    const messageId = normalizeMessageId(envelope?.messageId || readHeaderValue(headers, "message-id"));
    const references = extractMessageIdsFromHeader(readHeaderValue(headers, "references"));
    const inReplyTo = extractMessageIdsFromHeader(envelope?.inReplyTo || readHeaderValue(headers, "in-reply-to"));
    const parentChain = [...references, ...inReplyTo].filter(Boolean);
    const threadRootId = parentChain[0] || "";
    if (threadRootId) {
        return {
            threadId: `${owner}\x00msgid\x00${threadRootId}`,
            threadRootId,
        };
    }

    if (normalizedSubject) {
        return {
            threadId: `${owner}\x00subject\x00${normalizedSubject}`,
            threadRootId: messageId || "",
        };
    }

    const from = flattenAddresses(envelope?.from);
    const to = flattenAddresses(envelope?.to);
    const cc = flattenAddresses(envelope?.cc);
    const participants = [...new Set([...from, ...to, ...cc].filter((a) => a !== owner))].sort();
    const participantBlock = participants.join("|") || "unknown";
    return {
        threadId: `${owner}\x00participants\x00${participantBlock}`,
        threadRootId: messageId || "",
    };
}

function resolveMailbox(mailbox: string, mbNames: string[]): { resolved: string; flaggedSearch: boolean } {
    const mb = mailbox.trim();
    if (mb.toUpperCase() === "INBOX") return { resolved: "INBOX", flaggedSearch: false };
    if (mb.toUpperCase() === "STARRED") return { resolved: "INBOX", flaggedSearch: true };
    const candidates: Record<string, string[]> = {
        "Sent":  ["Sent", "Sent Items", "Sent Messages", "INBOX.Sent", "[Gmail]/Sent Mail"],
        "Trash": ["Trash", "Deleted", "Deleted Items", "Deleted Messages", "[Gmail]/Trash", "INBOX.Trash", "INBOX.Deleted"],
        "All":   ["[Gmail]/All Mail", "All Mail", "INBOX.Archive", "Archive"],
    };
    const list = candidates[mb] || [mb];
    const found = list.find(n => mbNames.some((mn: string) => mn.toLowerCase() === n.toLowerCase()));
    if (found) return { resolved: found, flaggedSearch: false };
    const keyword = mb.toLowerCase();
    const fuzzy = mbNames.find((mn: string) => mn.toLowerCase().includes(keyword));
    return { resolved: fuzzy || "INBOX", flaggedSearch: false };
}

function extractFromAddresses(query: string): string[] {
    const addrs: string[] = [];
    const fromRe = /from:([\w.+@\-]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = fromRe.exec(query)) !== null) addrs.push((match[1] || "").toLowerCase());
    return [...new Set(addrs.filter(Boolean))];
}

function buildAddressCriteria(addrs: string[]): any {
    if (!addrs.length) return { all: true };
    const build = (a: string): any => ({ or: [{ from: a }, { to: a }, { body: a }] });
    let crit = build(addrs[0]);
    for (let i = 1; i < addrs.length; i++) crit = { or: [crit, build(addrs[i])] };
    return crit;
}

function newestFirstUids(uids: number[]): number[] {
    if (!uids.length) return [];
    return [...uids].sort((a, b) => b - a);
}

function mergedMailboxPriority(mailbox: unknown): number {
    const normalized = String(mailbox || "").trim().toUpperCase();
    if (normalized === "INBOX") return 0;
    if (normalized.includes("SENT")) return 1;
    return 2;
}

function mergedMessageSort(a: any, b: any): number {
    const ta = Number.isFinite(Number(a.internalDateMs)) ? Number(a.internalDateMs) : new Date(a.date || 0).getTime();
    const tb = Number.isFinite(Number(b.internalDateMs)) ? Number(b.internalDateMs) : new Date(b.date || 0).getTime();
    if (!isNaN(tb) && !isNaN(ta) && tb !== ta) return tb - ta;
    if (!isNaN(tb) && isNaN(ta)) return -1;
    if (isNaN(tb) && !isNaN(ta)) return 1;

    const mailboxPriority = mergedMailboxPriority(a._mailbox) - mergedMailboxPriority(b._mailbox);
    if (mailboxPriority !== 0) return mailboxPriority;

    const ua = parseInt(String(a.id || "").split("-")[0], 10);
    const ub = parseInt(String(b.id || "").split("-")[0], 10);
    if (!isNaN(ub) && !isNaN(ua) && ub !== ua) return ub - ua;
    if (!isNaN(ub) && isNaN(ua)) return 1;
    if (isNaN(ub) && !isNaN(ua)) return -1;

    const messageIdCompare = String(a.messageId || "").localeCompare(String(b.messageId || ""));
    if (messageIdCompare !== 0) return messageIdCompare;

    return String(a.id || "").localeCompare(String(b.id || ""));
}

router.post("/imap/fetch", async (req: Request, res: Response) => {
    const { host, port, user, pass, tls, query, maxResults = 25, offset = 0, mailbox = "INBOX" } = req.body;
    if (!host || !user || !pass) return res.status(400).json({ error: "Missing required fields: host, user, pass" });
    try {
        const emails = await withImap({ host, port: parseInt(port as string) || (tls !== false ? 993 : 143), user, pass, tls: tls !== false }, async (client) => {
            const mailboxes = await client.list();
            const mbNames = mailboxes.map((m: any) => m.path);
            console.log(`[IMAP] Available mailboxes:`, mbNames, `Requested: ${mailbox}`);
            const { resolved: resolvedMailbox, flaggedSearch } = resolveMailbox(mailbox, mbNames);
            await client.mailboxOpen(resolvedMailbox);
            console.log(`[IMAP] Opened mailbox: ${resolvedMailbox}, flaggedSearch: ${flaggedSearch}`);
            let searchCriteria: any = flaggedSearch ? { flagged: true } : { all: true };
            const q = (query || "").trim();
            const fromAddrs = q ? extractFromAddresses(q) : [];
            if (query && !flaggedSearch) {
                if (fromAddrs.length > 0) {
                    searchCriteria = buildAddressCriteria(fromAddrs);
                } else if (q.startsWith("subject:")) {
                    searchCriteria = { subject: q.slice(8).trim() };
                } else {
                    searchCriteria = { or: [{ subject: q }, { body: q }] };
                }
            } else if (query && flaggedSearch) {
                searchCriteria = { flagged: true, or: [{ subject: q }, { body: q }] };
            }
            const skip = Math.max(0, parseInt(String(offset)) || 0);
            const take = Math.max(1, parseInt(String(maxResults)) || 25);
            const uids: number[] = await client.search(searchCriteria, { uid: true }) as number[];
            const orderedUids = newestFirstUids(uids);
            const results: any[] = [];
            for await (const msg of client.fetch(orderedUids.length ? orderedUids : "1:0", { uid: true, flags: true, envelope: true, headers: true }, { uid: true })) {
                const threadInfo = resolveThreadIdentity(user, msg.envelope, msg.headers);
                results.push({
                    id: String(msg.uid),
                    threadId: threadInfo.threadId,
                    threadRootId: threadInfo.threadRootId,
                    subject: msg.envelope?.subject || "(no subject)",
                    from: addr(msg.envelope?.from?.[0]),
                    to: addr(msg.envelope?.to?.[0]),
                    date: msg.envelope?.date ? msg.envelope.date.toUTCString() : "",
                    internalDateMs: msg.envelope?.date?.getTime?.() ?? 0,
                    messageId: msg.envelope?.messageId || "",
                    references: readHeaderValue(msg.headers, "references"),
                    inReplyTo: String(msg.envelope?.inReplyTo || readHeaderValue(msg.headers, "in-reply-to") || ""),
                    snippet: "",
                    unread: !msg.flags?.has("\\Seen"),
                    _starred: msg.flags?.has("\\Flagged") || false,
                    _mailbox: resolvedMailbox,
                });
            }
            const mergedResults = results;

            if (resolvedMailbox.toUpperCase() === "INBOX") {
                const { resolved: sentMailbox } = resolveMailbox("Sent", mbNames);
                if (sentMailbox && sentMailbox.toUpperCase() !== "INBOX") {
                    try {
                        await client.mailboxOpen(sentMailbox);
                        const sentCriteria = fromAddrs.length > 0 ? buildAddressCriteria(fromAddrs) : { all: true };
                        const sentUids: number[] = await client.search(sentCriteria, { uid: true }) as number[];
                        const sentOrderedUids = newestFirstUids(sentUids);
                        for await (const msg of client.fetch(sentOrderedUids.length ? sentOrderedUids : "1:0", { uid: true, flags: true, envelope: true, headers: true }, { uid: true })) {
                            const allTargets = [
                                ...flattenAddresses(msg.envelope?.to),
                                ...flattenAddresses(msg.envelope?.cc),
                                ...flattenAddresses(msg.envelope?.bcc),
                            ];
                            const isRelated = fromAddrs.length > 0
                                ? allTargets.some((a) => fromAddrs.includes(a))
                                : true;
                            if (!isRelated) continue;
                            const threadInfo = resolveThreadIdentity(user, msg.envelope, msg.headers);
                            mergedResults.push({
                                id: `${msg.uid}-sent`,
                                threadId: threadInfo.threadId,
                                threadRootId: threadInfo.threadRootId,
                                subject: msg.envelope?.subject || "(no subject)",
                                from: addr(msg.envelope?.from?.[0]) || user,
                                to: addr(msg.envelope?.to?.[0]),
                                date: msg.envelope?.date ? msg.envelope.date.toUTCString() : "",
                                internalDateMs: msg.envelope?.date?.getTime?.() ?? 0,
                                messageId: msg.envelope?.messageId || "",
                                references: readHeaderValue(msg.headers, "references"),
                                inReplyTo: String(msg.envelope?.inReplyTo || readHeaderValue(msg.headers, "in-reply-to") || ""),
                                snippet: "",
                                unread: false,
                                _starred: msg.flags?.has("\\Flagged") || false,
                                _mailbox: sentMailbox,
                                _sent: true,
                            });
                        }
                    } catch (_) {
                        // If a provider has no separate sent mailbox or blocks access, keep inbox-only results.
                    }
                }
            }

            mergedResults.sort(mergedMessageSort);

            const page = mergedResults.slice(skip, skip + take);
            if (!page.length) return page;

            const endIndex = skip + page.length;
            const lastDate = new Date(page[page.length - 1]?.internalDateMs || page[page.length - 1]?.date || 0).toDateString();
            if (lastDate === "Invalid Date") return page;

            for (let i = endIndex; i < mergedResults.length; i++) {
                const current = mergedResults[i];
                const currentDate = new Date(current?.internalDateMs || current?.date || 0).toDateString();
                if (currentDate !== lastDate) break;
                page.push(current);
            }

            return page;
        });
        return res.json({ emails });
    } catch (e: any) {
        return res.status(500).json({ error: e.message || "IMAP connection failed" });
    }
});

router.post("/imap/message", async (req: Request, res: Response) => {
    const { host, port, user, pass, tls, uid, mailbox } = req.body;
    if (!host || !user || !pass || !uid) return res.status(400).json({ error: "Missing required fields" });
    try {
        const body = await withImap({ host, port: parseInt(port as string) || (tls !== false ? 993 : 143), user, pass, tls: tls !== false }, async (client) => {
            const mailboxes = await client.list();
            const mbNames = mailboxes.map((m: any) => m.path);
            const { resolved } = resolveMailbox(mailbox || "INBOX", mbNames);
            await client.mailboxOpen(resolved);
            let text = "", html = "";
            for await (const msg of client.fetch([parseInt(uid as string)], { source: true }, { uid: true })) {
                const parsed = await simpleParser(msg.source as any);
                if(parsed.html) { html = parsed.html; }
                if(parsed.text) { text = parsed.text; }
                break;
            }
            return { text, html };
        });
        return res.json({ body });
    } catch (e: any) {
        return res.status(500).json({ error: e.message || "Failed to fetch message" });
    }
});

router.post("/imap/send", async (req: Request, res: Response) => {
    const { host, user, pass, to, cc, bcc, subject, text, html, smtpHost: requestedSmtpHost } = req.body;
    if (!host || !user || !pass || !to || !subject) return res.status(400).json({ error: "Missing required fields: host, user, pass, to, subject" });
    if (!text && !html) return res.status(400).json({ error: "Missing email body" });

    const smtpHost = resolveSmtpHost(host, requestedSmtpHost);
    const smtpPort = parseOptionalPort(req.body.smtpPort);
    const smtpSecure = parseOptionalBoolean(req.body.smtpSecure);
    const attempts = buildSmtpAttempts(smtpPort, smtpSecure);

    try {
        const mailOptions = {
            from: user,
            to,
            cc: cc || undefined,
            bcc: bcc || undefined,
            subject,
            text: text || undefined,
            html: html || undefined,
        };

        let lastErr: any;
        for (const { port: portAttempt, secure } of attempts) {
            try {
                const transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: portAttempt,
                    secure,
                    ...(!secure ? { requireTLS: true } : {}),
                    auth: { user, pass },
                    connectionTimeout: 7000,
                    greetingTimeout: 7000,
                    socketTimeout: 12000,
                });
                await transporter.sendMail(mailOptions);
                return res.json({ success: true, message: "Email sent" });
            } catch (e: any) {
                lastErr = e;
                const isConnErr = ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EHOSTUNREACH", "ESOCKET"].includes(e?.code);
                if (!isConnErr || smtpPort) break;
            }
        }
        throw lastErr;
    } catch (e: any) {
        const error = smtpErrorMessage(e, smtpHost, attempts);
        console.error("[SMTP] send error:", { code: e?.code, command: e?.command, responseCode: e?.responseCode, smtpHost, attempts, message: e?.message });
        return res.status(500).json({ error });
    }
});

export default router;
