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