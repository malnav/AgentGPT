import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import imapRouter from "./imap.js";
import fetchRouter from "./fetch.js";
import gmailRouter from "./gmail.js";
import weatherRouter from "./weather.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(imapRouter);
router.use(fetchRouter);
router.use(gmailRouter);
router.use(weatherRouter);

export default router;
