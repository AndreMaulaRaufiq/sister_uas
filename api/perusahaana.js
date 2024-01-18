const express = require("express");
const app = express();
const cors = require("cors");
const { Client } = require("pg");

const port = 3001;

const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "perusahaan_a",
  password: "",
  port: 5432,
});

db.connect()
  .then(() => console.log("Terhubung ke PostgreSQL"))
  .catch((err) => console.error("Koneksi ke PostgreSQL gagal: " + err.message));

app.use(express.json());
app.use(cors());

app.get("/karyawan", (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Parameter 'id' tidak ditemukan");
  }

  const sql = "SELECT * FROM karyawan WHERE id = $1";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).send("Gagal mencari karyawan");
    } else {
      if (result.rows.length > 0) {
        const karyawan = result.rows[0];
        return res.json({
          id: karyawan.id,
          nama: karyawan.nama,
          jabatan: karyawan.jabatan,
        });
      } else {
        alert("Karyawan tidak valid atau tidak ditemukan. Diskon 0% diberikan.");
        return res.status(404).send("Karyawan tidak ditemukan");
      }
    }
  });
});

app.listen(port, () => {
  console.log(`Server PERUSAHAAN A berjalan di http://localhost:${port}`);
});
