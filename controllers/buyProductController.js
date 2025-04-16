import pool from "../config/db.js";

export const selectedProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await pool.query(`
            SELECT p.*, c.nama_category 
            FROM product p
            JOIN category c ON p.id_category = c.id
            WHERE p.id = $1`,
            [id]);
        res.json(response.rows[0]);
    } catch (error) {
        console.error("Error menambahkan ke cart:", error.message);
        res.status(500).json({ error: "Terjadi kesalahan server!" });
    }
}

export const productPemesanan = async (req, res) => {
    try {
        const { id_user, id_barang, quantity, size, alamat, paymentMethod, no_hp } = req.body;

        if (!id_user || !id_barang || !quantity || !size || !alamat || !paymentMethod || !no_hp) {
            return res.status(400).json({ message: "Semua field harus diisi" });
        }

        // Begin transaction
        await pool.query('BEGIN');

        // 1. Insert new order into pemesanan table
        const insertQuery = `
            INSERT INTO pemesanan (id_user, id_barang, quantity, size, alamat, payment_method, no_hp)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const insertValues = [id_user, id_barang, quantity, size, alamat, paymentMethod, no_hp];

        const insertResult = await pool.query(insertQuery, insertValues);
        
        // 2. Delete the corresponding cart item
        const deleteQuery = `
            DELETE FROM cart 
            WHERE id_user = $1 AND id_barang = $2;
        `;
        const deleteValues = [id_user, id_barang];
        
        await pool.query(deleteQuery, deleteValues);

        // Commit transaction
        await pool.query('COMMIT');
        
        res.status(201).json({
            message: "Pemesanan berhasil dibuat dan item telah dihapus dari keranjang",
            data: insertResult.rows[0],
        });
    } catch (error) {
        // Rollback in case of error
        await pool.query('ROLLBACK');
        console.error("Error saat membuat pemesanan:", error);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}

export const selectedProductPemesanan = async (req, res) => {
    try {

        const { id_user, id_barang, quantity, size, alamat, paymentMethod, no_hp } = req.body;

        if (!id_user || !id_barang || !quantity || !size || !alamat || !paymentMethod || !no_hp) {
            console.log("Field yang kurang:", { id_user, id_barang, quantity, size, alamat, paymentMethod, no_hp });
            return res.status(400).json({ message: "Semua field harus diisi" });
        }

        console.log("Data valid, mulai transaksi...");
        await pool.query('BEGIN');

        const insertQuery = `
            INSERT INTO pemesanan (id_user, id_barang, quantity, size, alamat, payment_method, no_hp)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const insertValues = [id_user, id_barang, quantity, size, alamat, paymentMethod, no_hp];

        const insertResult = await pool.query(insertQuery, insertValues);
        console.log("Data berhasil disimpan:", insertResult.rows[0]);

        await pool.query('COMMIT');

        res.status(201).json({
            message: "Pemesanan berhasil dibuat",
            data: insertResult.rows[0],
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error("Error saat membuat pemesanan:", error);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
};