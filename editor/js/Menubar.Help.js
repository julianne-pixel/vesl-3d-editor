import { UIPanel, UIRow } from './libs/ui.js';

function MenubarHelp( editor ) {

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( 'Help' );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// Get Help -> mailto
	const getHelp = new UIRow();
	getHelp.setClass( 'option' );
	getHelp.setTextContent( 'Get Help' );
	getHelp.onClick( function () {
		window.location.href = 'mailto:support@thenotwork.org';
	} );
	options.add( getHelp );

	// Learn -> thenotwork.org (for now)
	const learn = new UIRow();
	learn.setClass( 'option' );
	learn.setTextContent( 'Learn' );
	learn.onClick( function () {
		window.open( 'https://thenotwork.org/learning/introduction-to-digital-modeling-design', '_blank' );
	} );
	options.add( learn );

	return container;

}

export { MenubarHelp };
