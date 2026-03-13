import puppeteer from "puppeteer-core";

export async function generatePdf(html: string) {
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath:
        process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/chromium",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });
    const page = await browser.newPage();
    await page.emulateMediaType('screen');

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true
    });
    return pdf;
  } catch (err) {
    console.error("PDF generation error:", err);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}