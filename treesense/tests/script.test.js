import { beforeEach, describe, expect, it } from 'vitest';
import { fireDomReady, loadScript } from './helpers/loadScript.js';

function renderNav() {
  document.body.innerHTML = `
    <div class="mobile-menu-icon" id="mobile-menu-toggle"></div>
    <ul class="nav-menu" id="nav-menu"><li><a href="#">Home</a></li></ul>
    <main id="outside">content</main>
  `;
}

describe('script.js mobile menu', () => {
  let toggle;
  let menu;

  beforeEach(async () => {
    renderNav();
    await loadScript('script');
    fireDomReady();
    toggle = document.getElementById('mobile-menu-toggle');
    menu = document.getElementById('nav-menu');
  });

  it('opens the menu on toggle click', () => {
    toggle.click();
    expect(menu.classList.contains('active')).toBe(true);
    expect(toggle.classList.contains('active')).toBe(true);
  });

  it('closes the menu on a second toggle click', () => {
    toggle.click();
    toggle.click();
    expect(menu.classList.contains('active')).toBe(false);
    expect(toggle.classList.contains('active')).toBe(false);
  });

  it('closes the menu when clicking outside of it', () => {
    toggle.click();
    document.getElementById('outside').click();
    expect(menu.classList.contains('active')).toBe(false);
    expect(toggle.classList.contains('active')).toBe(false);
  });

  it('keeps the menu open when clicking inside it', () => {
    toggle.click();
    menu.querySelector('a').click();
    expect(menu.classList.contains('active')).toBe(true);
  });

  it('does nothing when the menu markup is absent', async () => {
    document.body.innerHTML = '<div id="empty"></div>';
    await loadScript('script');
    expect(() => fireDomReady()).not.toThrow();
  });
});
