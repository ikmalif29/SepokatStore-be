import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRouter from "./routes/productRoutes.js";
import usersRouter from "./routes/usersRoutes.js";
import cartRouter from "./routes/cartRoutes.js";
import buyProductRouter from "./routes/buyProductRoutes.js";
import historyRouter from "./routes/historyRoutes.js";

dotenv.config();

const app = express();

// Konfigurasi CORS untuk hanya mengizinkan domain frontend
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Metode yang diizinkan
    allowedHeaders: ["Content-Type", "Authorization"], // Header yang diizinkan
    credentials: true, // Izinkan pengiriman cookies atau kredensial jika diperlukan
  })
);

app.use(express.json());

// Rute API
app.use("/api/", productsRouter);
app.use("/api/", usersRouter);
app.use("/api/", cartRouter);
app.use("/api/", buyProductRouter);
app.use("/api/", historyRouter);

// Menangani rute yang tidak ditemukan
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Menangani error server
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));