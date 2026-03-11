function displayUnit(item: any): string {
  if (item.category !== 'PAINT') {
    return item.stock_unit || '-';
  }
  const vol = item.volume_per_can;
  if (vol != null && vol > 5) return 'Pail';
  return 'Kaleng';
}

export function stockTemplate(items: any[], generatedDate: string): string {
  const categories = ['STEEL', 'CYLINDER', 'PAINT'];

  const grouped: Record<string, any[]> = {};
  for (const cat of categories) {
    grouped[cat] = items.filter((item) => item.category === cat);
  }

  const lowStockItems = items.filter(
    (item) => item.current_stock > 0 && item.current_stock <= 3
  );

  const lowStockSection = lowStockItems.length > 0
    ? `
    <div class="low-stock">
      <div class="low-stock-title">LOW STOCK WARNING</div>
      <table>
        <colgroup>
          <col style="width:65%">
          <col style="width:15%">
          <col style="width:20%">
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th class="stock">Stock</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          ${lowStockItems.map((item) => `
          <tr>
            <td>${escapeHtml(String(item.name || '-'))}</td>
            <td class="stock">${Number(item.current_stock || 0)}</td>
            <td>${escapeHtml(displayUnit(item))}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`
    : '';

  const sections = categories
    .filter((cat) => grouped[cat].length > 0)
    .map((cat) => {
      const rows = grouped[cat]
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
    <div class="section-title">${escapeHtml(cat)}</div>
    <table>
      <colgroup>
        <col style="width:70%">
        <col style="width:15%">
        <col style="width:15%">
      </colgroup>
      <thead>
        <tr>
          <th>Name</th>
          <th class="stock">Stock</th>
          <th>Unit</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
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
      margin-bottom: 25px;
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
    .low-stock-title {
      font-weight: bold;
      font-size: 13px;
      margin-top: 10px;
      margin-bottom: 8px;
      color: #b00020;
    }
    .low-stock {
      border: 1px solid #e0e0e0;
      padding: 12px;
      margin-bottom: 30px;
      background: #fff8f8;
    }
    .section-title {
      margin-top: 35px;
      margin-bottom: 8px;
      font-weight: bold;
      letter-spacing: 0.5px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <h1>PT. NDS</h1>
  <h2>Final Stock Report</h2>
  <p class="report-date">Report Period: ${escapeHtml(generatedDate)}</p>

  ${lowStockSection}

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
