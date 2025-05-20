/**
 * Cross-platform environment variables helper
 * This ensures the application works correctly on both Unix/Linux and Windows platforms
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Set default environment variables if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

if (!process.env.PORT) {
  process.env.PORT = '5000';
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'medichain-secret-key';
}

// Define paths for data storage
export const DATA_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'data');
export const UPLOADS_PATH = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

// Create directories if they don't exist
[DATA_PATH, UPLOADS_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Export configuration for use in other files
export const config = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: parseInt(process.env.PORT, 10),
  SESSION_SECRET: process.env.SESSION_SECRET,
  DATA_PATH,
  UPLOADS_PATH,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development'
};

export default config;