import { UIPanel, UIRow, UIText, UIButton } from './libs/ui.js';

function SidebarTools( editor ) {

	const signals = editor.signals;

	const container = new UIPanel();
	container.setClass( 'Panel' );

	// Title
	const titleRow = new UIRow();
	const title = new UIText( 'TOOLS' );
	title.setClass( 'title' );
	titleRow.add( title );
	container.add( titleRow );

	// Helper text
	const hintRow = new UIRow();
	const hint = new UIText( 'Select an object to enable tools.' );
	hint.dom.style.opacity = '0.7';
	hint.dom.style.fontSize = '12px';
	hintRow.add( hint );
	container.add( hintRow );

	function makeToolButton( label, mode ) {

		const row = new UIRow();

		const btn = new UIButton( label );
		btn.setWidth( '100%' );

		btn.onClick( function () {
			if ( btn.dom.classList.contains( 'disabled' ) ) return;
			signals.transformModeChanged.dispatch( mode );
		} );

		row.add( btn );
		container.add( row );

		return btn;

	}

	const btnMove = makeToolButton( 'Move', 'translate' );
	const btnRotate = makeToolButton( 'Rotate', 'rotate' );
	const btnResize = makeToolButton( 'Resize', 'scale' );

	const buttons = [ btnMove, btnRotate, btnResize ];

	// ----------------------------------
	// Enable / Disable helpers
	// ----------------------------------

	function setEnabled( enabled ) {

		buttons.forEach( btn => {

			btn.dom.classList.toggle( 'disabled', !enabled );
			btn.dom.style.opacity = enabled ? '1' : '0.45';
			btn.dom.style.pointerEvents = enabled ? 'auto' : 'none';

		} );

		hint.setValue(
			enabled
				? 'Choose a tool to move, rotate, or resize.'
				: 'Select an object to enable tools.'
		);

	}

	// Start disabled
	setEnabled( false );

	// Enable when an object is selected
	signals.objectSelected.add( function ( object ) {

		if ( object ) {
			setEnabled( true );
			signals.transformModeChanged.dispatch( 'translate' );
		}

	} );

	// Disable when selection is cleared
	signals.objectFocused.add( function ( object ) {

		if ( object === null || object === undefined ) {
			setEnabled( false );
		}

	} );

	// Keep UI in sync with transform mode
	signals.transformModeChanged.add( function ( mode ) {

		btnMove.dom.classList.remove( 'selected' );
		btnRotate.dom.classList.remove( 'selected' );
		btnResize.dom.classList.remove( 'selected' );

		if ( mode === 'translate' ) btnMove.dom.classList.add( 'selected' );
		if ( mode === 'rotate' ) btnRotate.dom.classList.add( 'selected' );
		if ( mode === 'scale' ) btnResize.dom.classList.add( 'selected' );

	} );

	return container;

}

export { SidebarTools };
