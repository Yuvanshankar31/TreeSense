import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * forest_health.html keeps its analysis logic in an inline <script>, so the
 * block is extracted and evaluated to expose it to the tests.
 */
function loadInlineScript() {
  const html = readFileSync(resolve(pageRoot, 'forest_health.html'), 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const source = blocks[blocks.length - 1];
  // eslint-disable-next-line no-new-func
  const evaluate = new Function(`${source}\nreturn { rgbToHsl, analyzeForestHealth };`);
  return evaluate();
}

const HEALTHY_GREEN = [40, 150, 60];
const STRESSED_YELLOW = [200, 180, 40];
const BARE_SOIL = [140, 90, 60];
const SHADOW = [10, 10, 10];

function renderPage() {
  document.body.innerHTML = `
    <input type="file" id="health-image-file" />
    <img id="orig-img" />
    <canvas id="health-mask-canvas"></canvas>
    <div id="pct-healthy"></div>
    <div id="pct-stressed"></div>
    <div id="pct-soil"></div>
    <div id="fhi-value"></div>
    <div id="fhi-fill"></div>
    <div id="recommendation-box" style="display: none;"></div>
    <div id="recommendation-text"></div>
  `;
}

/** Feeds the analyzer a synthetic 1-pixel-per-entry image. */
function stubImagePipeline(pixels) {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });

  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data })),
    putImageData: vi.fn(),
  };
  document.getElementById('health-mask-canvas').getContext = vi.fn(() => context);

  class FakeFileReader {
    readAsDataURL() {
      this.result = 'data:image/png;base64,stub';
      this.onloadend();
    }
  }
  vi.stubGlobal('FileReader', FakeFileReader);

  class FakeImage {
    constructor() {
      this.width = pixels.length;
      this.height = 1;
    }

    set src(value) {
      this._src = value;
      this.onload();
    }

    get src() {
      return this._src;
    }
  }
  vi.stubGlobal('Image', FakeImage);

  return context;
}

function selectFile() {
  const input = document.getElementById('health-image-file');
  Object.defineProperty(input, 'files', { value: [{ name: 'canopy.png' }], configurable: true });
}

describe('forest_health.html analysis', () => {
  let rgbToHsl;
  let analyzeForestHealth;

  beforeEach(() => {
    ({ rgbToHsl, analyzeForestHealth } = loadInlineScript());
    renderPage();
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('rgbToHsl', () => {
    it('maps greys to zero hue and saturation', () => {
      expect(rgbToHsl(0, 0, 0)).toEqual([0, 0, 0]);
      expect(rgbToHsl(255, 255, 255)).toEqual([0, 0, 100]);
      expect(rgbToHsl(128, 128, 128)).toEqual([0, 0, 50]);
    });

    it('maps the primaries onto the colour wheel', () => {
      expect(rgbToHsl(255, 0, 0)).toEqual([0, 100, 50]);
      expect(rgbToHsl(0, 255, 0)).toEqual([120, 100, 50]);
      expect(rgbToHsl(0, 0, 255)).toEqual([240, 100, 50]);
    });

    it('keeps hue on the magenta side of the wheel for blue-dominant mixes', () => {
      expect(rgbToHsl(128, 0, 255)[0]).toBe(270);
      expect(rgbToHsl(255, 0, 128)[0]).toBe(330);
    });

    it('halves saturation differently for light and dark tones', () => {
      expect(rgbToHsl(255, 200, 200)).toEqual([0, 100, 89]);
      expect(rgbToHsl(60, 20, 20)).toEqual([0, 50, 16]);
    });
  });

  describe('analyzeForestHealth', () => {
    it('asks for a file when none is selected', () => {
      analyzeForestHealth();

      expect(alert).toHaveBeenCalledWith('Please select a canopy image file to analyze.');
    });

    it('classifies healthy, stressed and bare pixels into percentages', () => {
      stubImagePipeline([HEALTHY_GREEN, HEALTHY_GREEN, STRESSED_YELLOW, BARE_SOIL]);
      selectFile();

      analyzeForestHealth();

      expect(document.getElementById('pct-healthy').textContent).toBe('50.0%');
      expect(document.getElementById('pct-stressed').textContent).toBe('25.0%');
      expect(document.getElementById('pct-soil').textContent).toBe('25.0%');
    });

    it('counts very dark pixels as soil or shade', () => {
      stubImagePipeline([SHADOW, SHADOW, HEALTHY_GREEN, HEALTHY_GREEN]);
      selectFile();

      analyzeForestHealth();

      expect(document.getElementById('pct-soil').textContent).toBe('50.0%');
    });

    it('weights stressed canopy at 45% of the FHI score', () => {
      stubImagePipeline([HEALTHY_GREEN, STRESSED_YELLOW]);
      selectFile();

      analyzeForestHealth();

      // 50% healthy + 0.45 * 50% stressed = 72.5, rounded to 73
      expect(document.getElementById('fhi-value').textContent).toBe('73');
    });

    it('paints the ring green and recommends monitoring for a healthy canopy', () => {
      stubImagePipeline([HEALTHY_GREEN, HEALTHY_GREEN, HEALTHY_GREEN, HEALTHY_GREEN]);
      selectFile();

      analyzeForestHealth();

      expect(document.getElementById('fhi-value').textContent).toBe('100');
      expect(document.getElementById('fhi-fill').style.stroke).toBe('#38b000');
      expect(document.getElementById('fhi-fill').style.strokeDashoffset).toBe('0');
      expect(document.getElementById('recommendation-text').textContent).toContain('Excellent ecosystem health');
      expect(document.getElementById('recommendation-box').style.display).toBe('block');
    });

    it('warns about moderate stress in the mid score band', () => {
      stubImagePipeline([HEALTHY_GREEN, STRESSED_YELLOW]);
      selectFile();

      analyzeForestHealth();

      expect(document.getElementById('fhi-fill').style.stroke).toBe('#f7b23b');
      expect(document.getElementById('recommendation-text').textContent).toContain('Moderate canopy stress');
    });

    it('raises a degradation alert when bare soil dominates', () => {
      stubImagePipeline([BARE_SOIL, BARE_SOIL, BARE_SOIL, HEALTHY_GREEN]);
      selectFile();

      analyzeForestHealth();

      expect(document.getElementById('fhi-value').textContent).toBe('25');
      expect(document.getElementById('fhi-fill').style.stroke).toBe('#e07a5f');
      expect(document.getElementById('recommendation-text').textContent).toContain('Low Forest Health index');
    });

    it('draws the recoloured classification mask back onto the canvas', () => {
      const context = stubImagePipeline([HEALTHY_GREEN, STRESSED_YELLOW, BARE_SOIL, SHADOW]);
      selectFile();

      analyzeForestHealth();

      expect(context.drawImage).toHaveBeenCalled();
      expect(context.putImageData).toHaveBeenCalledTimes(1);
      const masked = context.putImageData.mock.calls[0][0].data;
      expect([masked[0], masked[1], masked[2]]).toEqual([40, 180, 50]); // healthy green
      expect([masked[4], masked[5], masked[6]]).toEqual([245, 180, 30]); // stressed yellow
      expect([masked[8], masked[9], masked[10]]).toEqual([200, 80, 60]); // bare brown
      expect([masked[12], masked[13], masked[14]]).toEqual([120, 90, 80]); // shadow grey
      expect(document.getElementById('orig-img').src).toBe('data:image/png;base64,stub');
    });
  });
});
