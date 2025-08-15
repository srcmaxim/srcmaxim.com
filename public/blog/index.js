import { registerBlogFooter } from "./components/blog-footer.js";
import { registerBlogHeader } from "./components/blog-header.js";
import { registerCodeViewerComponent } from "../components/code-viewer/code-viewer.js";
import { registerTabPanelComponent } from "../components/tab-panel/tab-panel.js";

const app = async () => {
    registerBlogHeader();
    registerBlogFooter();
    registerCodeViewerComponent();
    registerTabPanelComponent();
    const { registerAnalyticsComponent } = await import("../components/analytics/analytics.js");
    registerAnalyticsComponent();
}

document.addEventListener('DOMContentLoaded', app);
