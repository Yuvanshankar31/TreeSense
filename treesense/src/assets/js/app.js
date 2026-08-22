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

      if (!geocodeData.results || geocodeData.results.length === 0) {
        alert('Error fetching current weather data. Please check the location.');
        return;
      }

      const { latitude, longitude } = geocodeData.results[0];
      const currentWeatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`);
      const currentWeatherData = await currentWeatherResponse.json();

      if (!currentWeatherResponse.ok || !currentWeatherData.current) {
        alert('Error fetching current weather data. Please check the location.');
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
      alert('An error occurred while fetching weather data.');
      console.error(error);
    }
  });
});