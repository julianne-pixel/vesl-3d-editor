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
	TorusGeometry,
	Color
} from 'three';

import { UIPanel, UIRow, UIText, UIColor } from './libs/ui.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { SetMaterialColorCommand } from './commands/SetMaterialColorCommand.js';
import { SetMaterialValueCommand } from './commands/SetMaterialValueCommand.js';

function SidebarAddShapes( editor ) {

	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'sidebar-addshapes' );
	container.setClass( 'Panel' );

	// =====================================================
	// 1. ADD SHAPES
	// =====================================================

	const addTitle = new UIPanel();
	addTitle.setClass( 'title' );
	addTitle.setTextContent( 'Add Shape' );
	container.add( addTitle );

	const addSection = new UIPanel();
	addSection.setClass( 'buttons' );
	container.add( addSection );

	function addShapeButton( label, createGeometry ) {

		const row = new UIRow();
		row.setClass( 'button' );
		row.setTextContent( label );

		row.onClick( function () {

			const geometry = createGeometry();
			const material = new MeshStandardMaterial( {
				color: 0xffffff,
				metalness: 0.0,
				roughness: 0.8
			} );

			const mesh = new Mesh( geometry, material );
			mesh.position.set( 0, 0.5, 0 );

			editor.execute( new AddObjectCommand( editor, mesh ) );
			editor.select( mesh );

		} );

		addSection.add( row );

	}

	// Your shapes:
	addShapeButton( 'Box', () => new BoxGeometry( 1, 1, 1 ) );
	addShapeButton( 'Circle', () => new CircleGeometry( 1, 32 ) );
	addShapeButton( 'Cylinder', () => new CylinderGeometry( 1, 1, 1, 32 ) );
	addShapeButton( 'Dodecahedron', () => new DodecahedronGeometry( 1 ) );
	addShapeButton( 'Plane', () => new PlaneGeometry( 2, 2 ) );
	addShapeButton( 'Ring', () => new RingGeometry( 0.5, 1, 32 ) );
	addShapeButton( 'Sphere', () => new SphereGeometry( 1, 32, 32 ) );
	addShapeButton( 'Tube', () => new TorusGeometry( 1, 0.35, 16, 48 ) );

	// =====================================================
	// 2. STYLE (COLOR + MATERIAL)
	// =====================================================

	container.add( new UIRow().setClass( 'separator' ) );

	const styleTitle = new UIPanel();
	styleTitle.setClass( 'title' );
	styleTitle.setTextContent( 'Style' );
	container.add( styleTitle );

	const styleHint = new UIText( 'Select an object to edit its look.' );
	styleHint.setClass( 'hint' );
	container.add( styleHint );

	function getEditableMaterial() {

		const object = editor.selected;

		if ( ! object || ! object.isMesh ) return null;

		let material = object.material;
		if ( Array.isArray( material ) ) material = material[ 0 ];
		if ( ! material || ! material.isMaterial ) return null;

		return material;

	}

	function applyColor( colorHex ) {

		const material = getEditableMaterial();
		if ( ! material ) return;

		const newColor = new Color( colorHex );
		editor.execute( new SetMaterialColorCommand( editor, material, 'color', newColor ) );

	}

	function applyMaterialPreset( preset ) {

		const material = getEditableMaterial();
		if ( ! material ) return;

		switch ( preset ) {

			case 'matte':
				editor.execute( new SetMaterialValueCommand( editor, material, 'metalness', 0.0 ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'roughness', 1.0 ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'transparent', false ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'opacity', 1.0 ) );
				break;

			case 'plastic':
				editor.execute( new SetMaterialValueCommand( editor, material, 'metalness', 0.2 ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'roughness', 0.4 ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'transparent', false ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'opacity', 1.0 ) );
				break;

			case 'metal':
				editor.execute( new SetMaterialValueCommand( editor, material, 'metalness', 1.0 ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'roughness', 0.2 ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'transparent', false ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'opacity', 1.0 ) );
				break;

			case 'glass':
				editor.execute( new SetMaterialValueCommand( editor, material, 'metalness', 0.25 ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'roughness', 0.1 ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'transparent', true ) );
				editor.execute( new SetMaterialValueCommand( editor, material, 'opacity', 0.3 ) );
				break;

		}

	}

	// ----- Color swatches -----

	const colorsTitle = new UIText( 'Color' );
	colorsTitle.setClass( 'section-label' );
	container.add( colorsTitle );

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

	swatchColors.forEach( hex => {

		const swatch = new UIRow();
		swatch.setClass( 'color-swatch' );
		swatch.dom.style.backgroundColor = hex;

		swatch.onClick( function () {

			applyColor( hex );

		} );

		swatchRow.add( swatch );

	} );

	// Full color picker
	const pickerRow = new UIRow();
	pickerRow.setClass( 'color-picker-row' );
	container.add( pickerRow );

	const pickerLabel = new UIText( 'Custom' );
	pickerLabel.setClass( 'label' );
	pickerRow.add( pickerLabel );

	const colorInput = new UIColor().setValue( '#ffffff' );
	colorInput.onChange( function () {

		applyColor( colorInput.getValue() );

	} );
	pickerRow.add( colorInput );

	// ----- Material presets -----

	const materialTitle = new UIText( 'Material' );
	materialTitle.setClass( 'section-label' );
	container.add( materialTitle );

	const materialRow = new UIPanel();
	materialRow.setClass( 'material-row' );
	container.add( materialRow );

	function presetButton( label, key ) {

		const row = new UIRow();
		row.setClass( 'button' );
		row.setTextContent( label );

		row.onClick( function () {

			applyMaterialPreset( key );

		} );

		materialRow.add( row );

	}

	presetButton( 'Matte', 'matte' );
	presetButton( 'Plastic', 'plastic' );
	presetButton( 'Metal', 'metal' );
	presetButton( 'Glass', 'glass' );

	// ----- Selection enable/disable -----

	function updateEnabledState( object ) {

		const hasMaterial = object && object.isMesh;
		container.dom.classList.toggle( 'no-selection', ! hasMaterial );

	}

	signals.objectSelected.add( function ( object ) {

		updateEnabledState( object );

	} );

	updateEnabledState( editor.selected );

	return container;

}

export { SidebarAddShapes };
