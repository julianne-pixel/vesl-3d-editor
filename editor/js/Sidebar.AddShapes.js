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
import { SetMaterialColorCommand } from './commands/SetMaterialColorCommand.js';
import { SetMaterialValueCommand } from './commands/SetMaterialValueCommand.js';

function SidebarAddShapes( editor ) {

	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'sidebar-addshapes' );
	container.setClass( 'Panel' );

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

	function addShapeButton( label, createGeometry ) {

		const row = new UIRow();
		row.setClass( 'button' );
		row.setTextContent( label );

		row.onClick( function () {

			const geometry = createGeometry();

			const material = new MeshStandardMaterial( {
				color: 0xffffff,
				metalness: 0.2,
				roughness: 0.8
			} );

			const mesh = new Mesh( geometry, material );
			mesh.position.set( 0, 0.5, 0 );

			editor.execute( new AddObjectCommand( editor, mesh ) );
			editor.select( mesh );

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

	// ----- helpers -----

	function getEditableMaterial() {

		const object = editor.selected;
		if ( !object || !object.isMesh ) return null;

		let material = object.material;
		if ( Array.isArray( material ) ) material = material[ 0 ];
		if ( !material || !material.isMaterial ) return null;

		return material;

	}

	function applyColor( hex ) {

		const material = getEditableMaterial();
		if ( !material ) return;

		const newColor = new Color( hex );
		editor.execute( new SetMaterialColorCommand( editor, material, 'color', newColor ) );

	}

	function applyPreset( preset ) {

		const material = getEditableMaterial();
		if ( !material ) return;

		// base reset
		editor.execute( new SetMaterialValueCommand( editor, material, 'transparent', false ) );
		editor.execute( new SetMaterialValueCommand( editor, material, 'opacity', 1.0 ) );

		if ( preset === 'matte' ) {

			editor.execute( new SetMaterialValueCommand( editor, material, 'metalness', 0.0 ) );
			editor.execute( new SetMaterialValueCommand( editor, material, 'roughness', 1.0 ) );

		} else if ( preset === 'plastic' ) {

			editor.execute( new SetMaterialValueCommand( editor, material, 'metalness', 0.2 ) );
			editor.execute( new SetMaterialValueCommand( editor, material, 'roughness', 0.4 ) );

		} else if ( preset === 'metal' ) {

			editor.execute( new SetMaterialValueCommand( editor, material, 'metalness', 1.0 ) );
			editor.execute( new SetMaterialValueCommand( editor, material, 'roughness', 0.2 ) );

		} else if ( preset === 'glass' ) {

			editor.execute( new SetMaterialValueCommand( editor, material, 'metalness', 0.25 ) );
			editor.execute( new SetMaterialValueCommand( editor, material, 'roughness', 0.1 ) );
			editor.execute( new SetMaterialValueCommand( editor, material, 'transparent', true ) );
			editor.execute( new SetMaterialValueCommand( editor, material, 'opacity', 0.25 ) );

		}

	}

	// ----- color swatches -----

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

	swatchColors.forEach( hex => {

		const swatch = new UIRow();
		swatch.setClass( 'color-swatch' );
		swatch.dom.style.backgroundColor = hex;

		swatch.onClick( function () {

			applyColor( hex );

		} );

		swatchRow.add( swatch );

	} );

	// full color picker

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

	// ----- material presets -----

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

			applyPreset( key );

		} );

		matRow.add( row );

	}

	matButton( 'Matte', 'matte' );
	matButton( 'Plastic', 'plastic' );
	matButton( 'Metal', 'metal' );
	matButton( 'Glass', 'glass' );

	// ----- enable / disable style section -----

	function updateEnabledState( object ) {

		const hasMaterial = object && object.isMesh;
		container.dom.classList.toggle( 'no-selection', !hasMaterial );

	}

	signals.objectSelected.add( function ( object ) {

		updateEnabledState( object );

	} );

	updateEnabledState( editor.selected );

	return container;

}

export { SidebarAddShapes };
