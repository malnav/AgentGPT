import { Router, type Request, type Response } from "express";
import { syncGmailMailbox, syncImapMailbox } from "../backend/sync-service.js";

const router = Router();

router.post("/sync/gmail", async (req: Request, res: Response) => {
  const { accountId, mailbox } = req.body;
  if (!accountId || !mailbox) {
    return res.status(400).json({ error: "Missing required fields: accountId, mailbox" });
  }

  const metrics = await syncGmailMailbox(req.body);
  return res.json({ ok: true, metrics });
});

router.post("/sync/imap", async (req: Request, res: Response) => {
  const { accountId, mailbox, uidValidity, highestUid } = req.body;
  if (!accountId || !mailbox || uidValidity === undefined || highestUid === undefined) {
    return res.status(400).json({ error: "Missing required fields: accountId, mailbox, uidValidity, highestUid" });
  }

  const metrics = await syncImapMailbox(req.body);
  return res.json({ ok: true, metrics });
});

export default router;
