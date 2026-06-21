import { Router, type IRouter } from "express";
import healthRouter from "./health";
import brainRouter from "./brain";
import discordRouter from "./discord";
import telegramRouter from "./telegram";
import telegramUserRouter from "./telegram-user";
import walletRouter from "./wallet";
import ogRouter from "./og";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/brain",          brainRouter);
router.use("/discord",        discordRouter);
router.use("/telegram",       telegramRouter);
router.use("/telegram/user",  telegramUserRouter);
router.use("/wallet",         walletRouter);
router.use("/og",             ogRouter);
router.use("/users",          usersRouter);

export default router;
