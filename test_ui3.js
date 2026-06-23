import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    sessionStorage.setItem("rc_user_session", JSON.stringify({"Member ID": "12345678", Name: "John Doe", Email: "john.doe@example.com", Role: "Member", chapterId: "12103853"}));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 6000));
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log(html);
  await browser.close();
})();
