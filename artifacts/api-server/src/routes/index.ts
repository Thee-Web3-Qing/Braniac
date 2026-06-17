import { Router, type IRouter } from "express";
import healthRouter from "./health";
import brainRouter from "./brain";
import discordRouter from "./discord";
import telegramRouter from "./telegram";
import walletRouter from "./wallet";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/brain",    brainRouter);
router.use("/discord",  discordRouter);
router.use("/telegram", telegramRouter);
router.use("/wallet",   walletRouter);

export default router;
