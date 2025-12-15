import { SidebarAddShapes } from './Sidebar.AddShapes.js';
import { UITabbedPanel } from './libs/ui.js';

function Sidebar( editor ) {

	const container = new UITabbedPanel();
	container.setId( 'sidebar' );

	const addShapes = new SidebarAddShapes( editor );
	container.addTab( 'shapes', 'Shapes', addShapes );
	container.select( 'shapes' );

	// Keep layout healthy: when sidebar resizes, tell the editor to resize
	// (prevents blank/zero-sized viewport issues in some forks)
	const ro = new ResizeObserver( function () {

		// Some forks expose editor.signals.windowResized; some expose editor.signals.resize
		if ( editor.signals && editor.signals.windowResized ) {
			editor.signals.windowResized.dispatch();
		} else if ( editor.signals && editor.signals.resize ) {
			editor.signals.resize.dispatch();
		}

	} );

	// Observe the actual sidebar DOM node
	ro.observe( container.dom );

	return container;

}

export { Sidebar };
