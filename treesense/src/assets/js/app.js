console.log("Script is running!");

document.addEventListener('DOMContentLoaded', () => {
  const getWeatherButton = document.getElementById('get-weather');
  const locationInput = document.getElementById('location');
  const currentWeatherDiv = document.getElementById('current-weather');
  const weatherDiv = document.getElementById('weather');

  getWeatherButton.addEventListener('click', async () => {
    const location = locationInput.value;

    if (!location) {
      alert('Please enter a location.');
      return;
    }

    try {
      const geocodeResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
      const geocodeData = await geocodeResponse.json();

      if (!geocodeResponse.ok || !geocodeData.results || geocodeData.results.length === 0) {
        const reason = geocodeData.reason || `status ${geocodeResponse.status}`;
        alert(`Error looking up the location (${reason}). Please check the location.`);
        return;
      }

      const { latitude, longitude } = geocodeData.results[0];
      const currentWeatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`);
      const currentWeatherData = await currentWeatherResponse.json();

      console.log('Current Weather Data:', currentWeatherData);

      // Check if current weather data is valid
      if (!currentWeatherResponse.ok || !currentWeatherData.current) {
        const reason = currentWeatherData.reason || `status ${currentWeatherResponse.status}`;
        alert(`Error fetching current weather data (${reason}). Please check the location.`);
        return;
      }

      // Display current weather
      currentWeatherDiv.innerHTML = `
        <p>Temperature: ${currentWeatherData.current.temperature_2m}°C</p>
        <p>Humidity: ${currentWeatherData.current.relative_humidity_2m}%</p>
        <p>Weather: ${describeWeatherCode(currentWeatherData.current.weather_code)}</p>
      `;


      // Show weather information
      weatherDiv.style.display = 'block';
    } catch (error) {
      console.error(error);
      alert(`An error occurred while fetching weather data: ${error.message}`);
    }
  });
});