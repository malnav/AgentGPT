import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const TOKEN_FILE = path.join(process.cwd(), "data", "gmail_tokens.json");

function readTokens(): Record<string, string> {
    try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")); } catch { return {}; }
}

function writeTokens(data: Record<string, string>) {
    const dir = path.dirname(TOKEN_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
}

router.get("/gmail/has-token", (_req: Request, res: Response) => {
    const tokens = readTokens();
    return res.json({ hasToken: !!tokens.refresh_token });
});

router.post("/gmail/exchange-code", async (req: Request, res: Response) => {
    const { code, client_id, client_secret } = req.body;
    if (!code || !client_id || !client_secret) {
        return res.status(400).json({ error: "Missing code, client_id, or client_secret" });
    }
    try {
        // Typed as 'any' to fix the TS2339 collision with Express Response
        const resp: any = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id,
                client_secret,
                redirect_uri: "postmessage",
                grant_type: "authorization_code",
            }).toString(),
        });
        const data: any = await resp.json();
        if (!resp.ok || data.error) {
            return res.status(400).json({ error: data.error_description || data.error || "Token exchange failed" });
        }
        const existing = readTokens();
        writeTokens({
            ...existing,
            refresh_token: data.refresh_token || existing.refresh_token || "",
            client_id,
            client_secret,
        });
        return res.json({ access_token: data.access_token, expires_in: data.expires_in });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
});

router.post("/gmail/refresh", async (req: Request, res: Response) => {
    const tokens = readTokens();
    if (!tokens.refresh_token) {
        return res.status(404).json({ error: "No refresh token stored. Connect Gmail first." });
    }
    const client_id = req.body.client_id || tokens.client_id;
    const client_secret = req.body.client_secret || tokens.client_secret;
    if (!client_id || !client_secret) {
        return res.status(400).json({ error: "Missing client_id or client_secret" });
    }
    try {
        // Typed as 'any' to fix the TS2339 collision with Express Response
        const resp: any = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                refresh_token: tokens.refresh_token,
                client_id,
                client_secret,
                grant_type: "refresh_token",
            }).toString(),
        });
        const data: any = await resp.json();
        if (!resp.ok || data.error) {
            return res.status(400).json({ error: data.error_description || data.error || "Token refresh failed" });
        }
        return res.json({ access_token: data.access_token, expires_in: data.expires_in });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
});

router.delete("/gmail/token", (_req: Request, res: Response) => {
    const tokens = readTokens();
    delete tokens.refresh_token;
    writeTokens(tokens);
    return res.json({ success: true });
});

export default router;
