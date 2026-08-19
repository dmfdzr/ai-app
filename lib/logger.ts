import "server-only"

import path from "node:path"
import * as winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"

const LOG_DIRECTORY =
  process.env.LOG_DIR?.trim() || path.join(process.cwd(), "logs")

const infoAndErrorOnly = winston.format((info) =>
  info.level === "info" || info.level === "error" ? info : false
)

function createMessageFormat() {
  return winston.format.printf(({ message }) =>
    typeof message === "string" ? message : JSON.stringify(message, null, 2)
  )
}

function createConsoleFormat() {
  return winston.format.combine(
    infoAndErrorOnly(),
    createMessageFormat()
  )
}

function createExactLevelFormat(level: "info" | "error") {
  return winston.format.combine(
    winston.format((info) => (info.level === level ? info : false))(),
    createMessageFormat()
  )
}

function createLogger() {
  const infoFileTransport = new DailyRotateFile({
    dirname: LOG_DIRECTORY,
    filename: "application-info-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    level: "info",
    auditFile: path.join(LOG_DIRECTORY, ".info-audit.json"),
    format: createExactLevelFormat("info"),
  })

  const errorFileTransport = new DailyRotateFile({
    dirname: LOG_DIRECTORY,
    filename: "application-error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    level: "error",
    auditFile: path.join(LOG_DIRECTORY, ".error-audit.json"),
    format: createExactLevelFormat("error"),
  })

  infoFileTransport.on("error", (error) => {
    console.error("Info file log transport failed", error)
  })

  errorFileTransport.on("error", (error) => {
    console.error("Error file log transport failed", error)
  })

  return winston.createLogger({
    level: "info",
    transports: [
      infoFileTransport,
      errorFileTransport,
      new winston.transports.Console({ format: createConsoleFormat() }),
    ],
    exitOnError: false,
  })
}

const globalLogger = globalThis as typeof globalThis & {
  applicationLogger?: winston.Logger
}

function getLogger(): winston.Logger {
  if (!globalLogger.applicationLogger) {
    globalLogger.applicationLogger = createLogger()
  }

  return globalLogger.applicationLogger
}

export function writeLog(level: "info" | "error", message: string): void {
  getLogger().log(level, message)
}
