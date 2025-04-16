import pool from "../config/db.js";

// Endpoint untuk menyimpan kode acak sebagai bukti pemesanan
export const uploadBuktiPembayaran = async (req, res) => {
    try {
        const { id } = req.params; // ID pemesanan
        const { bukti_pemesanan } = req.body; // Kode acak dari frontend

        if (!bukti_pemesanan) {
            return res.status(400).json({ message: "Kode bukti pemesanan tidak ditemukan" });
        }

        const query = `
            UPDATE pemesanan
            SET bukti_pemesanan = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *;
        `;
        const response = await pool.query(query, [bukti_pemesanan, id]);

        if (response.rows.length === 0) {
            return res.status(404).json({ message: "Pemesanan tidak ditemukan" });
        }

        res.json(response.rows[0]);
    } catch (error) {
        console.error("Error saving bukti pemesanan:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Endpoint untuk mendapatkan riwayat pemesanan berdasarkan id_user
export const getHistoryById = async (req, res) => {
    try {
        const { id_user } = req.params;
        const query = `
            SELECT 
                p.id,
                p.id_user,
                p.id_barang,
                p.quantity,
                p.size,
                p.alamat,
                p.no_hp,
                p.payment_method,
                p.created_at,
                p.updated_at,
                p.total_harga,
                p.bukti_pemesanan,
                p.status, -- Sertakan kolom status
                pr.nama_barang AS name,
                pr.harga AS price,
                pr.gambar
            FROM pemesanan p
            LEFT JOIN product pr ON p.id_barang = pr.id
            WHERE p.id_user = $1
        `;
        const response = await pool.query(query, [id_user]);

        const history = response.rows.map(row => ({
            ...row,
            total_harga: row.total_harga ? Number(row.total_harga) : null,
            price: row.price ? Number(row.price) : null,
            created_at: row.created_at.toISOString(),
            updated_at: row.updated_at.toISOString(),
        }));

        res.json(history);
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Endpoint untuk mendapatkan semua riwayat pemesanan
export const getHistory = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*,
                p.bukti_pemesanan,
                p.status, -- Sertakan kolom status
                pr.nama_barang,
                pr.gambar,
                CAST(pr.harga * p.quantity AS NUMERIC) AS total_harga
            FROM pemesanan p
            JOIN product pr ON p.id_barang = pr.id
        `;
        const response = await pool.query(query);

        const history = response.rows.map(row => ({
            ...row,
            total_harga: Number(row.total_harga),
            created_at: row.created_at.toISOString(),
            updated_at: row.updated_at.toISOString(),
        }));

        res.json(history);
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Endpoint untuk menyetujui atau menolak pemesanan
// Endpoint untuk menyetujui atau menolak pemesanan
export const approvePemesanan = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { id } = req.params; // ID pemesanan
        const { status } = req.body; // Status: 'approved' atau 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Status tidak valid" });
        }

        // Ambil data pemesanan
        const pemesananQuery = `
            SELECT p.*, CAST(pr.harga * p.quantity AS NUMERIC) AS total_harga
            FROM pemesanan p
            JOIN product pr ON p.id_barang = pr.id
            WHERE p.id = $1
        `;
        const pemesananResult = await client.query(pemesananQuery, [id]);

        if (pemesananResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Pemesanan tidak ditemukan" });
        }

        const pemesanan = pemesananResult.rows[0];

        if (status === 'approved') {
            // Periksa stok produk
            const productQuery = `
                SELECT stok FROM product WHERE id = $1
            `;
            const productResult = await client.query(productQuery, [pemesanan.id_barang]);
            
            if (productResult.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({ message: "Produk tidak ditemukan" });
            }
            
            const currentStock = productResult.rows[0].stok;
            
            // Pastikan stok mencukupi
            if (currentStock < pemesanan.quantity) {
                await client.query("ROLLBACK");
                return res.status(400).json({ 
                    message: "Stok tidak mencukupi untuk memenuhi pesanan ini" 
                });
            }
            
            // Kurangi stok produk
            const updateStockQuery = `
                UPDATE product 
                SET stok = stok - $1 
                WHERE id = $2
                RETURNING *
            `;
            await client.query(updateStockQuery, [pemesanan.quantity, pemesanan.id_barang]);
            
            // Dapatkan UUID yang valid dari database users
            const userQuery = `
                SELECT id FROM users WHERE id::text = $1
            `;
            const userResult = await client.query(userQuery, [pemesanan.id_user]);
            
            if (userResult.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({ message: "User tidak ditemukan" });
            }
            
            const userId = userResult.rows[0].id;
            
            // Pindahkan ke detail_pemesanan
            const insertQuery = `
                INSERT INTO detail_pemesanan (
                    id_user, id_barang, quantity, size, alamat, no_hp, 
                    payment_method, total_harga, bukti_pemesanan, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *;
            `;
            const insertValues = [
                userId, // UUID dari tabel users
                pemesanan.id_barang,
                pemesanan.quantity,
                pemesanan.size,
                pemesanan.alamat,
                pemesanan.no_hp,
                pemesanan.payment_method,
                pemesanan.total_harga,
                pemesanan.bukti_pemesanan,
                pemesanan.created_at,
                pemesanan.updated_at,
            ];
            await client.query(insertQuery, insertValues);

            // Hapus dari pemesanan
            const deleteQuery = `
                DELETE FROM pemesanan WHERE id = $1
            `;
            await client.query(deleteQuery, [id]);

            await client.query("COMMIT");
            return res.json({ 
                message: "Pemesanan disetujui dan dipindahkan ke detail pemesanan. Stok produk telah dikurangi." 
            });
        } else {
            // Update status ke rejected
            const updateQuery = `
                UPDATE pemesanan
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *;
            `;
            const updateResult = await client.query(updateQuery, [status, id]);

            await client.query("COMMIT");
            return res.json({
                message: "Pemesanan ditolak",
                data: updateResult.rows[0],
            });
        }
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error approving pemesanan:", error);
        res.status(500).json({ message: "Internal Server Error" });
    } finally {
        client.release();
    }
};

// Endpoint untuk mendapatkan semua detail pemesanan yang disetujui
export const getDetailPemesanan = async (req, res) => {
    try {
        const query = `
            SELECT 
                dp.*,
                pr.nama_barang,
                pr.gambar
            FROM detail_pemesanan dp
            JOIN product pr ON dp.id_barang = pr.id
        `;
        const response = await pool.query(query);

        const detailPemesanan = response.rows.map(row => ({
            ...row,
            total_harga: Number(row.total_harga),
            created_at: row.created_at.toISOString(),
            updated_at: row.updated_at.toISOString(),
        }));

        res.json(detailPemesanan);
    } catch (error) {
        console.error("Error fetching detail pemesanan:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Endpoint untuk mendapatkan detail pemesanan berdasarkan id_user
export const getDetailPemesananById = async (req, res) => {
    try {
        const { id_user } = req.params;
        const query = `
            SELECT 
                dp.*,
                pr.nama_barang,
                pr.gambar
            FROM detail_pemesanan dp
            JOIN product pr ON dp.id_barang = pr.id
            WHERE dp.id_user = $1
        `;
        const response = await pool.query(query, [id_user]);

        const detailPemesanan = response.rows.map(row => ({
            ...row,
            total_harga: Number(row.total_harga),
            created_at: row.created_at.toISOString(),
            updated_at: row.updated_at.toISOString(),
        }));

        res.json(detailPemesanan);
    } catch (error) {
        console.error("Error fetching detail pemesanan:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};