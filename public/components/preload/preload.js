import { html } from '../../lib/html.js';

class Preload extends HTMLElement {
    connectedCallback() {
        const href = this.getAttribute('href');
        this.innerHTML = html`
            <a href="${href}">${this.innerHTML}</a>
        `;
        this.style.display = 'contents';
        const anchor = this.querySelector('a');
        anchor.addEventListener('mouseover', () => this.addLink(anchor.href), { passive: true });
        anchor.addEventListener('touchstart', () => this.addLink(anchor.href), { passive: true });
    }

    addLink(href) {
        if (this.linkAdded) {
            return;
        }
        this.linkAdded = true;
        // Create a new <link rel="prefetch" href="/tip/hover-preloading"> element
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
    }
}

export const registerPreload = () => customElements.define('x-preload', Preload);