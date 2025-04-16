import express from "express";
import { getAllUsers, userRegister,loginUser, updateUser } from "../controllers/usersController.js";

const router = express.Router();

router.get("/users", getAllUsers);
router.post("/users/register", userRegister);
router.post("/users/login", loginUser);
router.put("/users/update/:id", updateUser);

export default router;