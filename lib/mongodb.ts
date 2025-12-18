import mongoose, { Mongoose } from "mongoose";

/**
 * Centralized MongoDB connection helper for Next.js + Mongoose + TypeScript.
 *
 * - Uses a global cache to avoid creating multiple connections in dev (Fast Refresh).
 * - Strict typings (no `any`).
 * - Throws early if MONGODB_URI is missing.
 * - Connection options tuned for production while remaining dev-friendly.
 */

// Read the MongoDB connection string from environment.
// Example: mongodb+srv://user:password@cluster.example.net/app?retryWrites=true&w=majority
// Assert MONGODB_URI is defined, TypeScript will recognize it as non-null after this check
const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error("Missing environment variable: MONGODB_URI");
}

/**
 * Shape of the cached connection stored on `globalThis`.
 * - conn: an established Mongoose instance (if connected).
 * - promise: a shared promise while the connection is being established.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

/**
 * Augment the Node.js global type to include our cache.
 * This persists across hot-reloads in development.
 */
declare global {
  // eslint-disable-next-line no-var
  var __mongoose__: MongooseCache | undefined;
}

/**
 * Initialize or reuse the global cache object.
 */
const cached: MongooseCache =
  globalThis.__mongoose__ ?? (globalThis.__mongoose__ = { conn: null, promise: null });

/**
 * Establishes (or reuses) a MongoDB connection via Mongoose.
 * - Returns a single shared Mongoose instance.
 * - Safe to call from any server-side code (API routes, server components).
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // Reuse existing connection if already established.
  if (cached.conn) {
    return cached.conn;
  }

  // Configure Mongoose behavior before connecting.
  // Enforces strict query casting and rejects unknown fields in filters.
  mongoose.set("strictQuery", true);

  if (!cached.promise) {
    // Connection options:
    // - autoIndex: enabled in dev for convenience; disabled in prod for performance.
    // - maxPoolSize: controls concurrent sockets to MongoDB server.
    // - serverSelectionTimeoutMS: fail fast if MongoDB is unreachable.
    // - dbName: optional database name override via env (MONGODB_DB).
    const options: Parameters<typeof mongoose.connect>[1] = {
      autoIndex: process.env.NODE_ENV !== "production",
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      dbName: process.env.MONGODB_DB,
    };

    // Create a single shared connection promise.
    cached.promise = mongoose.connect(MONGODB_URI, options);
  }

  // Await connection and store the resolved instance for future calls.
  cached.conn = await cached.promise;
  return cached.conn;
}