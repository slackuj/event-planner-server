import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const envSchema = z.object({
    // Server & Database
    PORT: z.string().default("17190").transform(Number),
    MYSQL_ROOT_PASSWORD: z.string("MISSING MYSQL_ROOT_PASSWORD"),
    MYSQL_DATABASE: z.string("MISSING MYSQL_DATABASE"),
    MYSQL_USER: z.string("MISSING MYSQL_USER"),
    MYSQL_PASSWORD: z.string("MISSING MYSQL_PASSWORD"),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string("MISSING CLOUDINARY_CLOUD_NAME"),
    CLOUDINARY_API_KEY: z.string("MISSING CLOUDINARY_API_KEY"),
    CLOUDINARY_API_SECRET: z.string("MISSING CLOUDINARY_API_SECRET"),

    // Authentication
    JWT_SECRET_ACCESS: z.string().min(64, "JWT_SECRET_ACCESS should be at least 64 characters"),
    JWT_SECRET_REFRESH: z.string().min(64, "JWT_SECRET_REFRESH should be at least 64 characters"),

    // Google Mail Service
    GOOGLE_APP_EMAIL: z.email("Invalid Google App Email"),

    // sendgrid
    SENDGRID_API_KEY: z.string("MISSING SENDGRID_API_KEY"),
});

const envServer = envSchema.safeParse(process.env);

if (!envServer.success) {
    // Note: z.prettifyError is not a standard Zod method;
    // using envServer.error.format() or flatten() is more common.
    console.error("❌ Invalid environment variables:", z.prettifyError(envServer.error));
    process.exit(1);
}

export const config = envServer.data;