import express from "express";
import { productPemesanan, selectedProduct, selectedProductPemesanan } from "../controllers/buyProductController.js";

const router = express.Router();

router.get("/selectedproduct/:id", selectedProduct);
router.post("/pemesanan", productPemesanan);
router.post("/pemesananSelected", selectedProductPemesanan);

export default router;