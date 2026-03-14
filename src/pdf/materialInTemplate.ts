export function materialInTemplate(
  data: any[],
  categoryDisplay: string,
  generatedDate: string
): string {
  const rows = data
    .map((row) => {
      const date = row.created_at
        ? new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';
      return `
        <tr>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(String(row.item_name || '-'))}</td>
          <td>${escapeHtml(String(row.category || '-'))}</td>
          <td class="num">${row.quantity ?? 0}</td>
          <td>${escapeHtml(String(row.stock_unit || '-'))}</td>
          <td>${escapeHtml(String(row.user_name || '-'))}</td>
          <td>${escapeHtml(String(row.notes || '-'))}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 50px;
      font-family: Arial, sans-serif;
      color: #222;
    }
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
    .divider {
      width: 60px;
      height: 2px;
      background: #000;
      margin: 8px auto;
    }
    .report-date {
      font-size: 11px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th, td {
      padding: 6px 8px;
    }
    th {
      text-align: left;
      border-bottom: 2px solid #333;
    }
    th.num, td.num {
      text-align: right;
    }
    tr:not(:last-child) td {
      border-bottom: 1px solid #eee;
    }
    tbody tr:nth-child(even) {
      background: #fafafa;
    }
    td:first-child {
      white-space: nowrap;
    }
    td:last-child {
      max-width: 200px;
      word-break: break-word;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 9px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">PT NDS</div>
    <div class="title">LAPORAN BARANG MASUK - ${escapeHtml(categoryDisplay)}</div>
    <div class="divider"></div>
    <div class="report-date">Generated: ${escapeHtml(generatedDate)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Item Name</th>
        <th>Category</th>
        <th class="num">Quantity</th>
        <th>Unit</th>
        <th>User</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    Dokumen ini dihasilkan otomatis oleh Sistem Inventaris PT. NDS<br>
    Dikembangkan oleh Rama<br>
    Tanggal cetak : ${escapeHtml(generatedDate)}
  </div>
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
