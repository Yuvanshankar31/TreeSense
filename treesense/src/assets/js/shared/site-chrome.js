(function (window, document) {
    const GreenPulse = window.GreenPulse = window.GreenPulse || {};

    const headerMarkup = `
<header class="site-header">
  <div class="container header-container">
    <a href="/index.html" class="logo-link">
      <img src="/images/treeicon.png" class="logo-image" alt="GreenPulse Imaging logo">
      <span class="logo-text">GreenPulse</span>
    </a>

    <!-- Desktop Navigation -->
    <nav>
      <ul class="nav-menu" id="nav-menu">
        <li><a href="/index.html" class="nav-link" data-page="home">Home</a></li>
        <li><a href="/predict.html" class="nav-link" data-page="dashboard">Dashboard</a></li>
        <li><a href="/chart.html" class="nav-link" data-page="charts">Historical Charts</a></li>
      </ul>
    </nav>

    <!-- Mobile Burger Icon -->
    <button class="mobile-menu-icon" id="mobile-menu-toggle" aria-label="Toggle Navigation">
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
    </button>
  </div>
</header>`;

    const footerMarkup = `
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>
          <img src="/images/treeicon.png" alt="Logo">
          GreenPulse Imaging
        </h3>
        <p>Advancing ecological monitoring and automated forestry analytics with machine learning and satellite intelligence.</p>
      </div>
      <div class="footer-links">
        <h4>Navigation</h4>
        <ul>
          <li><a href="/index.html">Home</a></li>
          <li><a href="/predict.html">Dashboard</a></li>
          <li><a href="/chart.html">Historical Charts</a></li>
        </ul>
      </div>
      <div class="footer-contact">
        <h4>Contact Us</h4>
        <p>📧 <a href="mailto:sksyuvanshankar@gamil.com">sksyuvanshankar@gamil.com</a></p>
        <p>📍 Coimbatore, India</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 GreenPulse Imaging. All rights reserved.</p>
      <p>Made with 💚 by Yuvan Shankar and Tharuna.</p>
    </div>
  </div>
</footer>`;

    function setActiveNavigation() {
        const path = window.location.pathname;
        const page = path === '/' || path === '/index.html'
            ? 'home'
            : path === '/predict.html' ? 'dashboard' : 'charts';
        const activeLink = document.querySelector('.nav-link[data-page="' + page + '"]');
        if (activeLink) activeLink.classList.add('active');
    }

    function inject() {
        const headerPlaceholder = document.getElementById('site-header-placeholder');
        const footerPlaceholder = document.getElementById('site-footer-placeholder');

        if (headerPlaceholder) headerPlaceholder.outerHTML = headerMarkup;
        if (footerPlaceholder) footerPlaceholder.outerHTML = footerMarkup;
        setActiveNavigation();
    }

    GreenPulse.injectSiteChrome = inject;
    inject();
})(window, document);
