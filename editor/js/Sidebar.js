import { SidebarAddShapes } from './Sidebar.AddShapes.js';
import { UITabbedPanel } from './libs/ui.js';

function Sidebar( editor ) {

	// THIS is the real sidebar container
	const container = new UITabbedPanel();
	container.setId( 'sidebar' );

	// --- SHAPES ONLY ---
	const addShapes = new SidebarAddShapes( editor );
	container.addTab( 'shapes', 'Shapes', addShapes );

	// Default to Shapes
	container.select( 'shapes' );

	// (Optional) If you still need the resize observer for your shapes UI,
	// keep it; otherwise you can remove it.
	// Note: In your current file, this observer was only used to size
	// sidebarProperties.tabsDiv, which we're removing, so this is safe to omit.

	return container;

}

export { Sidebar };
