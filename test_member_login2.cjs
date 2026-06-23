const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
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
  
  const content = await page.content();
  console.log("HTML:", content.substring(0, 1000));
  
  await browser.close();
})();
