const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');

async function run() {
  console.log('Starting serve...');
  const server = spawn('npx.cmd', ['serve', '-p', '3000'], {
    cwd: 'd:\\treesense-imaging-main\\treesense-imaging-main\\treesense',
    shell: true
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  
  // Go to predict.html
  await page.goto('http://localhost:3000/predict.html', { waitUntil: 'networkidle2' });
  console.log('--- Page Title ---');
  console.log(await page.title());

  console.log('--- Elements in Page ---');
  const buttons = await page.$$eval('button', el => el.map(x => ({ id: x.id, class: x.className, text: x.innerText })));
  console.log('Buttons:', buttons);

  const iframeSrc = await page.$eval('#model-iframe', el => el.src);
  console.log('Iframe src:', iframeSrc);

  // Switch to iframe context
  const frameElement = await page.$('#model-iframe');
  const frame = await frameElement.contentFrame();

  if (frame) {
    console.log('--- Elements inside Iframe ---');
    
    // Let's wait a bit for react app to render
    await new Promise(r => setTimeout(r, 1000));

    const inputs = await frame.$$eval('input', el => el.map(x => ({ id: x.id, type: x.type, name: x.name })));
    console.log('Inputs inside Iframe:', inputs);

    const ifrButtons = await frame.$$eval('button', el => el.map(x => ({ id: x.id, text: x.innerText })));
    console.log('Buttons inside Iframe:', ifrButtons);

    const text = await frame.evaluate(() => document.body.innerText);
    console.log('Iframe Text Content Length:', text.length);
    console.log('Iframe Text Content:', text.substring(0, 500));
  } else {
    console.log('Could not access iframe content frame.');
  }

  await browser.close();
  server.kill();
}

run().catch(console.error);
