import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  
  // Create a mock user in Firebase users collection so we can login with it!
  // Wait, we can't easily write to Firebase from here unless we use the same mocked LocalStorage.
  // We can inject a mock user into `rc_users` or wait, IS_MOCK_MODE reads from `users` collection!
  // Wait, in IS_MOCK_MODE, `api.login` queries `users` collection in Firebase. 
  // It is NOT local storage!
  // But Admin login has a hardcoded bypass! "admin@rotary.org"
  // Does Member login have a hardcoded bypass? NO!
  
  console.log("We need to simulate a login. Let's do it by directly calling api.login?");
  await browser.close();
})();
