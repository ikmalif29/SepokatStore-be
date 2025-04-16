import express from "express";
import { addProduct, getAllProducts, deleteProduct, updateProduct } from "../controllers/productControllers.js";

const router = express.Router();

router.get("/products", getAllProducts);
router.post("/products", addProduct);
router.delete("/products/:id", deleteProduct);
router.put("/products/:id", updateProduct);

export default router;