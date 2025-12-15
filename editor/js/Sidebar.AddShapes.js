// editor/js/Sidebar.AddShapes.js

import {
	Mesh,
	MeshStandardMaterial,
	DoubleSide,
	BoxGeometry,
	CircleGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	PlaneGeometry,
	RingGeometry,
	SphereGeometry,
	TorusGeometry,
	Color
} from 'three';

import { UIPanel, UIRow, UIText, UIColor } from './libs/ui.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';

function SidebarAddShapes( editor ) {

	const signals = editor.signals;
	const scene = editor.scene;

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

	function ensureUserData( object ) {

		object.userData = object.userData || {};

		// normalize to string (older builds might have stored other types)
		if ( typeof object.userData.veslColor !== 'string' ) object.userData.veslColor = '';

	}

	function colorToHexString( color ) {

		if ( !color || color.isColor !== true ) return '';
		return `#${ color.getHexString() }`;

	}

	// =====================================================
	// Strategy A: FORCE FLAT COLOR MODE (no textures / no vertex colors)
	// This makes color picking predictable for GLBs and added shapes.
	// =====================================================

	function forceFlatColorMode( material ) {

		if ( !material || material.isMaterial !== true ) return;

		// Kill anything that can override the visible color
		if ( material.map ) material.map = null;
		if ( material.emissive ) material.emissive.set( 0x000000 );

		// GLB meshes sometimes use vertex colors (or baked color attributes)
		material.vertexColors = false;

		// Make it behave "matte-ish" in realistic mode
		if ( material.isMeshStandardMaterial || material.isMeshPhysicalMaterial ) {

			material.metalness = 0.0;
			material.roughness = 1.0;

			// Some imports look dark if envMapIntensity is high + no env
			if ( 'envMapIntensity' in material ) material.envMapIntensity = 0.0;

		}

		// Safer for thin meshes; if you hate this on GLBs, remove this line
		material.side = DoubleSide;

	}

	// =====================================================
	// GLB FIX: prevent shared material edits
	// If multiple meshes share the same material instance,
	// clone it on selection so edits affect ONLY the selected mesh.
	// =====================================================

	function countMaterialUsers( material ) {

		let count = 0;

		scene.traverse( ( obj ) => {

			if ( obj.isMesh !== true ) return;

			const mat = obj.material;

			if ( Array.isArray( mat ) ) {

				for ( const m of mat ) if ( m === material ) count++;

			} else {

				if ( mat === material ) count++;

			}

		} );

		return count;

	}

	function ensureUniqueMaterialsForObject( object ) {

		if ( !object || object.isMesh !== true ) return;

		const mat = object.material;
		if ( !mat ) return;

		// Multi-material
		if ( Array.isArray( mat ) ) {

			let changed = false;
			const next = mat.slice();

			for ( let i = 0; i < next.length; i++ ) {

				const m = next[ i ];
				if ( !m || !m.isMaterial ) continue;

				if ( countMaterialUsers( m ) > 1 ) {

					const cloned = m.clone();
					cloned.userData = { ...( m.userData || {} ), __veslCloned: true };
					next[ i ] = cloned;
					changed = true;

				}

			}

			if ( changed ) object.material = next;

			return;

		}

		// Single material
		if ( mat.isMaterial && countMaterialUsers( mat ) > 1 ) {

			const cloned = mat.clone();
			cloned.userData = { ...( mat.userData || {} ), __veslCloned: true };
			object.material = cloned;

		}

	}

	function getSelectedTarget() {

		const object = editor.selected;
		if ( !object || object.isMesh !== true ) return null;

		// IMPORTANT: clone shared materials before editing
		ensureUniqueMaterialsForObject( object );

		const mat = object.material;
		if ( !mat ) return null;

		if ( Array.isArray( mat ) ) {

			const materials = mat.filter( m => m && m.isMaterial );
			if ( materials.length === 0 ) return null;
			return { object, materials };

		}

		if ( mat && mat.isMaterial ) return { object, materials: [ mat ] };

		return null;

	}

	// =====================================================
	// Apply chosen color to selected mesh materials
	// Strategy A is enforced here.
	// =====================================================

	function applyColorToObject( object, materials, hex ) {

		ensureUserData( object );
		object.userData.veslColor = hex;

		const c = new Color( hex || DEFAULT_COLOR );

		for ( const m of materials ) {

			// Strategy A: force flat look
			forceFlatColorMode( m );

			// Apply color
			if ( m.color ) m.color.copy( c );

			m.needsUpdate = true;

		}

		// tell editor “this changed”
		if ( signals.materialChanged ) signals.materialChanged.dispatch( materials[ 0 ] );
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

		const m = new MeshStandardMaterial( {
			color: 0x000000,
			metalness: 0.0,
			roughness: 1.0,
			side: DoubleSide
		} );

		// Strategy A baseline
		forceFlatColorMode( m );

		return m;

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

			// default new shapes to black; UI will show it
			mesh.userData.veslColor = DEFAULT_COLOR;

			applyColorToObject( mesh, [ material ], mesh.userData.veslColor );

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

		const target = getSelectedTarget();
		if ( !target ) return;

		const { object, materials } = target;

		const hex = colorInput.getValue();

		applyColorToObject( object, materials, hex );
		syncSwatchToHex( hex );

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

			const target = getSelectedTarget();
			if ( !target ) return;

			const { object, materials } = target;

			setSelectedSwatchRow( swatch );

			suppressColorChange = true;
			colorInput.setValue( hex );
			suppressColorChange = false;

			applyColorToObject( object, materials, hex );

		} );

		swatchRow.add( swatch );
		swatchButtons.push( { hex, row: swatch } );

	} );

	// =====================================================
	// Sync on selection/change
	// - Reads the *current* material color from GLB (no overwriting)
	// - Clones shared materials before any edit
	// =====================================================

	let syncing = false;

	function syncUIFromSelection() {

		if ( syncing ) return;
		syncing = true;

		const target = getSelectedTarget();

		if ( !target ) {

			setSelectedSwatchRow( null );

			suppressColorChange = true;
			colorInput.setValue( DEFAULT_COLOR );
			suppressColorChange = false;

			syncing = false;
			return;

		}

		const { object, materials } = target;

		ensureUserData( object );

		// Read imported/current color from the first material that has one
		let currentHex = '';

		for ( const m of materials ) {

			if ( m && m.color && m.color.isColor ) {

				currentHex = colorToHexString( m.color );
				break;

			}

		}

		// If we have a real color from the mesh, use it for UI + store in userData
		// (IMPORTANT: do NOT applyColorToObject here — we don’t want selection to recolor anything)
		if ( currentHex ) object.userData.veslColor = currentHex;
		if ( !object.userData.veslColor ) object.userData.veslColor = DEFAULT_COLOR;

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
