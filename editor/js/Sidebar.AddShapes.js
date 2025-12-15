// editor/js/Sidebar.AddShapes.js

import {
	Mesh,
	BoxGeometry,
	CircleGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	PlaneGeometry,
	RingGeometry,
	SphereGeometry,
	TorusGeometry,
	Color,
	MeshStandardMaterial,
	MeshPhysicalMaterial
} from 'three';

import { UIPanel, UIRow, UIText, UIColor } from './libs/ui.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';

function SidebarAddShapes( editor ) {

	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'sidebar-addshapes' );
	container.setClass( 'Panel' );

	// --- VESL selection styles (swatches + material buttons) ---
	const styleTag = document.createElement( 'style' );
	styleTag.textContent = `
		#sidebar-addshapes{
			--vesl-accent:#00fd64;
		}

		/* Swatches */
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

		/* Material buttons */
		#sidebar-addshapes .material-row .button{
			position:relative;
			border-radius:10px;
			outline:2px solid transparent;
		}
		#sidebar-addshapes .material-row .button.is-selected{
			outline-color:var(--vesl-accent);
			box-shadow: 0 0 0 2px rgba(0,253,100,0.25), 0 0 22px rgba(0,253,100,0.15);
		}
		#sidebar-addshapes .material-row .button.is-selected::after{
			content:"Active";
			position:absolute;
			right:10px;
			top:50%;
			transform:translateY(-50%);
			font-size:11px;
			font-weight:800;
			padding:2px 8px;
			border-radius:999px;
			background:rgba(0,253,100,0.16);
			color:var(--vesl-accent);
			border:1px solid rgba(0,253,100,0.30);
		}
	`;
	container.dom.appendChild( styleTag );

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

	// ✅ default: black + matte
	function makeDefaultMatteMaterial() {

		const material = new MeshStandardMaterial( {
			color: 0x000000,
			metalness: 0.0,
			roughness: 1.0,
			transparent: false,
			opacity: 1.0
		} );

		material.envMapIntensity = 0;
		if ( material.emissive ) material.emissive.set( 0x000000 );

		return material;

	}

	function addShapeButton( label, createGeometry ) {

		const row = new UIRow();
		row.setClass( 'button' );
		row.setTextContent( label );

		row.onClick( function () {

			const geometry = createGeometry();
			const material = makeDefaultMatteMaterial();

			const mesh = new Mesh( geometry, material );
			mesh.position.set( 0, 0.5, 0 );

			// ✅ store defaults for stable UI
			mesh.userData = mesh.userData || {};
			mesh.userData.veslPreset = 'matte';
			mesh.userData.veslColor = '#000000';

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
	// 2. STYLE
	// =====================================================

	const separator = new UIRow();
	separator.setClass( 'separator' );
	container.add( separator );

	const styleTitle = new UIPanel();
	styleTitle.setClass( 'title' );
	styleTitle.setTextContent( 'Style' );
	container.add( styleTitle );

	const styleHint = new UIText( 'Select an object to edit its look.' );
	styleHint.setClass( 'section-label' );
	container.add( styleHint );

	// ---------- helpers ----------

	function getSelectedMaterial() {

		const object = editor.selected;
		if ( !object ) return null;

		let material = object.material;
		if ( Array.isArray( material ) ) material = material[ 0 ];
		if ( !material || !material.isMaterial ) return null;

		return { object, material };

	}

	// prevent programmatic colorInput.setValue(...) from firing applyColor
	let suppressColorSync = false;

	function getBaseColor( object, material ) {

		if ( object.userData && object.userData.veslColor ) {
			return new Color( object.userData.veslColor );
		}

		return material && material.color ? material.color.clone() : new Color( 0x000000 );

	}

	function applyColor( hex ) {

		const result = getSelectedMaterial();
		if ( !result ) return;

		const { object, material } = result;

		// ✅ store user's chosen color as source of truth
		object.userData = object.userData || {};
		object.userData.veslColor = hex;

		// apply to actual material
		material.color.set( hex );

		if ( material.emissive ) {
			material.emissive.set( new Color( hex ).multiplyScalar( 0.15 ) );
		}

		material.needsUpdate = true;
		signals.objectChanged.dispatch( object );

	}

	// ensure object has the right material CLASS for the preset
	function ensureMaterialType( object, desiredType, baseColor ) {

		let current = object.material;
		if ( Array.isArray( current ) ) current = current[ 0 ];

		const wantsPhysical = desiredType === 'physical';
		const isPhysical = current && current.isMeshPhysicalMaterial;

		if ( wantsPhysical === isPhysical ) {

			// keep color stable
			if ( current && current.color ) current.color.copy( baseColor );
			return current;

		}

		const next = wantsPhysical
			? new MeshPhysicalMaterial( { color: baseColor } )
			: new MeshStandardMaterial( { color: baseColor } );

		next.userData = current && current.userData ? { ...current.userData } : {};

		object.material = next;

		if ( current && current.dispose ) current.dispose();

		return next;

	}

	function applyPreset( preset ) {

		const result = getSelectedMaterial();
		if ( !result ) return;

		const { object, material: currentMat } = result;

		// ✅ stable, stored user color
		const baseColor = getBaseColor( object, currentMat );

		const env = editor.scene && ( editor.scene.environment || editor.scene.background ) || null;

		const desiredType = ( preset === 'plastic' || preset === 'glass' ) ? 'physical' : 'standard';
		const material = ensureMaterialType( object, desiredType, baseColor );

		// baseline reset
		material.transparent     = false;
		material.opacity         = 1.0;
		material.depthWrite      = true;
		material.metalness       = 0.0;
		material.roughness       = 0.5;
		material.envMapIntensity = 1.0;

		if ( material.emissive ) material.emissive.set( 0x000000 );
		if ( env ) material.envMap = env;

		// reset physical-only fields safely
		material.clearcoat = 0;
		material.clearcoatRoughness = 0;
		material.transmission = 0;
		material.ior = 1.45;
		material.thickness = 0;

		// ================= PRESETS =================

		if ( preset === 'matte' ) {

			material.color.copy( baseColor );
			material.metalness = 0.0;
			material.roughness = 1.0;
			material.envMapIntensity = 0;

		} else if ( preset === 'plastic' ) {

			material.color.copy( baseColor );
			material.metalness = 0.0;
			material.roughness = 0.22;

			material.clearcoat = 1.0;
			material.clearcoatRoughness = 0.12;

			if ( env ) material.envMapIntensity = 1.25;

		} else if ( preset === 'metal' ) {

			// ✅ DO NOT tint to silver — keep user color stable
			material.color.copy( baseColor );
			material.metalness = 1.0;
			material.roughness = 0.06;

			if ( env ) material.envMapIntensity = 2.2;

		} else if ( preset === 'glass' ) {

			// ✅ DO NOT tint toward white — keep user color stable
			material.color.copy( baseColor );

			material.metalness = 0.0;
			material.roughness = 0.03;

			material.transmission = 1.0;
			material.ior = 1.45;
			material.thickness = 0.6;

			material.transparent = true;
			material.opacity = 0.18;
			material.depthWrite = false;

			if ( env ) material.envMapIntensity = 1.6;

		}

		material.needsUpdate = true;

		// persist preset for UI consistency
		object.userData = object.userData || {};
		object.userData.veslPreset = preset;

		if ( signals.materialChanged ) signals.materialChanged.dispatch( material );
		signals.objectChanged.dispatch( object );

		// update UI now that preset is applied
		syncUIFromSelection();

	}

	// ---------- UI selection state ----------
	const swatchButtons = [];                 // { hex, row }
	const materialButtons = new Map();        // key -> row
	let selectedSwatchRow = null;
	let selectedMaterialKey = null;

	function setSelectedSwatchRow( row ) {

		if ( selectedSwatchRow ) selectedSwatchRow.dom.classList.remove( 'is-selected' );
		selectedSwatchRow = row;
		if ( selectedSwatchRow ) selectedSwatchRow.dom.classList.add( 'is-selected' );

	}

	function setSelectedMaterialKey( key ) {

		if ( selectedMaterialKey && materialButtons.has( selectedMaterialKey ) ) {
			materialButtons.get( selectedMaterialKey ).dom.classList.remove( 'is-selected' );
		}

		selectedMaterialKey = key;

		if ( key && materialButtons.has( key ) ) {
			materialButtons.get( key ).dom.classList.add( 'is-selected' );
		}

	}

	function syncSwatchToMaterial( object, material ) {

		// use stored color first (prevents “jumping”)
		let c = null;
		if ( object && object.userData && object.userData.veslColor ) {
			c = new Color( object.userData.veslColor );
		} else if ( material && material.color ) {
			c = material.color.clone();
		} else {
			return;
		}

		let best = null;
		let bestDist = Infinity;

		for ( const item of swatchButtons ) {

			const sc = new Color( item.hex );
			const dr = c.r - sc.r, dg = c.g - sc.g, db = c.b - sc.b;
			const d = dr * dr + dg * dg + db * db;

			if ( d < bestDist ) {
				bestDist = d;
				best = item;
			}

		}

		if ( best && bestDist < 0.03 ) setSelectedSwatchRow( best.row );
		else setSelectedSwatchRow( null );

	}

	function inferPreset( material ) {

		if ( !material ) return null;

		if ( material.isMeshPhysicalMaterial && material.transmission > 0.5 ) return 'glass';
		if ( material.transparent && material.opacity < 0.4 ) return 'glass';
		if ( material.metalness > 0.85 && material.roughness < 0.2 ) return 'metal';
		if ( material.roughness >= 0.85 && material.metalness < 0.1 ) return 'matte';
		return 'plastic';

	}

	// ---------- full color picker ----------
	const pickerRow = new UIRow();
	pickerRow.setClass( 'color-picker-row' );

	const pickerLabel = new UIText( 'Custom' );
	pickerLabel.setClass( 'label' );
	pickerRow.add( pickerLabel );

	const colorInput = new UIColor().setValue( '#000000' );
	colorInput.onChange( function () {

		if ( suppressColorSync ) return;

		applyColor( colorInput.getValue() );
		// don't force UI resync here; selection stays, swatch is set by click anyway

	} );

	pickerRow.add( colorInput );

	function syncUIFromSelection() {

		const result = getSelectedMaterial();
		if ( !result ) {
			setSelectedSwatchRow( null );
			setSelectedMaterialKey( null );
			return;
		}

		const { object, material } = result;

		syncSwatchToMaterial( object, material );

		const key = object.userData && object.userData.veslPreset
			? object.userData.veslPreset
			: inferPreset( material );

		setSelectedMaterialKey( key );

		// sync custom picker to stored color first
		const storedHex = object.userData && object.userData.veslColor
			? object.userData.veslColor
			: ( material && material.color ? ( '#' + material.color.getHexString() ) : '#000000' );

		suppressColorSync = true;
		colorInput.setValue( storedHex );
		suppressColorSync = false;

	}

	// ---------- color swatches ----------

	const colorsLabel = new UIText( 'Color' );
	colorsLabel.setClass( 'section-label' );
	container.add( colorsLabel );

	const swatchRow = new UIPanel();
	swatchRow.setClass( 'color-swatch-row' );
	container.add( swatchRow );

	container.add( pickerRow );

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

			applyColor( hex );
			setSelectedSwatchRow( swatch );

			suppressColorSync = true;
			colorInput.setValue( hex );
			suppressColorSync = false;

		} );

		swatchRow.add( swatch );
		swatchButtons.push( { hex, row: swatch } );

	} );

	// ---------- material presets ----------

	const matLabel = new UIText( 'Material' );
	matLabel.setClass( 'section-label' );
	container.add( matLabel );

	const matRow = new UIPanel();
	matRow.setClass( 'material-row' );
	container.add( matRow );

	function matButton( label, key ) {

		const row = new UIRow();
		row.setClass( 'button' );
		row.setTextContent( label );

		row.onClick( function () {

			const result = getSelectedMaterial();
			if ( !result ) return;

			applyPreset( key );
			setSelectedMaterialKey( key );

		} );

		matRow.add( row );
		materialButtons.set( key, row );

	}

	matButton( 'Matte', 'matte' );
	matButton( 'Plastic', 'plastic' );
	matButton( 'Metal', 'metal' );
	matButton( 'Glass', 'glass' );

	// ✅ keep UI synced ONLY on selection changes (prevents “jumping”)
	if ( signals.objectSelected ) signals.objectSelected.add( syncUIFromSelection );

	// initialize
	syncUIFromSelection();

	return container;

}

export { SidebarAddShapes };
