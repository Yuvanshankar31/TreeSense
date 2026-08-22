(function (window) {
    const GreenPulse = window.GreenPulse = window.GreenPulse || {};

    GreenPulse.MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    GreenPulse.getSelectedLocation = function () {
        return {
            latitude: localStorage.getItem('selectedLatitude') || '11.0168',
            longitude: localStorage.getItem('selectedLongitude') || '76.9558',
            name: localStorage.getItem('selectedLocation') || 'Selected Location'
        };
    };

    GreenPulse.fetchMonthlySeries = async function (config) {
        let series = config.fallback.slice();
        const location = GreenPulse.getSelectedLocation();

        try {
            const url = config.url(location.latitude, location.longitude);
            const response = await fetch(url);
            const result = await response.json();
            const section = result[config.responseSection];

            if (section && section[config.field]) {
                const times = section.time;
                const values = section[config.field];
                const aggregatedSums = Array(12).fill(0);
                const aggregatedCounts = Array(12).fill(0);

                for (let i = 0; i < times.length; i++) {
                    const date = new Date(times[i]);
                    const month = date.getMonth();
                    aggregatedSums[month] += (values[i] || 0) * (config.valueScale || 1);
                    aggregatedCounts[month]++;
                }

                series = aggregatedSums.map((sum, index) => {
                    if (aggregatedCounts[index] === 0) return 0;
                    const value = config.aggregation === 'sum'
                        ? sum
                        : sum / aggregatedCounts[index];
                    return config.rounding === 'round'
                        ? Math.round(value)
                        : parseFloat(value.toFixed(1));
                });
            }
        } catch (err) {
            console.error(config.errorMessage, err);
        }

        return {
            values: series,
            location: location
        };
    };

    GreenPulse.createWeatherChart = function (config) {
        const location = config.location || GreenPulse.getSelectedLocation();
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: config.title + location.name + ' (2025)',
                    font: {
                        size: 18,
                        family: "'Outfit', sans-serif",
                        weight: 'bold'
                    },
                    color: '#0f3425',
                    padding: 20
                },
                legend: config.legend || {
                    labels: {
                        font: {
                            family: "'Plus Jakarta Sans', sans-serif"
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function (value) {
                            return value + config.yTickSuffix;
                        }
                    }
                }
            }
        };

        if (config.yAxis) {
            Object.keys(config.yAxis).forEach(function (key) {
                chartOptions.scales.y[key] = config.yAxis[key];
            });
        }

        new Chart(document.getElementById(config.canvasId).getContext('2d'), {
            type: config.chartType,
            data: {
                labels: GreenPulse.MONTH_LABELS,
                datasets: [config.dataset]
            },
            options: chartOptions
        });
    };
})(window);
