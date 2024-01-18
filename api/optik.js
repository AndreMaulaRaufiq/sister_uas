const express = require("express");
const app = express();
const cors = require("cors");
const mysql = require("mysql2");
const { v4: uuidv4 } = require("uuid");

const port = 3000;

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // Isi dengan password MySQL Anda
  database: "optik_jaya_terang",
});

db.connect((err) => {
  if (err) {
    console.error("Koneksi ke MySQL gagal: " + err.message);
  } else {
    console.log("Terhubung ke MySQL");
  }
});

app.use(express.json());
app.use(cors());

app.get("/barang", (req, res) => {
  const sql = "SELECT * FROM barang";
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send("Gagal mendapatkan data barang");
    } else {
      const dataBarang = result.map((barang) => ({
        id_barang: barang.id_barang,
        nama_barang: barang.nama_barang,
        harga: barang.harga,
        stok: barang.stok,
      }));
      return res.json(dataBarang);
    }
  });
});

app.post("/simpan-transaksi", (req, res) => {
  const { items, totalHargaSemuaItem, diskonPersen, uangBayar } = req.body;

  const diskon = (totalHargaSemuaItem * diskonPersen) / 100;

  if (uangBayar < totalHargaSemuaItem - diskon) {
    return res.status(400).send("Uang bayar tidak mencukupi. Transaksi tidak dapat disimpan.");
  }

  const insertTransaksiSQL = "INSERT INTO transaksi (total_harga, diskon, uang_bayar) VALUES (?, ?, ?)";
  const transaksiParams = [totalHargaSemuaItem, diskon, uangBayar];

  db.query(insertTransaksiSQL, transaksiParams, (err, result) => {
    if (err) {
      console.error("Gagal menyimpan transaksi: " + err.message);
      return res.status(500).send("Gagal menyimpan transaksi.");
    }

    const transaksiId = result.insertId;

    const insertDetailSQL = "INSERT INTO detail_transaksi (id_transaksi, id_barang, nama_barang, qty, harga, kembalian) VALUES ?";
    const detailValues = items.map((item) => [transaksiId, item.id_barang, item.nama, item.qty, item.total, uangBayar - totalHargaSemuaItem + diskon]);

    db.query(insertDetailSQL, [detailValues], (err) => {
      if (err) {
        console.error("Gagal menyimpan detail transaksi: " + err.message);
        return res.status(500).send("Gagal menyimpan detail transaksi.");
      }

      // Update the stock in the barang table
      items.forEach((item) => {
        const updateStockSQL = "UPDATE barang SET stok = stok - ? WHERE id_barang = ?";
        const updateStockParams = [item.qty, item.id_barang];

        db.query(updateStockSQL, updateStockParams, (err) => {
          if (err) {
            console.error("Gagal mengupdate stok barang: " + err.message);
            return res.status(500).send("Gagal menyimpan transaksi (stok barang).");
          }
        });
      });

      // Fetch transaction details and return them in the response
      const fetchDetailSQL = "SELECT * FROM detail_transaksi WHERE id_transaksi = ?";
      db.query(fetchDetailSQL, [transaksiId], (err, detailResults) => {
        if (err) {
          console.error("Gagal mengambil detail transaksi: " + err.message);
          return res.status(500).send("Gagal menyimpan transaksi (detail transaksi).");
        }

        const transactionDetails = {
          transaksiId: transaksiId,
          items: detailResults.map((detail) => ({
            id_barang: detail.id_barang,
            nama: detail.nama_barang,
            qty: detail.qty,
            total: detail.harga,
          })),
          kembalian: uangBayar - totalHargaSemuaItem + diskon,
        };

        return res.status(200).json(transactionDetails);
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server JAYA TERANG berjalan di http://localhost:${port}`);
});
