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

      const rows = items
        .map(
          (item) => `
        <tr>
          <td>${escapeHtml(String(item.name || '-'))}</td>
          <td class="stock">${Number(item.current_stock || 0)}</td>
          <td>${escapeHtml(displayUnit(item))}</td>
        </tr>`
        )
        .join('');

      return `
    <div class="section-title">${escapeHtml(label)}</div>
    <table>
      <colgroup>
        <col style="width:70%">
        <col style="width:15%">
        <col style="width:15%">
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
    <div class="subtotal">Jumlah Jenis ${escapeHtml(label)}: ${itemCount} item</div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 50px;
      font-size: 12px;
      color: #111;
    }
    h1 {
      text-align: center;
      margin: 0;
    }
    h2 {
      text-align: center;
      margin: 0 0 20px 0;
    }
    .report-date {
      text-align: center;
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 10px;
    }
    th {
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #000;
      padding: 6px 4px;
    }
    td {
      padding: 6px 4px;
      border-bottom: 1px solid #eee;
    }
    .stock {
      text-align: center;
    }
    .section-title {
      margin-top: 35px;
      margin-bottom: 8px;
      font-weight: bold;
      letter-spacing: 0.5px;
      font-size: 13px;
    }
    .subtotal {
      font-weight: bold;
      margin-bottom: 25px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>PT NDS</h1>
  <h2>Laporan Stok Gudang</h2>
  <p class="report-date">Generated: ${escapeHtml(generatedDate)}</p>

  ${sections}
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
