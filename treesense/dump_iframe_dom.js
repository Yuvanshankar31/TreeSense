const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');

async function run() {
  console.log('Starting Python server...');
  const server = spawn('python', ['-m', 'http.server', '3000'], {
    cwd: 'd:\\treesense-imaging-main\\treesense-imaging-main\\treesense',
    shell: true
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/predict.html', { waitUntil: 'networkidle2' });

  const iframeElement = await page.$('#model-iframe');
  const frame = await iframeElement.contentFrame();

  if (frame) {
    console.log('Frame loaded. Waiting for React App...');
    await new Promise(r => setTimeout(r, 6000)); // wait 6 seconds for model/react app

    const html = await frame.evaluate(() => document.body.innerHTML);
    console.log('--- Iframe body HTML ---');
    console.log(html);
  } else {
    console.log('Could not get contentFrame');
  }

  await browser.close();
  server.kill();
}

run().catch(console.error);
