import mongoose from "mongoose";

// Log all environment variables for debugging (optional, remove if not needed)

if (!process.env.MONGODB_URI) {
  throw new Error("❌ MONGODB_URI environment variable is not defined. Please check your .env.local file");
}

const MONGODB_URI = process.env.MONGODB_URI;

let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase() {
  if (cachedConnection) {
    console.log("📡 Using cached database connection");
    return cachedConnection;
  }

  try {
    console.log("🔌 Connecting to MongoDB...");
    console.log("🔑 Using connection string:", MONGODB_URI.replace(/:[^:@]*@/, ':****@')); // Hide password in logs

    const connection = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });

    console.log(
      `✅ MongoDB Connected: ${connection.connection.host} / ${connection.connection.name}`
    );

    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}
