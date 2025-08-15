import { html } from '../../lib/html.js';

class BlogHeader extends HTMLElement {
    connectedCallback() {
        this.role = 'banner';
        const title = this.getAttribute('title') || 'Maksym Koval';
        const published = this.getAttribute('published');
        const updated = this.getAttribute('updated');
        const template = document.createElement('template');
        template.innerHTML = html`
            <h1>${title}</h1>
            <nav>
                <ol>
                    <li><a href="${import.meta.resolve('../../')}">Blog</a></li>
                    <li><a href="${import.meta.resolve('../../about')}">About</a></li>
                    <li>
                        <time datetime="${published}">
                            ${new Date(published).toLocaleDateString('en-US', { dateStyle: 'long' })}
                        </time>
                    </li>
                </ol>
                ${updated ? html`
                    <small>
                        Last updated:
                        <time datetime="${updated}">
                            ${new Date(updated).toLocaleDateString('en-US', { dateStyle: 'long' })}
                        </time>
                    </small>
                ` : ''}
            </nav>
        `;
        this.insertBefore(template.content, this.firstChild);
    }
}

export const registerBlogHeader = () => customElements.define('blog-header', BlogHeader);
