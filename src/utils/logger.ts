import pino from "pino";
import pinoPretty from "pino-pretty";
import { config } from "../config/env";

export const logger = pino(
  {
    level: config.logLevel,
  },
  pinoPretty({
    colorize: true,
    ignore: "pid,hostname",
    sync: true,
  }),
);
