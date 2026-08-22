function getSelectedCoordinates(defaultLatitude, defaultLongitude) {
  const storedLatitude = localStorage.getItem('selectedLatitude');
  const storedLongitude = localStorage.getItem('selectedLongitude');
  const parsedLatitude = parseFloat(storedLatitude);
  const parsedLongitude = parseFloat(storedLongitude);
  const latitude = storedLatitude && storedLatitude.trim() !== '' &&
    Number.isFinite(parsedLatitude) && Number.isFinite(Number(storedLatitude)) &&
    parsedLatitude >= -90 && parsedLatitude <= 90
    ? parsedLatitude
    : defaultLatitude;
  const longitude = storedLongitude && storedLongitude.trim() !== '' &&
    Number.isFinite(parsedLongitude) && Number.isFinite(Number(storedLongitude)) &&
    parsedLongitude >= -180 && parsedLongitude <= 180
    ? parsedLongitude
    : defaultLongitude;

  return { lat: latitude, lon: longitude };
}
