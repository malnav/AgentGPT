import { Router } from "express";
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

function addr(a: any) {
    if (!a) return "";
    const name = a.name || "";
    const address = a.address || "";
    return name ? `${name} <${address}>` : address;
}

router.post("/imap/fetch", async (req, res) => {
    const { host, port, user, pass, tls, query, maxResults = 25 } = req.body;
    if (!host || !user || !pass) return res.status(400).json({ error: "Missing required fields: host, user, pass" });
    try {
        const emails = await withImap({ host, port: parseInt(port) || (tls !== false ? 993 : 143), user, pass, tls: tls !== false }, async (client) => {
            await client.mailboxOpen("INBOX");
            let searchCriteria: any = { all: true };
            if (query) {
                const q = query.trim();
                const fromAddrs: string[] = [];
                const fromRe = /from:([\w.+@\-]+)/gi;
                let fm: RegExpExecArray | null;
                while ((fm = fromRe.exec(q)) !== null) fromAddrs.push(fm[1]);
                if (fromAddrs.length > 0) {
                    const build = (a: string): any => ({ or: [{ from: a }, { to: a }] });
                    let crit = build(fromAddrs[0]);
                    for (let i = 1; i < fromAddrs.length; i++) crit = { or: [crit, build(fromAddrs[i])] };
                    searchCriteria = crit;
                } else if (q.startsWith("subject:")) {
                    searchCriteria = { subject: q.slice(8).trim() };
                } else {
                    searchCriteria = { or: [{ subject: q }, { body: q }] };
                }
            }
            const uids: number[] = await client.search(searchCriteria, { uid: true }) as number[];
            const slice = uids.slice(-Math.max(maxResults, 1)).reverse();
            const results: any[] = [];
            for await (const msg of client.fetch(slice.length ? slice : "1:0", { uid: true, flags: true, envelope: true }, { uid: true })) {
                results.push({
                    id: String(msg.uid),
                    threadId: String(msg.uid),
                    subject: msg.envelope?.subject || "(no subject)",
                    from: addr(msg.envelope?.from?.[0]),
                    to: addr(msg.envelope?.to?.[0]),
                    date: msg.envelope?.date ? msg.envelope.date.toUTCString() : "",
                    messageId: msg.envelope?.messageId || "",
                    snippet: "",
                    unread: !msg.flags?.has("\\Seen"),
                });
            }
            return results.reverse();
        });
        res.json({ emails });
    } catch (e: any) {
        res.status(500).json({ error: e.message || "IMAP connection failed" });
    }
});

router.post("/imap/message", async (req, res) => {
    const { host, port, user, pass, tls, uid } = req.body;
    if (!host || !user || !pass || !uid) return res.status(400).json({ error: "Missing required fields" });
    try {
        const body = await withImap({ host, port: parseInt(port) || (tls !== false ? 993 : 143), user, pass, tls: tls !== false }, async (client) => {
            await client.mailboxOpen("INBOX");
            let text = "", html = "";
            for await (const msg of client.fetch([parseInt(uid)], { source: true }, { uid: true })) {
                const parsed = await simpleParser(msg.source as any);
                if(parsed.html) { html = parsed.html; }
                if(parsed.text) { text = parsed.text; }
                break;
            }
            return { text, html };
        });
        res.json({ body });
    } catch (e: any) {
        res.status(500).json({ error: e.message || "Failed to fetch message" });
    }
});

router.post("/imap/send", async (req, res) => {
    const { host, port, user, pass, tls, to, subject, text, html } = req.body;
    if (!host || !user || !pass || !to || !subject) return res.status(400).json({ error: "Missing required fields: host, user, pass, to, subject" });
    try {
        const transporter = nodemailer.createTransport({
            host: host,
            port: parseInt(port) || (tls !== false ? 587 : 25),
            secure: tls === true && parseInt(port) === 465,
            auth: { user: user, pass: pass },
            connectionTimeout: 15000,
        });
        await transporter.sendMail({
            from: user,
            to: to,
            subject: subject,
            text: text || undefined,
            html: html || undefined,
        });
        res.json({ success: true, message: "Email sent" });
    } catch (e: any) {
        res.status(500).json({ error: e.message || "Failed to send email" });
    }
});

export default router;
