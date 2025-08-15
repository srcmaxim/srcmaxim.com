import { render, screen, waitFor, expect, fireEvent } from './imports-test.js';

const renderTabPanel = () => {
    const div = document.createElement('div');
    div.innerHTML = `
        <x-tab-panel>
            <x-tab title="Tab 1" active>
                <p>Tab 1 content</p> 
            </x-tab>
            <x-tab title="Tab 2">
                <p>Tab 2 content</p>
            </x-tab>
        </x-tab-panel>
    `;
    render(div);
}

describe('tabpanel', () => {
    it("renders a tabpanel with active tab", async () => {
        // ARRANGE
        renderTabPanel();
    
        // ASSERT
        // active tab is selected
        const activeTab = await screen.findByRole('tab', { name: 'Tab 1', selected: true });
        expect(activeTab).to.not.be.undefined;
        // active tabpanel is visible
        const activePanel = screen.getByText(/Tab 1 content/);
        expect(activePanel).to.not.be.undefined;
        // not active tabpanel content is hidden
        const tab2 = screen.getByTitle('Tab 2');
        await waitFor(() => expect(tab2.offsetParent).to.be.null);
    });
    
    it("activates a different tab on click", async () => {
        // ARRANGE
        renderTabPanel();
        const tab2 = screen.getByTitle('Tab 2');
    
        // ASSERT
        // inactive tabpanel content is hidden
        await waitFor(() => expect(tab2.offsetParent).to.be.null);
        // find inactive tab button and click it
        const tab2Button = await screen.findByRole('tab', { name: 'Tab 2' });
        expect(tab2Button).not.to.be.undefined;
        fireEvent.click(tab2Button);
        // inactive tabpanel content is made visible
        await waitFor(() => expect(tab2.offsetParent).not.to.be.null);
    });
});
