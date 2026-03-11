const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Buka database kamu
const db = new sqlite3.Database('./inventory.db');

db.serialize(() => {
  // Ambil semua nama tabel
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) return console.error(err.message);

    let sqlDump = "";

    tables.forEach((table) => {
      if (table.name === 'sqlite_sequence') return;

      // Generate query buat ambil data tiap tabel
      db.all(`SELECT * FROM ${table.name}`, (err, rows) => {
        if (err) return;
        
        rows.forEach(row => {
          const keys = Object.keys(row).join(', ');
          const values = Object.values(row).map(v => 
            typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
          ).join(', ');
          
          sqlDump += `INSERT INTO ${table.name} (${keys}) VALUES (${values});\n`;
        });
        
        // Simpan ke file setelah semua selesai
        fs.writeFileSync('data_migrasi.sql', sqlDump);
      });
    });
    console.log("✅ File data_migrasi.sql berhasil dibuat!");
  });
});

db.close();