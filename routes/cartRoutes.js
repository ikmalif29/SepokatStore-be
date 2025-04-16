import express from "express";
import { addToCart, getCartData, deleteCart, editCart } from "../controllers/cartController.js";

const router = express.Router();

router.post("/products/addcart", addToCart);
router.get("/products/getcart", getCartData);
router.put("/products/cart/:id_user/:id_barang", editCart);
router.delete("/products/cart/:id_user/:id_barang", deleteCart);

export default router;