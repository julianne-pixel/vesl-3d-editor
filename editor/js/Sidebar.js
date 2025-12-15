import { SidebarAddShapes } from './Sidebar.AddShapes.js';
import { UITabbedPanel } from './libs/ui.js';

function Sidebar( editor ) {

  const container = new UITabbedPanel();
  container.setId( 'sidebar' );

  const addShapes = new SidebarAddShapes( editor );
  container.addTab( 'shapes', 'Shapes', addShapes );
  container.select( 'shapes' );

  return container;
}

export { Sidebar };
