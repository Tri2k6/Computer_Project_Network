import dotenv from 'dotenv'

dotenv.config();

export const Config = {
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    AUTH_SECRET: process.env.AUTH_SECRET || "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    NODE_ENV: process.env.NODE_ENV || 'development',
};