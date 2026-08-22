(function (window, document) {
    const GreenPulse = window.GreenPulse = window.GreenPulse || {};

    GreenPulse.wireLazyIframes = function (items) {
        document.addEventListener("DOMContentLoaded", function () {
            items.forEach(function (item) {
                const btn = document.getElementById(item.id);
                if (!btn) return;

                btn.addEventListener('click', function () {
                    items.forEach(function (current) {
                        const currentButton = document.getElementById(current.id);
                        if (currentButton) currentButton.classList.remove('active');
                    });
                    btn.classList.add('active');

                    items.forEach(function (current) {
                        const iframe = document.getElementById(current.iframeId);
                        if (!iframe) return;

                        if (current.id === item.id) {
                            if (!iframe.src || iframe.src === window.location.href || iframe.getAttribute('src') === '') {
                                iframe.src = current.src;
                            }
                            iframe.style.display = 'block';
                        } else {
                            iframe.style.display = 'none';
                        }
                    });
                });
            });
        });
    };

    GreenPulse.wireIframeTabs = function (items, iframeId) {
        document.addEventListener("DOMContentLoaded", function () {
            const iframe = document.getElementById(iframeId);
            items.forEach(function (item) {
                item.btn.addEventListener('click', function () {
                    iframe.src = item.src;
                    items.forEach(function (current) {
                        current.btn.classList.remove('active');
                    });
                    item.btn.classList.add('active');
                });
            });
        });
    };
})(window, document);
