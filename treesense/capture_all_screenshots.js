const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function run() {
  const screenshotsDir = 'd:\\treesense-imaging-main\\treesense-imaging-main\\screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const sampleImage = 'd:\\treesense-imaging-main\\treesense-imaging-main\\Dataset\\test\\images\\bp_262118_4_174541_4_19_jpg.rf.83019ff6f2b13a182d37ac45375e012f.jpg';
  console.log('Using sample image:', sampleImage);

  console.log('Starting Python server on port 3000...');
  const server = spawn('python', ['-m', 'http.server', '3000'], {
    cwd: 'd:\\treesense-imaging-main\\treesense-imaging-main\\treesense',
    shell: true
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('Launching Chrome browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1300, height: 900 }
  });

  const page = await browser.newPage();

  // 1. Landing Page
  console.log('Navigating to Landing Page...');
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(screenshotsDir, 'landing_page.png') });
  console.log('Saved landing_page.png');

  // 2. Dashboard (Initial state)
  console.log('Navigating to Dashboard (Initial)...');
  await page.goto('http://localhost:3000/predict.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });
  console.log('Saved dashboard.png');

  // 3. Tree Count (Inference running)
  console.log('Running Tree Count Inference...');
  let iframeElement = await page.$('#model-iframe');
  let frame = await iframeElement.contentFrame();
  if (frame) {
    console.log('Waiting for Model to load inside iframe...');
    await new Promise(r => setTimeout(r, 6000)); // Wait for YOLOv8 model loading
    
    // Find the file input inside the iframe
    const fileInput = await frame.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(sampleImage);
      console.log('Image uploaded to Tree Count. Waiting for inference...');
      await new Promise(r => setTimeout(r, 6000)); // Wait for YOLOv8 inference to complete and draw boxes
      await page.screenshot({ path: path.join(screenshotsDir, 'tree_count.png') });
      console.log('Saved tree_count.png');
    } else {
      console.error('Tree Count input[type="file"] not found!');
    }
  } else {
    console.error('Iframe not loaded for Tree Count!');
  }

  // 4. Green Cover Estimator
  console.log('Processing Green Cover Estimator...');
  await page.click('#segmentation-button');
  await new Promise(r => setTimeout(r, 2000));
  iframeElement = await page.$('#model-iframe');
  frame = await iframeElement.contentFrame();
  if (frame) {
    const fileInput = await frame.$('#image-file');
    if (fileInput) {
      await fileInput.uploadFile(sampleImage);
      // Click Process Canopy Image button
      await frame.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const processBtn = buttons.find(b => b.innerText.includes('Process Canopy Image'));
        if (processBtn) processBtn.click();
      });
      await new Promise(r => setTimeout(r, 3000)); // Wait for processing
      await page.screenshot({ path: path.join(screenshotsDir, 'green_cover_estimator.png') });
      console.log('Saved green_cover_estimator.png');
    } else {
      console.error('Green Cover input file not found!');
    }
  }

  // 5. Optimal Pathing
  console.log('Processing Optimal Pathing...');
  await page.click('#path-button');
  await new Promise(r => setTimeout(r, 2000));
  iframeElement = await page.$('#model-iframe');
  frame = await iframeElement.contentFrame();
  if (frame) {
    const fileInput = await frame.$('#image-file');
    if (fileInput) {
      await fileInput.uploadFile(sampleImage);
      // Click Process Pathway Map button
      await frame.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const processBtn = buttons.find(b => b.innerText.includes('Process Pathway Map'));
        if (processBtn) processBtn.click();
      });
      await new Promise(r => setTimeout(r, 3000)); // Wait for path calculation
      await page.screenshot({ path: path.join(screenshotsDir, 'optimal_pathing.png') });
      console.log('Saved optimal_pathing.png');
    } else {
      console.error('Optimal Pathing input file not found!');
    }
  }

  // 6. Historical Data
  console.log('Processing Historical Data...');
  await page.click('#historical-button');
  await new Promise(r => setTimeout(r, 2000));
  iframeElement = await page.$('#model-iframe');
  frame = await iframeElement.contentFrame();
  if (frame) {
    // Fill in Coimbatore, IN and retrieve weather
    const locationInput = await frame.$('#location');
    if (locationInput) {
      // Clear and type
      await frame.evaluate(el => el.value = '', locationInput);
      await locationInput.type('Coimbatore, IN');
      await frame.click('#get-weather');
      await new Promise(r => setTimeout(r, 5000)); // Wait for API response and chart drawing
      await page.screenshot({ path: path.join(screenshotsDir, 'historical_data.png') });
      console.log('Saved historical_data.png');
    } else {
      console.error('Historical location input not found!');
    }
  }

  console.log('Closing browser and server...');
  await browser.close();
  server.kill();
  console.log('Done capturing all screenshots!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
