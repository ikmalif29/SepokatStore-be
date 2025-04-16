import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.SECRET_KEY;

// Middleware untuk verifikasi token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Periksa apakah header Authorization ada dan memiliki format yang benar
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Akses ditolak. Token harus berformat 'Bearer <token>'." });
    }

    // Ekstrak token dari header
    const token = authHeader.split(" ")[1];

    // Verifikasi token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Token tidak valid." });
        }

        // Tambahkan informasi user ke request
        req.user = user;
        next();
    });
};

export default authenticateToken;