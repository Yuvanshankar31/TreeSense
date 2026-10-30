import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireDomReady, flushAsync, loadScript } from './helpers/loadScript.js';

const FALLBACK = [5.2, 8.4, 21.0, 45.3, 72.8, 64.2, 59.5, 88.0, 112.4, 158.2, 92.6, 22.4];

let ChartMock;

function chartConfig() {
  return ChartMock.mock.calls[0][1];
}

function precipitationData() {
  return chartConfig().data.datasets[0].data;
}

async function runBarScript() {
  await loadScript('bar');
  fireDomReady();
  await flushAsync();
}

describe('bar.js rainfall chart', () => {
  beforeEach(() => {
    // jsdom has no canvas implementation, so stand in with a stubbed context.
    document.body.innerHTML = '<div id="mybarChart"></div>';
    document.getElementById('mybarChart').getContext = vi.fn(() => ({}));
    ChartMock = vi.fn();
    vi.stubGlobal('Chart', ChartMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('requests the archive for the stored coordinates', async () => {
    localStorage.setItem('selectedLatitude', '12.34');
    localStorage.setItem('selectedLongitude', '56.78');
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await runBarScript();

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('latitude=12.34');
    expect(url).toContain('longitude=56.78');
    expect(url).toContain('start_date=2025-01-01');
    expect(url).toContain('end_date=2025-12-31');
  });

  it('falls back to Coimbatore coordinates when none are stored', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await runBarScript();

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('latitude=11.0168');
    expect(url).toContain('longitude=76.9558');
  });

  it('aggregates daily precipitation into monthly totals rounded to one decimal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        daily: {
          time: ['2025-01-01', '2025-01-15', '2025-03-02', '2025-12-31'],
          precipitation_sum: [1.25, 2.5, 10, 4.06],
        },
      }),
    }));

    await runBarScript();

    const data = precipitationData();
    expect(data[0]).toBe(3.8); // 1.25 + 2.5 rounded
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(10);
    expect(data[11]).toBe(4.1); // 4.06 rounded
  });

  it('treats null daily readings as zero rainfall', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        daily: {
          time: ['2025-05-01', '2025-05-02'],
          precipitation_sum: [null, 3.4],
        },
      }),
    }));

    await runBarScript();

    expect(precipitationData()[4]).toBe(3.4);
  });

  it('keeps the hardcoded averages when the archive response has no daily block', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ error: true }) }));

    await runBarScript();

    expect(precipitationData()).toEqual(FALLBACK);
  });

  it('keeps the hardcoded averages and still draws the chart when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await runBarScript();

    expect(precipitationData()).toEqual(FALLBACK);
    expect(ChartMock).toHaveBeenCalledTimes(1);
  });

  it('labels the chart with the stored location name and monthly axis', async () => {
    localStorage.setItem('selectedLocation', 'Silent Valley');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({}) }));

    await runBarScript();

    const config = chartConfig();
    expect(config.type).toBe('bar');
    expect(config.data.labels).toHaveLength(12);
    expect(config.data.labels[0]).toBe('Jan');
    expect(config.options.plugins.title.text).toBe('Rainfall / Precipitation in Silent Valley (2025)');
  });

  it('formats y-axis ticks in millimetres', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({}) }));

    await runBarScript();

    const tickCallback = chartConfig().options.scales.y.ticks.callback;
    expect(tickCallback(40)).toBe('40 mm');
  });
});
