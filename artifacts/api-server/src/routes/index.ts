import { Router, type IRouter } from "express";
import healthRouter from "./health";
import imapRouter from "./imap";
import fetchRouter from "./fetch";
import gmailRouter from "./gmail";

const router: IRouter = Router();

router.use(healthRouter);
router.use(imapRouter);
router.use(fetchRouter);
router.use(gmailRouter);

export default router;
