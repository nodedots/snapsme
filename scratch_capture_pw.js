import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('HTTP ERROR:', response.status(), response.url());
    }
  });
  
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'domcontentloaded' });
  
  await page.waitForTimeout(5000);
  
  await page.evaluate(() => {
    document.body.style.overflow = 'hidden';
  });

  await page.screenshot({ path: 'public/image/dashboard-snapshot.png', fullPage: true });

  await browser.close();
  console.log('Playwright Screenshot saved using Edge!');
})();
