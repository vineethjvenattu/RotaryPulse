const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173');
  
  // Wait for 5 seconds splash screen
  console.log("Waiting for splash screen...");
  await new Promise(r => setTimeout(r, 6000));
  
  // We should be on Login page
  console.log("Clicking Member (Priya) bypass button...");
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Member (Priya)')) {
      await btn.click();
      break;
    }
  }
  
  console.log("Waiting 2 seconds after login...");
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.content();
  if (content.includes("Something went wrong")) {
    console.log("CRASH CAUGHT BY ERROR BOUNDARY!");
  } else if (!content.includes("Dashboard") && !content.includes("Members")) {
    console.log("WHITE SCREEN OR BLANK SCREEN DETECTED!");
  } else {
    console.log("NO CRASH. UI RENDERED NORMALLY.");
  }
  
  await browser.close();
})();
