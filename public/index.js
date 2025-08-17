import { registerCodeViewerComponent } from "./components/code-viewer/code-viewer.js";
import { registerTabPanelComponent } from "./components/tab-panel/tab-panel.js";
import { registerBlogLatestPosts } from "./blog/components/blog-latest-posts.js";
import { registerPreload } from "../components/preload/preload.js";

const app = async () => {
    registerBlogLatestPosts();
    registerCodeViewerComponent();
    registerTabPanelComponent();
    const { registerAnalyticsComponent } = await import("./components/analytics/analytics.js");
    registerAnalyticsComponent();
    registerPreload();
}

document.addEventListener('DOMContentLoaded', app);
