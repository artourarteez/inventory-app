export function paintUsageTemplate(
  data: any[],
  shipName: string,
  generatedDate: string,
  baseUrl: string = '',
  photos: string[] = []
): string {
  let totalCans = 0;
  let totalLiters = 0;

  const rows = data
    .map((row) => {
      const cans = Number(row.total_cans_used || 0);
      const liters = Number(row.total_liters_used || 0);
      totalCans += cans;
      totalLiters += liters;

      return `
        <tr>
          <td>${escapeHtml(String(row.item_name || '-'))}</td>
          <td class="num">${cans}</td>
          <td class="num">${liters.toFixed(2)} L</td>
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
    .info { margin-bottom: 20px; }
    .meta td {
      padding: 2px 6px 2px 0;
      font-size: 12px;
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
      max-width: 320px;
      word-break: break-word;
    }
    .totals {
      margin-top: 20px;
      font-size: 12px;
      font-weight: bold;
      border-top: 2px solid #333;
      padding-top: 10px;
      width: 200px;
      margin-left: auto;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 9px;
      color: #666;
    }
    .photo-section {
      margin-top: 40px;
      page-break-before: always;
    }
    .photo-section h3 {
      text-align: center;
      font-size: 16px;
      margin-bottom: 16px;
    }
    .photos {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .photos img {
      width: 48%;
      page-break-inside: avoid;
      border: 1px solid #ccc;
      padding: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">PT NDS</div>
    <div class="title">LAPORAN PENGGUNAAN CAT</div>
    <div class="divider"></div>
    <div class="report-date">Generated: ${escapeHtml(generatedDate)}</div>
  </div>

  <div class="info">
    <table class="meta">
      <tr>
        <td>Kapal</td>
        <td>: ${escapeHtml(shipName)}</td>
      </tr>
      <tr>
        <td>Tanggal</td>
        <td>: ${escapeHtml(generatedDate)}</td>
      </tr>
    </table>
  </div>

  <table>
    <thead>
      <tr>
        <th>Nama Cat</th>
        <th class="num">Total Kaleng</th>
        <th class="num">Total Liter</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    Total Kaleng : ${totalCans}<br>
    Total Liter &nbsp;&nbsp;: ${totalLiters.toFixed(2)} L
  </div>

  ${photos.length > 0 ? `
  <div class="photo-section">
    <h3>Lampiran Dokumentasi</h3>
    <div class="photos">
      ${photos.map((p) => `<img src="${escapeHtml(baseUrl + p)}" />`).join('\n      ')}
    </div>
  </div>` : ''}

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
