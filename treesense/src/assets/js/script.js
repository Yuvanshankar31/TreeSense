// ==========================================================================
// GreenPulse Core Scripts & Global Location Services
// ==========================================================================

// Global GreenPulse Live Location Service
window.GreenPulseLocation = {
    // Format coordinates to readable string e.g. 11.0168° N, 76.9558° E
    formatCoords(lat, lon) {
        const numLat = parseFloat(lat) || 0;
        const numLon = parseFloat(lon) || 0;
        const latDir = numLat >= 0 ? "N" : "S";
        const lonDir = numLon >= 0 ? "E" : "W";
        return `${Math.abs(numLat).toFixed(4)}° ${latDir}, ${Math.abs(numLon).toFixed(4)}° ${lonDir}`;
    },

    // Get current stored location or fallback
    getStored() {
        return {
            lat: localStorage.getItem('selectedLatitude') || '11.0168',
            lon: localStorage.getItem('selectedLongitude') || '76.9558',
            label: localStorage.getItem('selectedLocation') || 'Coimbatore Forest Reserve'
        };
    },

    // Save location to localStorage and trigger custom event
    save(lat, lon, label) {
        localStorage.setItem('selectedLatitude', lat.toString());
        localStorage.setItem('selectedLongitude', lon.toString());
        localStorage.setItem('selectedLocation', label);
        window.dispatchEvent(new CustomEvent('greenpulse-location-changed', {
            detail: { lat, lon, label }
        }));
    },

    // Retrieve Live Location with automatic fallback to high-reliability IP geolocation
    async retrieveLiveLocation() {
        // Strategy 1: Browser GPS
        if (navigator.geolocation) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 5000,
                        enableHighAccuracy: true
                    });
                });
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                try {
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                    const data = await res.json();
                    const city = data.city || data.locality || data.principalSubdivision || "Current Location";
                    const country = data.countryName || "";
                    const label = `${city}, ${country}`.replace(/^, |, $/, "");
                    this.save(lat.toFixed(4), lon.toFixed(4), label);
                    return { lat: lat.toFixed(4), lon: lon.toFixed(4), label, source: "GPS" };
                } catch (e) {
                    const label = `Live GPS (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
                    this.save(lat.toFixed(4), lon.toFixed(4), label);
                    return { lat: lat.toFixed(4), lon: lon.toFixed(4), label, source: "GPS" };
                }
            } catch (gpsError) {
                console.warn("Browser GPS unavailable or denied, falling back to IP Geolocation:", gpsError);
            }
        }

        // Strategy 2: IP-based Geolocation fallback (guaranteed to work instantly without permission popups)
        try {
            const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client");
            const data = await res.json();
            const lat = (parseFloat(data.latitude) || 11.0168).toFixed(4);
            const lon = (parseFloat(data.longitude) || 76.9558).toFixed(4);
            const city = data.city || data.locality || data.principalSubdivision || "Coimbatore";
            const country = data.countryName || "India";
            const label = `${city}, ${country}`;
            this.save(lat, lon, label);
            return { lat, lon, label, source: "IP Geolocation" };
        } catch (ipError) {
            console.error("IP Geolocation failed:", ipError);
            const fallback = { lat: "11.0168", lon: "76.9558", label: "Coimbatore, India", source: "Default" };
            this.save(fallback.lat, fallback.lon, fallback.label);
            return fallback;
        }
    },

    // Stitch satellite tiles for specified coordinates
    stitchSatelliteForCoords(lat, lon, callback, span = 0.0035) {
        const sw = { lat: lat - span, lng: lon - span };
        const ne = { lat: lat + span, lng: lon + span };
        const zoom = 16;

        function lon2tile(lon, z) {
            return Math.floor((lon + 180) / 360 * Math.pow(2, z));
        }
        function lat2tile(lat, z) {
            return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
        }
        function getTileFraction(lat, lon, z) {
            const x = (lon + 180) / 360 * Math.pow(2, z);
            const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z);
            return { x, y };
        }

        const xMin = lon2tile(sw.lng, zoom);
        const xMax = lon2tile(ne.lng, zoom);
        const yMin = lat2tile(ne.lat, zoom);
        const yMax = lat2tile(sw.lat, zoom);

        const cols = xMax - xMin + 1;
        const rows = yMax - yMin + 1;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cols * 256;
        tempCanvas.height = rows * 256;
        const tempCtx = tempCanvas.getContext('2d');

        let loadedCount = 0;
        const totalTiles = cols * rows;

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const tileX = xMin + c;
                const tileY = yMin + r;

                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;

                img.onload = () => {
                    tempCtx.drawImage(img, c * 256, r * 256);
                    loadedCount++;
                    if (loadedCount === totalTiles) cropAndReturn();
                };

                img.onerror = () => {
                    tempCtx.fillStyle = '#1b4d3e';
                    tempCtx.fillRect(c * 256, r * 256, 256, 256);
                    loadedCount++;
                    if (loadedCount === totalTiles) cropAndReturn();
                };
            }
        }

        function cropAndReturn() {
            const swFraction = getTileFraction(sw.lat, sw.lng, zoom);
            const neFraction = getTileFraction(ne.lat, ne.lng, zoom);

            const pixelXStart = (swFraction.x - xMin) * 256;
            const pixelXEnd = (neFraction.x - xMin) * 256;
            const pixelYStart = (neFraction.y - yMin) * 256;
            const pixelYEnd = (swFraction.y - yMin) * 256;

            const cropX = Math.min(pixelXStart, pixelXEnd);
            const cropY = Math.min(pixelYStart, pixelYEnd);
            const cropW = Math.abs(pixelXEnd - pixelXStart);
            const cropH = Math.abs(pixelYEnd - pixelYStart);

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = 640;
            finalCanvas.height = 640;
            const finalCtx = finalCanvas.getContext('2d');

            if (cropW > 0 && cropH > 0) {
                finalCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, 640, 640);
            } else {
                finalCtx.fillStyle = '#1b4d3e';
                finalCtx.fillRect(0, 0, 640, 640);
            }

            callback(finalCanvas);
        }
    }
};

// JavaScript code to toggle mobile menu visibility
document.addEventListener("DOMContentLoaded", () => {
    const mobileMenuIcon = document.getElementById('mobile-menu-toggle') || document.querySelector('.mobile-menu-icon');
    const navMenu = document.getElementById('nav-menu') || document.querySelector('.nav-menu');

    if (mobileMenuIcon && navMenu) {
        mobileMenuIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
            mobileMenuIcon.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !mobileMenuIcon.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuIcon.classList.remove('active');
            }
        });
    }
});