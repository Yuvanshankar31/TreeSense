document.addEventListener("DOMContentLoaded", async function() {
    const result = await GreenPulse.fetchMonthlySeries({
        url: function(lat, lon) {
            return `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2025-01-01&end_date=2025-12-31&daily=precipitation_sum&timezone=auto`;
        },
        responseSection: 'daily',
        field: 'precipitation_sum',
        aggregation: 'sum',
        rounding: 'fixed1',
        fallback: [5.2, 8.4, 21.0, 45.3, 72.8, 64.2, 59.5, 88.0, 112.4, 158.2, 92.6, 22.4],
        errorMessage: "Failed to fetch live historical rainfall, using fallback."
    });
    GreenPulse.createWeatherChart({
        canvasId: 'mybarChart',
        chartType: 'bar',
        dataset: {
            label: 'Monthly Precipitation (mm)',
            data: result.values,
            backgroundColor: 'rgba(46, 196, 182, 0.65)',
            borderColor: '#1b4d3e',
            borderWidth: 2,
            borderRadius: 6
        },
        location: result.location,
        title: 'Rainfall / Precipitation in ',
        yTickSuffix: ' mm',
        yAxis: { beginAtZero: true }
    });
});