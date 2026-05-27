import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

function buildLocalFallbackUri(uri: string) {
  try {
    const parsed = new URL(uri);
    const databaseName = parsed.pathname.replace(/^\//, '') || 'clinic_management';

    return `mongodb://127.0.0.1:27017/${databaseName}`;
  } catch {
    return 'mongodb://127.0.0.1:27017/clinic_management';
  }
}

function isDevMongoFallbackEnabled() {
  return process.env.NODE_ENV !== 'production';
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached = globalThis.mongoose;

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }

  const activeCache = cached ?? (globalThis.mongoose = { conn: null, promise: null });

  if (activeCache.conn) {
    return activeCache.conn;
  }

  if (!activeCache.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000,
    };

    activeCache.promise = mongoose
      .connect(MONGODB_URI!, opts)
      .then((mongoose) => {
        return mongoose;
      });
  }

  try {
    activeCache.conn = await activeCache.promise;
  } catch (e) {
    activeCache.promise = null;

    if (!isDevMongoFallbackEnabled()) {
      throw e;
    }

    const fallbackUri = buildLocalFallbackUri(MONGODB_URI!);

    try {
      await mongoose.disconnect();
      activeCache.promise = mongoose.connect(fallbackUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 3000,
      });
      activeCache.conn = await activeCache.promise;
    } catch (fallbackError) {
      activeCache.promise = null;

      const mainMessage = e instanceof Error ? e.message : 'Unknown MongoDB connection error';
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown local MongoDB connection error';

      throw new Error(
        `Unable to connect to MongoDB. Primary URI failed with: ${mainMessage}. Local fallback failed with: ${fallbackMessage}.`
      );
    }
  }

  cached = activeCache;
  return activeCache.conn;
}

export default connectDB;
