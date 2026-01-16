import * as Sentry from "@sentry/node";

// Re-export the Sentry logger for use throughout the application
// The Sentry initialization is done in instrument.mjs which is loaded before the app starts
export const logger = Sentry.logger;
