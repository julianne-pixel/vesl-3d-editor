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
		if ( typeof object.userData.veslColor !== 'string' ) object.userData.veslColor = DEFAULT_COLOR;

	}

	function colorToHexString( color ) {

		if ( !color || color.isColor !== true ) return DEFAULT_COLOR;
		return `#${color.getHexString()}`;

	}

	// =====================================================
	// Fix "editing one changes multiple":
	// GLBs often reuse the same material instance across meshes.
	// We clone shared materials on the selected object before editing.
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

			if ( changed ) {

				object.material = next;
				object.material.needsUpdate = true;

			}

			return;

		}

		if ( mat.isMaterial && countMaterialUsers( mat ) > 1 ) {

			const cloned = mat.clone();
			cloned.userData = { ...( mat.userData || {} ), __veslCloned: true };
			object.material = cloned;
			object.material.needsUpdate = true;

		}

	}

	// =====================================================
	// NEVER BLACK MODE:
	// Convert ANY material (GLB imported, Standard/Physical/etc.)
	// into MeshBasicMaterial so it renders with NO lighting.
	// =====================================================

	function toBasicMaterial( m ) {

		// already basic => keep (but we still force DoubleSide)
		if ( m && m.isMeshBasicMaterial ) {

			m.side = DoubleSide;
			m.needsUpdate = true;
			return m;

		}

		const color = ( m && m.color && m.color.isColor ) ? m.color.clone() : new Color( 0xffffff );
		const transparent = ( m && m.transparent === true ) || ( m && typeof m.opacity === 'number' && m.opacity < 1 );
		const opacity = ( m && typeof m.opacity === 'number' ) ? m.opacity : 1.0;

		const basic = new MeshBasicMaterial( {
			color,
			transparent,
			opacity,
			side: DoubleSide
		} );

		// keep name if helpful
		if ( m && m.name ) basic.name = m.name;

		// IMPORTANT: no maps/textures — flat color only
		basic.map = null;

		basic.needsUpdate = true;
		return basic;

	}

	function ensureBasicMaterialsForObject( object ) {

		if ( !object || object.isMesh !== true ) return;

		// clone shared first so conversions don't affect others
		ensureUniqueMaterialsForObject( object );

		const mat = object.material;
		if ( !mat ) return;

		if ( Array.isArray( mat ) ) {

			const next = mat.map( ( m ) => ( m && m.isMaterial ) ? toBasicMaterial( m ) : m );
			object.material = next;

		} else {

			if ( mat.isMaterial ) object.material = toBasicMaterial( mat );

		}

	}

	function ensureBasicMaterialsForAllMeshes() {

		scene.traverse( ( obj ) => {

			if ( obj.isMesh !== true ) return;
			ensureBasicMaterialsForObject( obj );

			// initialize veslColor from imported material color once
			ensureUserData( obj );
			let firstColor = null;

			const mat = obj.material;
			if ( Array.isArray( mat ) ) {

				for ( const m of mat ) {

					if ( m && m.color && m.color.isColor ) { firstColor = colorToHexString( m.color ); break; }

				}

			} else if ( mat && mat.color && mat.color.isColor ) {

				firstColor = colorToHexString( mat.color );

			}

			if ( firstColor && ( obj.userData.veslColor === DEFAULT_COLOR || !obj.userData.veslColor ) ) {

				obj.userData.veslColor = firstColor;

			}

		} );

	}

	function getSelectedTarget() {

		const object = editor.selected;
		if ( !object || object.isMesh !== true ) return null;

		// make sure selection is never-black + not shared
		ensureBasicMaterialsForObject( object );

		const mat = object.material;

		if ( Array.isArray( mat ) ) {

			const materials = mat.filter( m => m && m.isMaterial );
			if ( materials.length === 0 ) return null;
			return { object, materials };

		}

		if ( mat && mat.isMaterial ) return { object, materials: [ mat ] };

		return null;

	}

	// =====================================================
	// Apply color (flat, unlit)
	// =====================================================

	function applyColorToObject( object, materials, hex ) {

		ensureUserData( object );
		object.userData.veslColor = hex;

		const c = new Color( hex );

		for ( const m of materials ) {

			// force basic (safety)
			const basic = toBasicMaterial( m );
			basic.color.copy( c );
			basic.transparent = false;
			basic.opacity = 1.0;
			basic.side = DoubleSide;
			basic.needsUpdate = true;

		}

		// If object was multi-material, we need to re-assign the array to ensure
		// the new basic materials take effect if any were converted.
		if ( Array.isArray( object.material ) ) {

			object.material = object.material.map( m => ( m && m.isMaterial ) ? toBasicMaterial( m ) : m );

		} else if ( object.material && object.material.isMaterial ) {

			object.material = toBasicMaterial( object.material );
			object.material.color.copy( c );

		}

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

	let suppressColorChange = false;

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
	// - also enforces "never black" conversion for imports
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

		// Initialize veslColor from the (now basic) material if needed
		let importedHex = null;
		for ( const m of materials ) {

			if ( m && m.color && m.color.isColor ) { importedHex = colorToHexString( m.color ); break; }

		}

		if ( importedHex && ( object.userData.veslColor === DEFAULT_COLOR || !object.userData.veslColor ) ) {

			object.userData.veslColor = importedHex;

		}

		syncSwatchToHex( object.userData.veslColor );

		suppressColorChange = true;
		colorInput.setValue( object.userData.veslColor );
		suppressColorChange = false;

		syncing = false;

	}

	// When GLB loads, sceneGraphChanged fires — convert everything once.
	let didInitialConversion = false;

	if ( signals.sceneGraphChanged ) signals.sceneGraphChanged.add( function () {

		// Convert on every graph change, but avoid heavy repeats if you want.
		// Keeping it always-on is safest for "GLB only" workflows.
		ensureBasicMaterialsForAllMeshes();

		if ( didInitialConversion === false ) didInitialConversion = true;

	} );

	if ( signals.objectSelected ) signals.objectSelected.add( syncUIFromSelection );
	if ( signals.objectChanged ) signals.objectChanged.add( syncUIFromSelection );

	// init
	ensureBasicMaterialsForAllMeshes();
	syncUIFromSelection();

	return container;

}

export { SidebarAddShapes };
