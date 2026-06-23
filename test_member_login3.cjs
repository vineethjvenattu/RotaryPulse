const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4173');
  await new Promise(r => setTimeout(r, 6000));
  
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Member (Priya)')) {
      await btn.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  const html = await page.evaluate(() => document.body.innerText);
  console.log("INNER TEXT:");
  console.log(html);
  
  await browser.close();
})();
