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
          <td class="num">${liters.toFixed(2)}</td>
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
    h1, h2 {
      margin: 0;
      text-align: center;
    }
    h1 { font-size: 20px; }
    h2 { font-size: 16px; margin-bottom: 24px; }
    .info { margin-bottom: 20px; font-size: 12px; }
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
    .totals {
      margin-top: 20px;
      text-align: right;
      font-size: 12px;
      font-weight: bold;
      border-top: 2px solid #333;
      padding-top: 10px;
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
      font-size: 16px;
      text-align: center;
      margin-bottom: 16px;
    }
    .photos {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .photos img {
      width: 240px;
      border: 1px solid #ccc;
      padding: 4px;
    }
  </style>
</head>
<body>
  <h1>PT. NDS</h1>
  <h2>Laporan Penggunaan Cat</h2>

  <div class="info">
    Nama Kapal : ${escapeHtml(shipName)}<br>
    Tanggal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(generatedDate)}
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
    Total Liter &nbsp;&nbsp;: ${totalLiters.toFixed(2)}
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
