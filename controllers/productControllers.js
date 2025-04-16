import pool from "../config/db.js";

export const getAllProducts = async (req, res) => {
    try {
        const response = await pool.query("SELECT * FROM product");
        res.json(response.rows);
    } catch (error) {
        console.log(error.message);
    }
};

export const addProduct = async (req, res) => {
    try {
        const { nama_barang, harga, id_category, stok, image, image_2 } = req.body;

        const response = await pool.query(`
            INSERT INTO product (nama_barang,harga,id_category,stok,gambar,gmbr) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [nama_barang, harga, id_category, stok, image, image_2]
        );
        res.json(response.rows[0]);
    } catch (error) {
        console.log(error.message);
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const response = await pool.query("DELETE FROM product WHERE id = $1 RETURNING *", [id]);
        res.json(response.rows[0]);
    } catch (error) {
        console.log(error.message);
    }
}

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_barang, harga, id_category, stok, image, image_2 } = req.body;

        if (!nama_barang || !harga || !id_category || stok === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const response = await pool.query(`
            UPDATE product 
            SET nama_barang = $1,
                harga = $2,
                id_category = $3,
                stok = $4,
                gambar = $5,
                gmbr = $6
            WHERE id = $7 
            RETURNING *`,
            [nama_barang, harga, id_category, stok, image, image_2, id]
        );

        if (response.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json(response.rows[0]);
    } catch (error) {
        console.error("Error updating product:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};