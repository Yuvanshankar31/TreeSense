document.addEventListener("DOMContentLoaded", async function() {
    const { lat, lon } = getSelectedCoordinates(11.0168, 76.9558);
    const storedLocation = localStorage.getItem('selectedLocation') || 'Selected Location';

    const ctx = document.getElementById('mybarChart').getContext('2d');
    
    // Default fallback monthly totals (Coimbatore historical typical)
    let monthlyPrecipitation = [5.2, 8.4, 21.0, 45.3, 72.8, 64.2, 59.5, 88.0, 112.4, 158.2, 92.6, 22.4];
    
    try {
        // Fetch real daily historical precipitation for the full year of 2025
        const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2025-01-01&end_date=2025-12-31&daily=precipitation_sum&timezone=auto`);
        const result = await response.json();
        
        if (result.daily && result.daily.precipitation_sum) {
            const times = result.daily.time;
            const values = result.daily.precipitation_sum;
            
            // Aggregate daily sums to monthly sums
            const aggregated = Array(12).fill(0);
            for (let i = 0; i < times.length; i++) {
                const date = new Date(times[i]);
                const month = date.getMonth(); // 0-11
                aggregated[month] += (values[i] || 0);
            }
            monthlyPrecipitation = aggregated.map(val => parseFloat(val.toFixed(1)));
        }
    } catch (err) {
        console.error("Failed to fetch live historical rainfall, using fallback.", err);
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Precipitation (mm)',
                data: monthlyPrecipitation,
                backgroundColor: 'rgba(46, 196, 182, 0.65)',
                borderColor: '#1b4d3e',
                borderWidth: 2,
                borderRadius: 6
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Rainfall / Precipitation in ' + storedLocation + ' (2025)',
                    font: {
                        size: 18,
                        family: "'Outfit', sans-serif",
                        weight: 'bold'
                    },
                    color: '#0f3425',
                    padding: 20
                },
                legend: {
                    labels: {
                        font: {
                            family: "'Plus Jakarta Sans', sans-serif"
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' mm';
                        }
                    }
                }
            }
        }
    });
});