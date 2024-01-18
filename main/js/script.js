document.addEventListener("DOMContentLoaded", async function () {
  // Ambil data barang dari API
  const response = await fetch("http://localhost:3000/barang");
  const data = await response.json();
  const barangDropdown = document.getElementById("barang");

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  });

  data.forEach((barang) => {
    const option = document.createElement("option");
    option.value = barang.id_barang;
    const formattedHarga = formatter.format(barang.harga);

    option.text = `${barang.nama_barang} - ${formattedHarga}`;
    option.setAttribute("data-stok", barang.stok);
    option.setAttribute("data-harga", barang.harga);
    barangDropdown.add(option);
  });
});

let items = [];
let totalHargaSemuaItem = 0;
let totalQtySemuaItem = 0;
let diskonPersen = 0; // Set default diskon menjadi 0%
let uangBayar = 0; // Declare uangBayar variable

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});

function addItem() {
  const barangDropdown = document.getElementById("barang");
  const selectedBarangOption = barangDropdown.options[barangDropdown.selectedIndex];
  const selectedBarang = selectedBarangOption.text;
  const hargaSatuan = parseInt(selectedBarangOption.getAttribute("data-harga"));
  const qty = parseInt(document.getElementById("qty").value);
  const stok = parseInt(selectedBarangOption.getAttribute("data-stok"));

  if (qty > 0 && qty <= stok) {
    const harga = hargaSatuan * qty;

    const item = {
      id_barang: selectedBarangOption.value,
      nama: selectedBarang,
      qty: qty,
      total: harga,
    };

    items.push(item);
    totalHargaSemuaItem += harga; // Menambahkan harga item ke total
    totalQtySemuaItem += qty; // Menambahkan qty item ke total
    renderItems();
  } else {
    alert("Qty tidak valid atau melebihi stok barang");
  }
}

async function validateKaryawan() {
  const idKaryawan = document.getElementById("idKaryawan").value;

  if (idKaryawan) {
    const response = await fetch(`http://localhost:3001/karyawan?id=${idKaryawan}`);
    const data = await response.json();

    if (data.id) {
      alert("Karyawan valid. Diskon 20% diberikan.");
      diskonPersen = 20; // Memberikan diskon 20%
    } else {
      alert("Karyawan tidak valid atau tidak ditemukan. Diskon 0% diberikan.");
      diskonPersen = 0; // Memberikan diskon 0%
    }
    renderItems();
    updateTotalBelanja();
  } else {
    alert("ID Karyawan tidak boleh kosong. Diskon 0% diberikan.");
    diskonPersen = 0; // Memberikan diskon 0%
  }
}

function renderItems() {
  const tableBody = document.querySelector("#tabelBarang tbody");
  tableBody.innerHTML = "";

  items.forEach((item) => {
    const row = tableBody.insertRow();
    const cellNama = row.insertCell(0);
    const cellQty = row.insertCell(1);
    const cellHarga = row.insertCell(2);

    cellNama.innerHTML = item.nama;
    cellQty.innerHTML = item.qty;
    cellHarga.innerHTML = formatter.format(item.total);
  });

  const totalRow = tableBody.insertRow();
  const cellTotalNama = totalRow.insertCell(0);
  const cellTotalQty = totalRow.insertCell(1);
  const cellTotalHarga = totalRow.insertCell(2);

  cellTotalNama.innerHTML = "Total";
  cellTotalQty.innerHTML = totalQtySemuaItem;
  cellTotalHarga.innerHTML = formatter.format(totalHargaSemuaItem);

  updateTotalBelanja();
}

function updateTotalBelanja() {
  const diskon = (totalHargaSemuaItem * diskonPersen) / 100;

  const tableTransaksi = document.querySelector("#tabelTransaksi tbody");
  tableTransaksi.innerHTML = "";

  const totalBelanjaRow = tableTransaksi.insertRow();
  const cellTotalItem = totalBelanjaRow.insertCell(0);
  const cellDiskon = totalBelanjaRow.insertCell(1);
  const cellTotalBelanja = totalBelanjaRow.insertCell(2);
  const cellUangBayar = totalBelanjaRow.insertCell(3);
  const cellKembalian = totalBelanjaRow.insertCell(4);

  cellTotalItem.innerHTML = formatter.format(totalHargaSemuaItem);
  cellDiskon.innerHTML = formatter.format(diskon);
  cellTotalBelanja.innerHTML = formatter.format(totalHargaSemuaItem - diskon);
  cellUangBayar.innerHTML = formatter.format(uangBayar);
  cellKembalian.innerHTML = formatter.format(uangBayar - totalHargaSemuaItem + diskon);
}

function checkPayment() {
  const uangBayarInput = document.getElementById("bayar");
  uangBayar = parseInt(uangBayarInput.value.replace(/\D/g, ""));

  const diskon = (totalHargaSemuaItem * diskonPersen) / 100;

  if (uangBayar >= totalHargaSemuaItem - diskon) {
    renderItems();
  } else {
    alert("Uang bayar tidak mencukupi");
  }
}
function save() {
  const diskon = (totalHargaSemuaItem * diskonPersen) / 100;

  if (uangBayar >= totalHargaSemuaItem - diskon) {
    // Send the transaction data to the server
    const transactionData = {
      items: items,
      totalHargaSemuaItem: totalHargaSemuaItem,
      diskonPersen: diskonPersen,
      uangBayar: uangBayar,
    };

    fetch("http://localhost:3000/simpan-transaksi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Server response:", data);

        // Update the frontend with the saved transaction details
        const detailTransaksiTable = document.querySelector("#detailTransaksi tbody");
        detailTransaksiTable.innerHTML = "";

        data.items.forEach((item, index) => {
          const row = detailTransaksiTable.insertRow();
          const cellNama = row.insertCell(0);
          const cellQty = row.insertCell(1);
          const cellHarga = row.insertCell(2);
          const cellKembalian = row.insertCell(3);

          cellNama.innerHTML = item.nama;
          cellQty.innerHTML = item.qty;
          cellHarga.innerHTML = formatter.format(item.total);

          // Display Kembalian value only in the last row
          if (index === data.items.length - 1) {
            cellKembalian.innerHTML = formatter.format(data.kembalian);
          }
        });

        alert("Transaksi berhasil disimpan!");
      })
      .catch((error) => {
        console.error("Error saving transaction:", error);
        alert("Error saving transaction.");
      });
  } else {
    alert("Uang bayar tidak mencukupi. Transaksi tidak dapat disimpan.");
  }
}
