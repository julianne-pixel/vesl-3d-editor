// editor/js/Sidebar.AddShapes.js

import {
	Mesh,
	MeshStandardMaterial,
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

	// ✅ single source of truth for “new shape defaults”
	function makeDefaultMatteMaterial() {

		const material = new MeshStandardMaterial( {
			color: 0x000000,      // ✅ black
			metalness: 0.0,       // ✅ matte baseline
			roughness: 1.0,       // ✅ totally flat
			transparent: false,
			opacity: 1.0
		} );

		// keep reflections off for matte (matches your preset behavior)
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

			// ✅ ensure new shapes start black + matte
			const material = makeDefaultMatteMaterial();

			const mesh = new Mesh( geometry, material );
			mesh.position.set( 0, 0.5, 0 );

			// ✅ store default preset so UI always knows what to show
			mesh.userData = mesh.userData || {};
			mesh.userData.veslPreset = 'matte';

			editor.execute( new AddObjectCommand( editor, mesh ) );
			editor.select( mesh ); // selection triggers syncUIFromSelection via signals

		} );

		addSection.add( row );

	}

	// Your 8 shapes
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

	function applyColor( hex ) {

		const result = getSelectedMaterial();
		if ( !result ) return;

		const { object, material } = result;

		material.color.set( new Color( hex ) );

		// a tiny emissive tweak so the color “pops” even in meh lighting
		if ( material.emissive ) {
			material.emissive.set( new Color( hex ).multiplyScalar( 0.15 ) );
		}

		material.needsUpdate = true;
		signals.objectChanged.dispatch( object );

	}

	function applyPreset( preset ) {

		const result = getSelectedMaterial();
		if ( !result ) return;

		const { object, material } = result;

		// remember starting color so presets can build off it
		const baseColor = material.color.clone();

		// reset baseline so presets don't stack weirdly
		material.transparent     = false;
		material.opacity         = 1.0;
		material.depthWrite      = true;
		material.metalness       = 0.0;
		material.roughness       = 0.5;
		material.envMapIntensity = 1.0;

		if ( material.emissive ) {
			material.emissive.set( 0x000000 );
		}

		// give metal/glass something to reflect if available
		const env = editor.scene && ( editor.scene.environment || editor.scene.background ) || null;
		if ( env ) {
			material.envMap = env;
		}

		// ================= PRESETS =================

		if ( preset === 'matte' ) {

			// OPAQUE, totally flat, no shine
			material.color.copy( baseColor );
			material.metalness = 0.0;
			material.roughness = 1.0;     // max roughness
			material.envMapIntensity = 0; // kill reflections

		} else if ( preset === 'plastic' ) {

			// Same color, pretty shiny “toy plastic”
			material.color.copy( baseColor );
			material.metalness = 0.05;
			material.roughness = 0.22;

			if ( env ) material.envMapIntensity = 1.2;

			if ( material.emissive ) {
				// subtle glow so it pops more than matte
				material.emissive.copy( material.color ).multiplyScalar( 0.06 );
			}

		} else if ( preset === 'metal' ) {

			// SILVER-tinted + very shiny
			const silver = new Color( 0xdadada );
			// keep a hint of original hue but mostly silver
			silver.lerp( baseColor, 0.2 );
			material.color.copy( silver );

			material.metalness = 1.0;
			material.roughness = 0.06;

			if ( env ) material.envMapIntensity = 2.2;

		} else if ( preset === 'glass' ) {

			// Keep color, but very transparent + a bit shiny
			const glassTint = baseColor.clone().lerp( new Color( 0xffffff ), 0.25 );
			material.color.copy( glassTint );

			material.metalness    = 0.0;
			material.roughness    = 0.05;
			material.transparent  = true;
			material.opacity      = 0.12;   // very see-through
			material.depthWrite   = false;  // so you can see inside edges better

			if ( env ) material.envMapIntensity = 1.4;

		}

		material.needsUpdate = true;

		if ( signals.materialChanged ) {
			signals.materialChanged.dispatch( material );
		}

		signals.objectChanged.dispatch( object );

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

	function syncSwatchToMaterial( material ) {

		if ( !material || !material.color ) return;

		let best = null;
		let bestDist = Infinity;

		const c = material.color.clone();

		for ( const item of swatchButtons ) {

			const sc = new Color( item.hex );
			const dr = c.r - sc.r, dg = c.g - sc.g, db = c.b - sc.b;
			const d = dr * dr + dg * dg + db * db;

			if ( d < bestDist ) {
				bestDist = d;
				best = item;
			}

		}

		// only “snap” to a swatch if it's reasonably close; otherwise leave none selected
		if ( best && bestDist < 0.03 ) setSelectedSwatchRow( best.row );
		else setSelectedSwatchRow( null );

	}

	function inferPreset( material ) {

		if ( !material ) return null;
		if ( material.transparent && material.opacity < 0.4 ) return 'glass';
		if ( material.metalness > 0.85 && material.roughness < 0.2 ) return 'metal';
		if ( material.roughness >= 0.85 && material.metalness < 0.1 ) return 'matte';
		return 'plastic';

	}

	function syncUIFromSelection() {

		const result = getSelectedMaterial();
		if ( !result ) {
			setSelectedSwatchRow( null );
			setSelectedMaterialKey( null );
			return;
		}

		const { object, material } = result;

		syncSwatchToMaterial( material );

		const key = object.userData && object.userData.veslPreset
			? object.userData.veslPreset
			: inferPreset( material );

		setSelectedMaterialKey( key );

		// keep custom picker synced to actual material color
		if ( material && material.color && colorInput ) {
			const hex = '#' + material.color.getHexString();
			colorInput.setValue( hex );
		}

	}

	// ---------- color swatches ----------

	const colorsLabel = new UIText( 'Color' );
	colorsLabel.setClass( 'section-label' );
	container.add( colorsLabel );

	const swatchRow = new UIPanel();
	swatchRow.setClass( 'color-swatch-row' );
	container.add( swatchRow );

	const swatchColors = [
		'#ffffff', '#000000',
		'#f44336', '#e91e63',
		'#9c27b0', '#3f51b5',
		'#2196f3', '#4caf50',
		'#ffeb3b', '#ff9800',
		'#795548', '#9e9e9e'
	];

	// ---------- full color picker (declare early so syncUIFromSelection can reference) ----------
	const pickerRow = new UIRow();
	pickerRow.setClass( 'color-picker-row' );
	container.add( pickerRow );

	const pickerLabel = new UIText( 'Custom' );
	pickerLabel.setClass( 'label' );
	pickerRow.add( pickerLabel );

	// ✅ default picker value should be black (matches new shapes)
	const colorInput = new UIColor().setValue( '#000000' );
	colorInput.onChange( function () {

		applyColor( colorInput.getValue() );
		// custom color usually won’t match a swatch; resync decides
		syncUIFromSelection();

	} );

	pickerRow.add( colorInput );

	swatchColors.forEach( hex => {

		const swatch = new UIRow();
		swatch.setClass( 'color-swatch' );
		swatch.dom.style.backgroundColor = hex;

		swatch.onClick( function () {

			applyColor( hex );
			setSelectedSwatchRow( swatch );
			colorInput.setValue( hex );

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

			const { object } = result;

			applyPreset( key );

			// store the chosen preset on the object so it persists across selection
			object.userData = object.userData || {};
			object.userData.veslPreset = key;

			setSelectedMaterialKey( key );

		} );

		matRow.add( row );
		materialButtons.set( key, row );

	}

	matButton( 'Matte', 'matte' );
	matButton( 'Plastic', 'plastic' );
	matButton( 'Metal', 'metal' );
	matButton( 'Glass', 'glass' );

	// keep UI synced when selection changes
	if ( signals.objectSelected ) signals.objectSelected.add( syncUIFromSelection );
	if ( signals.objectChanged ) signals.objectChanged.add( syncUIFromSelection );

	// initialize
	syncUIFromSelection();

	return container;

}

export { SidebarAddShapes };
