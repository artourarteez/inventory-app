import puppeteer from "puppeteer-core";

export async function generatePdf(html) {

  const isLinux = process.platform === "linux";

  const isProduction = process.env.NODE_ENV === "production";

  const browser = await puppeteer.launch({
    executablePath: isLinux
      ? "/usr/bin/chromium"
      : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0"
  });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  return pdf;
}