import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to http://localhost:3001');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });

  console.log('Setting localStorage for a mock member...');
  await page.evaluate(() => {
    const mockUser = {
      "Member ID": "MOCK-123",
      Name: "Test Member",
      Email: "test@example.com",
      Role: "Member",
      chapterId: "12103853"
    };
    sessionStorage.setItem("rc_user_session", JSON.stringify(mockUser));
    localStorage.setItem("rc_user_session", JSON.stringify(mockUser));
  });

  console.log('Reloading page with session...');
  await page.reload({ waitUntil: 'networkidle0' });

  // Wait 3 seconds to see if it renders whitescreen
  await new Promise(r => setTimeout(r, 3000));
  
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('BODY HTML LENGTH:', bodyHTML.length);
  if (bodyHTML.includes('loading-spinner')) {
     console.log('Loading spinner found in HTML!');
  }
  if (bodyHTML.includes('Something went wrong')) {
     console.log('Error boundary triggered!');
  }

  // Also try typing into the login page directly just to be sure!
  console.log('Clearing storage and trying real login...');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle0' });
  
  try {
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'john@example.com');
    await page.type('input[type="password"]', '1234');
    await page.click('button[type="submit"]');
    
    await new Promise(r => setTimeout(r, 5000));
    const newHTML = await page.evaluate(() => document.body.innerHTML);
    if (newHTML.includes('loading-spinner')) {
       console.log('Loading spinner found after real login!');
    }
  } catch (e) {
    console.log("Could not do real login", e);
  }

  await browser.close();
})();
