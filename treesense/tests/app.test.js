import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireDomReady, flushAsync, loadScript } from './helpers/loadScript.js';

const okPayload = {
  cod: 200,
  main: { temp: 27.5, humidity: 64 },
  weather: [{ description: 'scattered clouds' }],
};

describe('app.js weather lookup', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <input id="location" />
      <button id="get-weather">Get weather</button>
      <div id="weather" style="display: none;"><div id="current-weather"></div></div>
    `;
    vi.stubGlobal('alert', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await loadScript('app');
    fireDomReady();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('warns and skips the request when no location is entered', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    document.getElementById('get-weather').click();
    await flushAsync();

    expect(alert).toHaveBeenCalledWith('Please enter a location.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries OpenWeather with the entered location in metric units', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => okPayload });
    vi.stubGlobal('fetch', fetchMock);
    document.getElementById('location').value = 'Coimbatore';

    document.getElementById('get-weather').click();
    await flushAsync();

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('q=Coimbatore');
    expect(url).toContain('units=metric');
  });

  it('renders temperature, humidity and description and reveals the panel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => okPayload }));
    document.getElementById('location').value = 'Coimbatore';

    document.getElementById('get-weather').click();
    await flushAsync();

    const html = document.getElementById('current-weather').innerHTML;
    expect(html).toContain('27.5°C');
    expect(html).toContain('64%');
    expect(html).toContain('scattered clouds');
    expect(document.getElementById('weather').style.display).toBe('block');
  });

  it('alerts and leaves the panel hidden when the API rejects the location', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ cod: '404', message: 'city not found' }) }));
    document.getElementById('location').value = 'Nowhereville';

    document.getElementById('get-weather').click();
    await flushAsync();

    expect(alert).toHaveBeenCalledWith('Error fetching current weather data. Please check the location.');
    expect(document.getElementById('current-weather').innerHTML).toBe('');
    expect(document.getElementById('weather').style.display).toBe('none');
  });

  it('alerts when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    document.getElementById('location').value = 'Coimbatore';

    document.getElementById('get-weather').click();
    await flushAsync();

    expect(alert).toHaveBeenCalledWith('An error occurred while fetching weather data.');
  });
});
