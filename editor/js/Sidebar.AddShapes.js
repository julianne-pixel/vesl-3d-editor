// editor/js/Sidebar.AddShapes.js

import {
	Mesh,
	MeshBasicMaterial,
	DoubleSide,
	BoxGeometry,
	CircleGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	PlaneGeometry,
	RingGeometry,
	SphereGeometry,
	TorusGeometry
} from 'three';

import { UIPanel, UIRow, UIText, UIColor } from './libs/ui.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';

function SidebarAddShapes( editor ) {

	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'sidebar-addshapes' );
	container.setClass( 'Panel' );

	// --- VESL selection styles (swatches only) ---
	const styleTag = document.createElement( 'style' );
	styleTag.textContent = `
		#sidebar-addshapes{ --vesl-accent:#00fd64; }

		#sidebar-addshapes .color-swatch{
			position:relative;
			border-radius:8px;
			outline:2px solid transparent;
		}
		#sidebar-addshapes .color-swatch.is-selected{
			outline:3px solid var(--vesl-accent);
			box-shadow: 0 0 0 2px rgba(0,253,100,0.30), 0 0 18px rgba(0,253,100,0.20);
		}
		#sidebar-addshapes .color-swatch.is-selected::after{
			content:"✓";
			position:absolute;
			top:-7px; right:-7px;
			width:18px; height:18px;
			border-radius:999px;
			display:grid; place-items:center;
			font-size:12px; font-weight:900;
			background:var(--vesl-accent);
			color:#000;
			box-shadow:0 6px 18px rgba(0,0,0,0.35);
		}
	`;
	container.dom.appendChild( styleTag );

	// =====================================================
	// Defaults
	// =====================================================

	const DEFAULT_COLOR = '#000000';

	function getMaterialsArray( object ) {

		if ( ! object || ! object.material ) return [];

		if ( Array.isArray( object.material ) ) {
			return object.material.filter( m => m && m.isMaterial );
		}

		return ( object.material && object.material.isMaterial ) ? [ object.material ] : [];

	}

	function getFirstMaterial( object ) {

		const mats = getMaterialsArray( object );
		return mats.length > 0 ? mats[ 0 ] : null;

	}

	// If GLB meshes share materials, editing one mesh changes others.
	// Clone materials per-object to make edits local to that mesh.
	function ensureUniqueMaterials( object ) {

		if ( ! object || ! object.material ) return;

		if ( Array.isArray( object.material ) ) {

			object.material = object.material.map( ( m ) => ( m && m.isMaterial ) ? m.clone() : m );
			return;

		}

		if ( object.material && object.material.isMaterial ) {

			object.material = object.material.clone();

		}

	}

	function ensureUserData( object ) {

		object.userData = object.userData || {};

		// If we've already stored a VESL color, keep it
		if ( typeof object.userData.veslColor === 'string' ) return;

		// Otherwise, initialize from imported material color (GLB)
		const m = getFirstMaterial( object );

		if ( m && m.color ) {

			object.userData.veslColor = '#' + m.color.getHexString();

		} else {

			object.userData.veslColor = DEFAULT_COLOR;

		}

	}

	function getSelected() {

		const object = editor.selected;
		if ( ! object ) return null;

		const materials = getMaterialsArray( object );
		if ( materials.length === 0 ) return null;

		return { object, materials };

	}

	function applyHexToMaterial( material, hex ) {

		if ( ! material || ! material.isMaterial ) return;

		if ( material.color ) material.color.set( hex );

		// strip anything that might hijack appearance
		if ( material.map ) material.map = null;
		if ( material.emissive ) material.emissive.set( 0x000000 );

		// keep consistent visibility for flat shapes
		if ( 'side' in material ) material.side = DoubleSide;

		// If you're using SOLID overrides elsewhere, this still keeps underlying material sane
		if ( 'transparent' in material ) material.transparent = false;
		if ( 'opacity' in material ) material.opacity = 1.0;
		if ( 'depthWrite' in material ) material.depthWrite = true;
		if ( 'depthTest' in material ) material.depthTest = true;

		material.needsUpdate = true;

	}

	function applyStateToSelection( object ) {

		ensureUserData( object );

		// CRITICAL: detach this mesh from any shared imported materials
		ensureUniqueMaterials( object );

		const mats = getMaterialsArray( object );
		const hex = object.userData.veslColor;

		for ( const m of mats ) applyHexToMaterial( m, hex );

		// Notify editor
		if ( signals.materialChanged ) signals.materialChanged.dispatch( mats[ 0 ] );
		signals.objectChanged.dispatch( object );

	}

	// =====================================================
	// 1. ADD SHAPE
	// =====================================================

	const addTitle = new UIPanel();
	addTitle.setClass( 'title' );
	addTitle.setTextContent( 'Add Shape' );
	container.add( addTitle );

	const addSection = new UIPanel();
	addSection.setClass( 'buttons' );
	container.add( addSection );

	function makeDefaultMaterial() {

		return new MeshBasicMaterial( {
			color: 0x000000,
			side: DoubleSide
		} );

	}

	function addShapeButton( label, createGeometry ) {

		const row = new UIRow();
		row.setClass( 'button' );
		row.setTextContent( label );

		row.onClick( function () {

			const geometry = createGeometry();
			const material = makeDefaultMaterial();

			const mesh = new Mesh( geometry, material );
			mesh.position.set( 0, 0.5, 0 );

			ensureUserData( mesh );
			mesh.userData.veslColor = DEFAULT_COLOR;

			applyStateToSelection( mesh );

			editor.execute( new AddObjectCommand( editor, mesh ) );
			editor.select( mesh );

		} );

		addSection.add( row );

	}

	addShapeButton( 'Box', () => new BoxGeometry( 1, 1, 1 ) );
	addShapeButton( 'Circle', () => new CircleGeometry( 1, 32 ) );
	addShapeButton( 'Cylinder', () => new CylinderGeometry( 1, 1, 1.5, 32 ) );
	addShapeButton( 'Dodecahedron', () => new DodecahedronGeometry( 1 ) );
	addShapeButton( 'Plane', () => new PlaneGeometry( 2, 2 ) );
	addShapeButton( 'Ring', () => new RingGeometry( 0.5, 1, 32 ) );
	addShapeButton( 'Sphere', () => new SphereGeometry( 1, 32, 32 ) );
	addShapeButton( 'Tube', () => new TorusGeometry( 1, 0.35, 16, 48 ) );

	// =====================================================
	// 2. STYLE (Color only)
	// =====================================================

	const separator = new UIRow();
	separator.setClass( 'separator' );
	container.add( separator );

	const styleTitle = new UIPanel();
	styleTitle.setClass( 'title' );
	styleTitle.setTextContent( 'Style' );
	container.add( styleTitle );

	const styleHint = new UIText( 'Select an object to edit its color.' );
	styleHint.setClass( 'section-label' );
	container.add( styleHint );

	// ---------- UI selection state ----------
	const swatchButtons = []; // { hex, row }
	let selectedSwatchRow = null;

	function setSelectedSwatchRow( row ) {

		if ( selectedSwatchRow ) selectedSwatchRow.dom.classList.remove( 'is-selected' );
		selectedSwatchRow = row;
		if ( selectedSwatchRow ) selectedSwatchRow.dom.classList.add( 'is-selected' );

	}

	function syncSwatchToHex( hex ) {

		const h = ( hex || '' ).toLowerCase();
		const match = swatchButtons.find( s => s.hex.toLowerCase() === h );
		setSelectedSwatchRow( match ? match.row : null );

	}

	// prevent programmatic setValue from firing onChange
	let suppressColorChange = false;

	// ---------- color UI ----------
	const colorsLabel = new UIText( 'Color' );
	colorsLabel.setClass( 'section-label' );
	container.add( colorsLabel );

	const swatchRow = new UIPanel();
	swatchRow.setClass( 'color-swatch-row' );
	container.add( swatchRow );

	const pickerRow = new UIRow();
	pickerRow.setClass( 'color-picker-row' );
	container.add( pickerRow );

	const pickerLabel = new UIText( 'Custom' );
	pickerLabel.setClass( 'label' );
	pickerRow.add( pickerLabel );

	const colorInput = new UIColor().setValue( DEFAULT_COLOR );
	colorInput.onChange( function () {

		if ( suppressColorChange ) return;

		const sel = getSelected();
		if ( ! sel ) return;

		const { object } = sel;

		ensureUserData( object );
		object.userData.veslColor = colorInput.getValue();

		applyStateToSelection( object );

	} );
	pickerRow.add( colorInput );

	const swatchColors = [
		'#ffffff', '#000000',
		'#f44336', '#e91e63',
		'#9c27b0', '#3f51b5',
		'#2196f3', '#4caf50',
		'#ffeb3b', '#ff9800',
		'#795548', '#9e9e9e'
	];

	swatchColors.forEach( hex => {

		const swatch = new UIRow();
		swatch.setClass( 'color-swatch' );
		swatch.dom.style.backgroundColor = hex;

		swatch.onClick( function () {

			const sel = getSelected();
			if ( ! sel ) return;

			const { object } = sel;

			ensureUserData( object );
			object.userData.veslColor = hex;

			setSelectedSwatchRow( swatch );

			suppressColorChange = true;
			colorInput.setValue( hex );
			suppressColorChange = false;

			applyStateToSelection( object );

		} );

		swatchRow.add( swatch );
		swatchButtons.push( { hex, row: swatch } );

	} );

	// =====================================================
	// Sync on selection/change
	// =====================================================

	let syncing = false;

	function syncUIFromSelection() {

		if ( syncing ) return;
		syncing = true;

		const sel = getSelected();

		if ( ! sel ) {

			setSelectedSwatchRow( null );
			syncing = false;
			return;

		}

		const { object } = sel;

		// IMPORTANT:
		// - initialize userData from imported material color (first time)
		// - clone materials so edits don't affect sibling meshes
		ensureUserData( object );
		ensureUniqueMaterials( object );

		// Keep material consistent with stored color
		applyStateToSelection( object );

		syncSwatchToHex( object.userData.veslColor );

		suppressColorChange = true;
		colorInput.setValue( object.userData.veslColor );
		suppressColorChange = false;

		syncing = false;

	}

	if ( signals.objectSelected ) signals.objectSelected.add( syncUIFromSelection );
	if ( signals.objectChanged ) signals.objectChanged.add( syncUIFromSelection );

	// init
	syncUIFromSelection();

	return container;

}

export { SidebarAddShapes };
