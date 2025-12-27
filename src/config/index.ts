import { config } from "dotenv";

config();

export const appConfig = {
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "localhost",
  nodeEnv: process.env.NODE_ENV || "development",

  apiKey: process.env.API_KEY,

  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
  },

  api: {
    version: process.env.API_VERSION || "v1",
    corsOrigin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3001",
    ],
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "60000"),
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};

// Validate required environment variables
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "API_KEY"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
}
