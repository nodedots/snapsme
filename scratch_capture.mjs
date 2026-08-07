import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to a nice desktop size
  await page.setViewport({ width: 1440, height: 900 });

  // Go to the app. (Since /app.html is the entry, we can just go to /app)
  // Wait until network is idle so the data loads completely.
  await page.goto('http://localhost:3000/app', { waitUntil: 'networkidle0' });

  // Optional: We can hide the scrollbar or manipulate the DOM if we want a cleaner screenshot
  await page.evaluate(() => {
    document.body.style.overflow = 'hidden';
  });

  // Capture screenshot of the dashboard area, or just the full page
  // The app is a single page application, so full page is fine.
  await page.screenshot({ path: 'public/image/dashboard-snapshot.png' });

  await browser.close();
  console.log('Screenshot saved!');
})();
