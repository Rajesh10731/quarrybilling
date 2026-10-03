import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quarry_billing";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  migration?: Promise<void> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached?.conn && cached.migration) {
    await cached.migration;
    return cached.conn;
  }

  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  // Bring data written by older versions in line with the current rules (runs once per server start).
  if (!cached!.migration) {
    // Assigned before any await so concurrent requests share the same run
    cached!.migration = import("@/lib/migrate")
      .then(({ migrateLegacyData }) => migrateLegacyData())
      .catch((e) => {
        cached!.migration = null;
        console.error("Data migration failed", e);
      });
  }
  await cached!.migration;

  return cached!.conn;
}
