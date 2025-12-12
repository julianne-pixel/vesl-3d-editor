import { UIPanel, UIRow } from './libs/ui.js';

function MenubarEdit( editor ) {

	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/edit' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// Undo
	let option = new UIRow()
		.setClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/edit/undo' ) );

	option.onClick( function () {

		editor.undo();

	} );

	options.add( option );

	// Redo
	option = new UIRow()
		.setClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/edit/redo' ) );

	option.onClick( function () {

		editor.redo();

	} );

	options.add( option );

	// Duplicate Object
	option = new UIRow()
		.setClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/edit/clone' ) ); // existing i18n key

	option.onClick( function () {

		if ( editor.selected !== null ) editor.duplicate();

	} );

	options.add( option );

	// Delete Object
	option = new UIRow()
		.setClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/edit/delete' ) );

	option.onClick( function () {

		const object = editor.selected;

		if ( object === null ) return;

		if ( confirm( strings.getKey( 'menubar/edit/delete' ) + '?' ) ) {

			editor.removeObject( object );

		}

	} );

	options.add( option );

	return container;

}

export { MenubarEdit };
