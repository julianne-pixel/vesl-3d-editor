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

	let isEnabled = false;

	function makeToolButton( icon, label, mode, keyHint ) {

		const row = new UIRow();

		// Create button with custom layout (left label + right shortcut)
		const btn = new UIButton( '' );
		btn.setWidth( '100%' );

		btn.dom.style.display = 'flex';
		btn.dom.style.alignItems = 'center';
		btn.dom.style.justifyContent = 'space-between';
		btn.dom.style.gap = '10px';

		const left = document.createElement( 'span' );
		left.textContent = `${icon}  ${label}`;
		left.style.display = 'inline-flex';
		left.style.alignItems = 'center';
		left.style.gap = '8px';

		const right = document.createElement( 'span' );
		right.textContent = keyHint ? keyHint : '';
		right.style.opacity = '0.6';
		right.style.fontSize = '12px';
		right.style.letterSpacing = '0.5px';

		btn.dom.appendChild( left );
		btn.dom.appendChild( right );

		btn.onClick( function () {

			if ( btn.dom.classList.contains( 'disabled' ) ) return;
			signals.transformModeChanged.dispatch( mode );

		} );

		row.add( btn );
		container.add( row );

		return btn;

	}

	// Icons are unicode so we don't need assets
	// Shortcuts match the common Three.js editor defaults: W/E/R
	const btnMove = makeToolButton( '⇄', 'Move', 'translate', 'W' );
	const btnRotate = makeToolButton( '⟳', 'Rotate', 'rotate', 'E' );
	const btnResize = makeToolButton( '⤢', 'Resize', 'scale', 'R' );

	const buttons = [ btnMove, btnRotate, btnResize ];

	function clearSelectedState() {

		btnMove.dom.classList.remove( 'selected' );
		btnRotate.dom.classList.remove( 'selected' );
		btnResize.dom.classList.remove( 'selected' );

	}

	function setHintForMode( mode ) {

		if ( !isEnabled ) {
			hint.setValue( 'Select an object to enable tools.' );
			return;
		}

		switch ( mode ) {

			case 'translate':
				hint.setValue( 'Move (W): drag the arrows to slide your object.' );
				break;

			case 'rotate':
				hint.setValue( 'Rotate (E): drag the rings to spin your object.' );
				break;

			case 'scale':
				hint.setValue( 'Resize (R): drag the boxes to make it bigger or smaller.' );
				break;

			default:
				hint.setValue( 'Choose a tool to move, rotate, or resize.' );
				break;

		}

	}

	function setEnabled( enabled ) {

		isEnabled = enabled;

		buttons.forEach( btn => {

			btn.dom.classList.toggle( 'disabled', !enabled );
			btn.dom.style.opacity = enabled ? '1' : '0.45';
			btn.dom.style.pointerEvents = enabled ? 'auto' : 'none';

		} );

		if ( enabled === false ) {
			clearSelectedState();
			setHintForMode();
		} else {
			hint.setValue( 'Choose a tool to move, rotate, or resize.' );
		}

	}

	// Start disabled
	setEnabled( false );

	// Selection changes (single source of truth)
	signals.objectSelected.add( function ( object ) {

		if ( object ) {

			setEnabled( true );

			// default to Move when something is selected
			signals.transformModeChanged.dispatch( 'translate' );

		} else {

			// deselected / cleared
			setEnabled( false );

		}

	} );

	// Keep UI in sync with transform mode
	signals.transformModeChanged.add( function ( mode ) {

		clearSelectedState();

		if ( mode === 'translate' ) btnMove.dom.classList.add( 'selected' );
		if ( mode === 'rotate' ) btnRotate.dom.classList.add( 'selected' );
		if ( mode === 'scale' ) btnResize.dom.classList.add( 'selected' );

		setHintForMode( mode );

	} );

	return container;

}

export { SidebarTools };
