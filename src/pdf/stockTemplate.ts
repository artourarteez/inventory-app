const categoryLabels: Record<string, string> = {
  STEEL: 'BESI',
  CYLINDER: 'TABUNG',
  PAINT: 'CAT',
};

function displayUnit(item: any): string {
  if (item.category !== 'PAINT') {
    return item.stock_unit || '-';
  }
  const vol = item.volume_per_can;
  if (vol != null && vol > 5) return 'Pail';
  return 'Kaleng';
}

export function stockTemplate(
  grouped: Record<string, any[]>,
  generatedDate: string
): string {
  const categories = ['STEEL', 'CYLINDER', 'PAINT'] as const;

  const sections = categories
    .filter((cat) => grouped[cat] && grouped[cat].length > 0)
    .map((cat) => {
      const items = grouped[cat];
      const label = categoryLabels[cat] || cat;
      const itemCount = items.length;

      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const totalStock = items.reduce((sum, item) => sum + Number(item.current_stock || 0), 0);

      const rows = items
        .map(
          (item) => `
        <tr>
          <td>${escapeHtml(String(item.name || '-'))}</td>
          <td class="stock">${Number(item.current_stock || 0)}</td>
          <td class="unit">${escapeHtml(displayUnit(item))}</td>
        </tr>`
        )
        .join('');

      return `
    <div class="section-title">${escapeHtml(label)}</div>
    <table>
      <colgroup>
        <col style="width:60%">
        <col style="width:20%">
        <col style="width:20%">
      </colgroup>
      <thead>
        <tr>
          <th>Item</th>
          <th class="stock">Stock</th>
          <th>Unit</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="subtotal">Jumlah Jenis ${escapeHtml(label)}: ${itemCount} item &nbsp;|&nbsp; Total Stok ${escapeHtml(label)}: ${totalStock}</div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 50px;
    font-size: 12px;
    color: #111;
    line-height: 1.4;
  }

  /* HEADER */

  .header {
    text-align: center;
    margin-bottom: 30px;
  }

  .company {
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .title {
    font-size: 14px;
    margin-top: 4px;
  }

  .header-divider {
    width: 60px;
    height: 2px;
    background: #000;
    margin: 8px auto;
  }

  .report-date {
    font-size: 11px;
    color: #666;
  }

  /* SECTION */

  .section {
    margin-top: 18px;
  }

  .section-title {
    font-weight: bold;
    font-size: 13px;
    letter-spacing: 0.6px;
    padding-bottom: 6px;
    border-bottom: 2px solid #000;
    margin-bottom: 8px;
    margin-top: 22px;
  }

  /* TABLE */

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 6px;
  }

  thead {
    background: #f3f3f3;
  }

  th {
    text-align: left;
    font-weight: 600;
    padding: 7px 6px;
    border-bottom: 1px solid #ccc;
  }

  td {
    padding: 6px;
    border-bottom: 1px solid #ddd;
  }

  tbody tr:nth-child(even) {
    background: #fafafa;
  }

  /* COLUMN ALIGNMENT */

  .stock {
    text-align: right;
    font-weight: 600;
  }

  .unit {
    text-transform: uppercase;
    color: #555;
  }

  /* SUBTOTAL */

  .subtotal {
    font-size: 11px;
    font-weight: bold;
    color: #333;
    margin-top: 4px;
    margin-bottom: 14px;
  }

  /* SYSTEM NOTE */

  .system-note {
    margin-top: 24px;
    padding: 10px 12px;
    border: 1px solid #e2e2e2;
    background: #fafafa;
    font-size: 11px;
    line-height: 1.5;
  }

  .system-note strong {
    color: #333;
  }

  /* FOOTER */

  .footer {
    margin-top: 40px;
    font-size: 10px;
    color: #777;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="company">PT NDS</div>
    <div class="title">LAPORAN STOK GUDANG</div>
    <div class="header-divider"></div>
    <div class="report-date">Generated: ${escapeHtml(generatedDate)}</div>
  </div>

  ${sections}

  <div class="system-note">
    <strong>⚠ Catatan Sistem</strong><br>
    Selisih data mungkin terjadi.
    Petugas diharapkan melakukan stok opname rutin untuk validasi data sistem.
  </div>

  <div class="footer"> ©2026 PT NDS Inventory. Automated by Rama.</div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
