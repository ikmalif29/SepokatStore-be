import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

const connection = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

console.log("Connected Ke Database Berhasil");

export default connection;