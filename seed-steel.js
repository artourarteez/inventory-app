import Database from "better-sqlite3";

const db = new Database("inventory.db");

const steels = [
  { id: "steel-plat-10-150x600", name: "Plat 10 150x600", unit: "lembar" },
  { id: "steel-plat-10-180x600", name: "Plat 10 180x600", unit: "lembar" },

  { id: "steel-plat-12-150x600", name: "Plat 12 150x600", unit: "lembar" },
  { id: "steel-plat-12-180x600", name: "Plat 12 180x600", unit: "lembar" },

  { id: "steel-siku-8", name: "Siku 8", unit: "batang" },
  { id: "steel-siku-10", name: "Siku 10", unit: "batang" },
  { id: "steel-siku-12", name: "Siku 12", unit: "batang" },

  { id: "steel-pipa-8", name: 'Pipa 8"', unit: "batang" },
  { id: "steel-pipa-6", name: 'Pipa 6"', unit: "batang" },
  { id: "steel-pipa-4", name: 'Pipa 4"', unit: "batang" },
  { id: "steel-pipa-2.5", name: 'Pipa 2.5"', unit: "batang" },

  { id: "steel-as-2", name: 'Besi AS 2"', unit: "batang" },

  { id: "steel-hbeam-15", name: "HBeam 15", unit: "batang" },
  { id: "steel-hbeam-20", name: "HBeam 20", unit: "batang" },

  { id: "steel-siku-press-40", name: "Siku Press 40", unit: "batang" },
  { id: "steel-siku-press-45", name: "Siku Press 45", unit: "batang" },
  { id: "steel-siku-press-50", name: "Siku Press 50", unit: "batang" }
];

const insert = db.prepare(`
INSERT OR IGNORE INTO items
(id, name, category, stock_unit, allow_direct_edit)
VALUES (?, ?, 'STEEL', ?, 0)
`);

const txn = db.transaction(() => {
  for (const item of steels) {
    insert.run(item.id, item.name, item.unit);
  }
});

txn();

console.log("✅ Steel master items seeded successfully");