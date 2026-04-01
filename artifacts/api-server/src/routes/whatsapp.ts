import { Router } from "express";

const router = Router();

interface WaMessage {
  id: string;
  from: string;
  sender: string;
  timestamp: string;
  type: string;
  text: string;
  phoneNumberId: string;
  receivedAt: number;
}

const waStore: { messages: WaMessage[]; verifyToken: string } = {
  messages: [],
  verifyToken: "agentgpt-wa-token",
};

router.post("/whatsapp/config", (req, res) => {
  const { verifyToken } = req.body;
  if (verifyToken) waStore.verifyToken = verifyToken;
  res.json({ ok: true, verifyToken: waStore.verifyToken });
});

router.get("/whatsapp/config", (_req, res) => {
  res.json({ verifyToken: waStore.verifyToken });
});

router.get("/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === waStore.verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post("/webhook/whatsapp", (req, res) => {
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    body.entry?.forEach((entry: any) => {
      entry.changes?.forEach((change: any) => {
        if (change.field === "messages") {
          const value = change.value;
          value.messages?.forEach((msg: any) => {
            const contact = value.contacts?.find(
              (c: any) => c.wa_id === msg.from,
            );
            const textBody =
              msg.text?.body ||
              (msg.type === "image"
                ? "[Image]"
                : msg.type === "audio"
                  ? "[Audio]"
                  : msg.type === "video"
                    ? "[Video]"
                    : msg.type === "document"
                      ? "[Document]"
                      : msg.type === "sticker"
                        ? "[Sticker]"
                        : `[${msg.type}]`);
            const existing = waStore.messages.find((m) => m.id === msg.id);
            if (!existing) {
              waStore.messages.push({
                id: msg.id,
                from: msg.from,
                sender: contact?.profile?.name || msg.from,
                timestamp: msg.timestamp,
                type: msg.type,
                text: textBody,
                phoneNumberId: value.metadata?.phone_number_id || "",
                receivedAt: Date.now(),
              });
            }
          });
        }
      });
    });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

router.get("/whatsapp/messages", (req, res) => {
  const since = req.query.since ? parseInt(req.query.since as string, 10) : 0;
  const msgs = since
    ? waStore.messages.filter((m) => m.receivedAt > since)
    : waStore.messages;
  res.json({ messages: msgs, total: waStore.messages.length });
});

router.delete("/whatsapp/messages", (_req, res) => {
  waStore.messages = [];
  res.json({ ok: true });
});

router.post("/whatsapp/send", async (req, res) => {
  const { phoneNumberId, accessToken, to, message } = req.body;
  if (!phoneNumberId || !accessToken || !to || !message) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const resp = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body: message },
        }),
      },
    );
    const data = await resp.json();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
