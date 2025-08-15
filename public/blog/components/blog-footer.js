import { html } from '../../lib/html.js';

class BlogFooter extends HTMLElement {
    connectedCallback() {
        const blueskyUrl = this.getAttribute('bluesky-url');
        this.innerHTML = html`
            <footer>                             
                ${blueskyUrl ? 
                    html`<p style="text-align: center"><a href="${blueskyUrl}">Discuss on BlueSky</a></p>` : ''}
                <hr />
                <div class="contact">
                    Did I make a mistake? Please consider<a href="https://github.com/srcmaxim/srcmaxim.com">sending a pull request</a>
                </div> 
                <x-analytics></x-analytics>
            </footer>
        `;
    }
}

export const registerBlogFooter = () => customElements.define('blog-footer', BlogFooter);
