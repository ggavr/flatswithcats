/**
 * Application-wide constants and configuration values
 */

// Notion Configuration
export const NOTION_TIMEOUT_MS = 10_000; // 10 seconds
export const NOTION_RETRY_MAX_ATTEMPTS = 3;
export const NOTION_RETRY_INITIAL_DELAY_MS = 300;
export const NOTION_RETRY_MAX_DELAY_MS = 10_000;
export const NOTION_RETRY_BACKOFF_MULTIPLIER = 2;

// Cache Configuration
export const CACHE_TTL_MS = 60_000; // 1 minute
export const CACHE_MAX_SIZE_PROFILES = 500;
export const CACHE_MAX_SIZE_LISTINGS = 1000;

// Rate Limiting
export const RATE_LIMIT_BOT_WINDOW_MS = 500; // 500ms between messages for bot
export const RATE_LIMIT_API_MAX = 100; // 100 requests per minute per user
export const RATE_LIMIT_API_WINDOW = '1 minute';
export const RATE_LIMIT_CACHE_SIZE = 10_000; // Track 10k IPs/tokens

// Telegram Configuration
export const TELEGRAM_MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB (safety margin below 20 MB limit)
export const TELEGRAM_MAX_CAPTION_LENGTH = 1024;

// Session Configuration
export const SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 days
export const INIT_DATA_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const INIT_DATA_MAX_ENTRIES = 25_000; // Max replay protection entries
export const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

// Activity Tracking (Bot)
export const ACTIVITY_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_TRACKED_USERS = 5000;

// Self-Ping Configuration (Render Free Tier)
export const SELF_PING_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes
export const SELF_PING_TIMEOUT_MS = 10_000; // 10 second timeout

// HTTP Server Configuration
export const HTTP_REQUEST_TIMEOUT_MS = 30_000; // 30 seconds
export const HTTP_MULTIPART_FILE_SIZE_LIMIT = 20 * 1024 * 1024; // 20 MB

// Validation Limits
export const VALIDATION_MAX_TEXT_LENGTH = 500;
export const VALIDATION_MAX_NAME_LENGTH = 120;
export const VALIDATION_MAX_INTRO_LENGTH = 600;
export const VALIDATION_MAX_CAT_NAME_LENGTH = 100;
export const VALIDATION_MAX_URL_LENGTH = 2048;
export const VALIDATION_MAX_FILE_ID_LENGTH = 512;

// Notion Property Limits
export const NOTION_RICH_TEXT_MAX_LENGTH = 1900; // Notion's limit is 2000, use 1900 for safety

