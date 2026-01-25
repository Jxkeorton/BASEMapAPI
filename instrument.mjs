import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://a32c53e5f92334e317628d9c25670d3e@o4509719174316042.ingest.de.sentry.io/4510721816068176",
  sendDefaultPii: true,
  environment: process.env.NODE_ENV || "development",
  enableLogs: true,
  tracesSampleRate: 1.0,
});

export const logger = Sentry.logger;
