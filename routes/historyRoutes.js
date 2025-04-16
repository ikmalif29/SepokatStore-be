import express from "express";
import { 
    uploadBuktiPembayaran, 
    getHistory, 
    getHistoryById, 
    approvePemesanan, 
    getDetailPemesanan, 
    getDetailPemesananById 
} from "../controllers/historyController.js";

const router = express.Router();

router.get("/history", getHistory);
router.get("/history/:id_user", getHistoryById);
router.put("/pemesanan/:id/bukti", uploadBuktiPembayaran);
router.put("/pemesanan/:id/approve", approvePemesanan); // Tanpa autentikasi
router.get("/detail-pemesanan", getDetailPemesanan);
router.get("/detail-pemesanan/:id_user", getDetailPemesananById);

export default router;