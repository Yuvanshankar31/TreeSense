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