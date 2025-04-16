import pool from "../config/db.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.SECRET_KEY;

export const getAllUsers = async (req, res) => {
    try {
        const response = await pool.query("SELECT * from users");
        res.json(response.rows);
    } catch (error) {
        console.log(error.message);
    }
}

// Fungsi untuk membuat admin default jika belum ada
const createDefaultAdmin = async () => {
    try {
        const adminEmail = "admin@example.com";
        const adminUsername = "admin";
        const adminPassword = "admin123"; // Ganti dengan password yang lebih kuat
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Cek apakah admin sudah ada
        const checkAdmin = await pool.query("SELECT * FROM users WHERE role_id = 1");

        if (checkAdmin.rows.length === 0) {
            // Jika belum ada admin, buat admin baru
            await pool.query(
                "INSERT INTO users (id, email, username, password, role_id) VALUES ($1, $2, $3, $4, $5)",
                [uuidv4(), adminEmail, adminUsername, hashedPassword, 1]
            );
            console.log("Admin default berhasil dibuat");
        }
    } catch (error) {
        console.error("Gagal membuat admin default:", error.message);
    }
};

// Fungsi untuk registrasi user biasa
export const userRegister = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        // Generate UUID untuk user ID
        const userId = uuidv4();

        // Hash password sebelum disimpan
        const hashedPassword = await bcrypt.hash(password, 10);

        // Semua user baru akan mendapat role_id = 2 (User)
        const roleId = 2;

        // Insert user ke database
        const response = await pool.query(
            "INSERT INTO users (id, email, username, password, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [userId, email, username, hashedPassword, roleId]
        );
        createDefaultAdmin();
        res.status(201).json({ message: "User registered successfully", user: response.rows[0] });
    } catch (error) {
        console.error(error.message);

        if (error.code === "23505") { // Unique constraint violation (Email atau Username sudah ada)
            return res.status(400).json({ error: "Email or Username already exists" });
        }

        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const loginUser = async (req, res) => {
    try {
        console.log(req.body);
        const { email, password } = req.body;

        if (!email && !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const response = await pool.query(
            "SELECT * FROM users WHERE email = $1 OR username = $2",
            [email || null, username || null]
        );

        if (response.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = response.rows[0];

        if (!JWT_SECRET) {
            console.error("JWT_SECRET tidak ditemukan dalam konfigurasi");
            return res.status(500).json({ message: "Konfigurasi server bermasalah" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        if (await bcrypt.compare(password, user.password)) {
            const role = user.role_id === 1 ? "admin" : "user";

            return res.status(200).json({
                message: "Login successful",
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: role,
                    token: token
                }
            });
        } else {
            return res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params; // ID user yang akan di-update
        const { email, username, password } = req.body;

        // Cek apakah username atau email sudah digunakan oleh user lain
        const checkUser = await pool.query(
            "SELECT * FROM users WHERE (email = $1 OR username = $2) AND id != $3",
            [email, username, id]
        );

        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: "Email or username already exists" });
        }

        // Hash password jika di-update
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Update data user
        const response = await pool.query(
            "UPDATE users SET email = COALESCE($1, email), username = COALESCE($2, username), password = COALESCE($3, password) WHERE id = $4 RETURNING *",
            [email, username, hashedPassword, id]
        );

        return res.status(200).json({
            message: "User updated successfully",
            user: response.rows[0]
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};