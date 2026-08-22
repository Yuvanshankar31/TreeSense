(function (window) {
    const GreenPulse = window.GreenPulse = window.GreenPulse || {};

    GreenPulse.loadSelectedImage = function (inputId, noFileMessage) {
        return new Promise(function (resolve, reject) {
            const fileInput = document.getElementById(inputId);
            const file = fileInput && fileInput.files[0];

            if (!file) {
                alert(noFileMessage || "Please select a file first.");
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = function () {
                const image = new Image();
                image.onload = function () {
                    resolve({
                        image: image,
                        dataUrl: reader.result
                    });
                };
                image.onerror = reject;
                image.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    GreenPulse.drawImageToCanvas = function (image, canvas) {
        const targetCanvas = canvas || document.createElement('canvas');
        const ctx = targetCanvas.getContext('2d');

        targetCanvas.width = image.width;
        targetCanvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        return {
            canvas: targetCanvas,
            ctx: ctx,
            imageData: ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
        };
    };

    GreenPulse.applyGreenMask = function (imageData, width, height) {
        let canopyPixelCount = 0;
        let totalGreen = 0;

        for (let i = 1; i < imageData.data.length; i += 4) {
            totalGreen += imageData.data[i];
        }

        const meanGreen = totalGreen / (imageData.data.length / 4);
        for (let i = 0; i < imageData.data.length; i += 4) {
            let gray = imageData.data[i + 1] * 0.587;

            if (gray < meanGreen / 1.5) {
                gray = 0;
                canopyPixelCount++;
            } else {
                gray = 255;
            }

            imageData.data[i] = gray;
            imageData.data[i + 1] = gray;
            imageData.data[i + 2] = gray;
            imageData.data[i + 3] = 255;
        }

        const greenPercent = ((canopyPixelCount / (width * height)) * 100).toFixed(2);
        const idlePercent = (100 - greenPercent).toFixed(2);

        return {
            canopyPixelCount: canopyPixelCount,
            greenPercent: greenPercent,
            idlePercent: idlePercent
        };
    };
})(window);
