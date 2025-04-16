import pool from "../config/db.js";

export const addToCart = async (req, res) => {
    try {
        let { id_user, id_barang, jumlah_barang } = req.body;

        // Validasi input
        if (!id_user || !id_barang) {
            return res.status(400).json({ error: "id_user dan id_barang tidak boleh kosong!" });
        }

        if (!jumlah_barang) {
            jumlah_barang = 1; // Default jumlah barang
        }

        // 1️⃣ Cek apakah produk sudah ada di keranjang user
        const checkQuery = `
            SELECT * FROM cart WHERE id_user = $1 AND id_barang = $2
        `;
        const existingCart = await pool.query(checkQuery, [id_user, id_barang]);

        let response;

        if (existingCart.rows.length > 0) {
            // 2️⃣ Jika produk sudah ada, update jumlah_barang
            const updateQuery = `
                UPDATE cart 
                SET jumlah_barang = jumlah_barang + $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id_user = $2 AND id_barang = $3 
                RETURNING *
            `;
            response = await pool.query(updateQuery, [jumlah_barang, id_user, id_barang]);
        } else {
            // 3️⃣ Jika produk belum ada, insert baru
            const insertQuery = `
                INSERT INTO cart (id_user, id_barang, jumlah_barang) 
                VALUES ($1, $2, $3) 
                RETURNING *
            `;
            response = await pool.query(insertQuery, [id_user, id_barang, jumlah_barang]);
        }

        // 4️⃣ Kirim respons ke client
        res.status(201).json({
            success: true,
            message: "Produk berhasil ditambahkan ke keranjang!",
            data: response.rows[0]
        });

    } catch (error) {
        console.error("Error menambahkan ke cart:", error.message);
        res.status(500).json({ error: "Terjadi kesalahan server!" });
    }
};

export const getCartData = async (req, res) => {
    try {
        const query = `
            SELECT 
                cart.id, 
                cart.id_user, 
                cart.id_barang, 
                cart.jumlah_barang, 
                cart.created_at, 
                cart.updated_at,
                product.nama_barang,
                product.harga,
                product.gambar,
                product.gmbr
            FROM cart
            INNER JOIN product ON cart.id_barang = product.id
        `;

        const response = await pool.query(query);
        res.json(response.rows);
    } catch (error) {
        console.error("Error fetching cart data:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


export const deleteCart = async (req, res) => {
    try {
        const { id_user, id_barang } = req.params;
        const response = await pool.query("DELETE FROM cart WHERE id_user = $1 AND id_barang = $2 RETURNING *", [id_user, id_barang]);
        
        if (response.rows.length === 0) {
            return res.status(404).json({ message: "Item tidak ditemukan di keranjang" });
        }
        
        res.json(response.rows[0]);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Server error" });
    }
}

export const editCart = async (req, res) => {
    try{
        const { id_user, id_barang } = req.params;
        const { jumlah_barang } = req.body;
        const response = await pool.query(
            "UPDATE cart SET jumlah_barang = $1 WHERE id_user = $2 AND id_barang = $3 RETURNING *", 
            [jumlah_barang, id_user, id_barang]
        );
        res.json(response.rows[0]);
    } catch(error){
        console.log(error.message);
        res.status(500).json({ error: error.message });
    }
}