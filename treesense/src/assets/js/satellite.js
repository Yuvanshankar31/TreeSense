// ==========================================================================
// GreenPulse Satellite Imagery Service
// Provides live satellite imagery via ArcGIS World Imagery with high-res caching
// ==========================================================================

window.GreenPulseSatellite = {
  // Convert lat/lon to tile numbers
  lon2tile(lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  },
  lat2tile(lat, zoom) {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  },

  // Fetch satellite image for coordinates (lat, lon)
  // Uses ArcGIS MapServer export API with fallback to tile stitching and local sample
  async fetchLiveSatelliteImage(lat, lon, zoom = 16) {
    const numLat = parseFloat(lat) || 11.0168;
    const numLon = parseFloat(lon) || 76.9558;
    
    // Calculate bounding box approximately 800m x 800m around coordinate
    const delta = 0.0045; // ~500m span
    const minLon = (numLon - delta).toFixed(6);
    const minLat = (numLat - delta).toFixed(6);
    const maxLon = (numLon + delta).toFixed(6);
    const maxLat = (numLat + delta).toFixed(6);

    const exportUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLon},${minLat},${maxLon},${maxLat}&bboxSR=4326&imageSR=4326&size=640,640&format=png&f=image`;

    try {
      const img = await this.loadImageWithTimeout(exportUrl, 6000);
      return {
        img,
        dataUrl: exportUrl,
        source: 'ArcGIS Satellite HD',
        lat: numLat,
        lon: numLon
      };
    } catch (exportErr) {
      console.warn("Export API failed, trying satellite tile stitching...", exportErr);
    }

    // Fallback: Stitch 2x2 satellite tiles
    try {
      const stitched = await this.stitchTiles(numLat, numLon, zoom);
      return stitched;
    } catch (tileErr) {
      console.warn("Satellite tile stitching failed, using fallback image...", tileErr);
    }

    // Fallback to local default sample image
    const fallbackImg = await this.loadImageWithTimeout('/images/image.png', 5000);
    return {
      img: fallbackImg,
      dataUrl: '/images/image.png',
      source: 'Default Survey Sample',
      lat: numLat,
      lon: numLon
    };
  },

  stitchTiles(lat, lon, zoom = 16) {
    return new Promise((resolve, reject) => {
      const centerTileX = this.lon2tile(lon, zoom);
      const centerTileY = this.lat2tile(lat, zoom);

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      const tiles = [
        { x: centerTileX, y: centerTileY, dx: 0, dy: 0 },
        { x: centerTileX + 1, y: centerTileY, dx: 256, dy: 0 },
        { x: centerTileX, y: centerTileY + 1, dx: 0, dy: 256 },
        { x: centerTileX + 1, y: centerTileY + 1, dx: 256, dy: 256 }
      ];

      let loaded = 0;
      let failed = 0;
      const timer = setTimeout(() => {
        reject(new Error("Satellite tile loading timed out"));
      }, 7000);

      tiles.forEach(t => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          ctx.drawImage(img, t.dx, t.dy, 256, 256);
          loaded++;
          if (loaded + failed === tiles.length) {
            clearTimeout(timer);
            const dataUrl = canvas.toDataURL('image/png');
            const resultImg = new Image();
            resultImg.onload = () => {
              resolve({
                img: resultImg,
                dataUrl,
                canvas,
                source: 'ArcGIS Tiles',
                lat,
                lon
              });
            };
            resultImg.src = dataUrl;
          }
        };
        img.onerror = () => {
          failed++;
          ctx.fillStyle = '#1b4d3e';
          ctx.fillRect(t.dx, t.dy, 256, 256);
          if (loaded + failed === tiles.length) {
            clearTimeout(timer);
            if (loaded > 0) {
              const dataUrl = canvas.toDataURL('image/png');
              const resultImg = new Image();
              resultImg.onload = () => {
                resolve({
                  img: resultImg,
                  dataUrl,
                  canvas,
                  source: 'ArcGIS Tiles (Partial)',
                  lat,
                  lon
                });
              };
              resultImg.src = dataUrl;
            } else {
              reject(new Error("All satellite tiles failed to load"));
            }
          }
        };
        img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${t.y}/${t.x}`;
      });
    });
  },

  loadImageWithTimeout(url, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          reject(new Error(`Timeout loading image: ${url}`));
        }
      }, timeoutMs);

      img.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(img);
        }
      };
      img.onerror = (e) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          reject(e);
        }
      };
      img.src = url;
    });
  }
};

