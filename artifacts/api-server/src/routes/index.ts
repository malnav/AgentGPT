import { Router, type IRouter } from "express";
import healthRouter from "./health";
import imapRouter from "./imap";

const router: IRouter = Router();

router.use(healthRouter);
router.use(imapRouter);

export default router;
