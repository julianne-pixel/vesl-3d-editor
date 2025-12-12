import { UIPanel, UIElement, UIButton, UIColor } from './libs/ui.js';
import * as THREE from 'three';

function SidebarAddShapes( editor ) {

    const container = new UIPanel();
    container.setId( 'sidebar-addshapes' );

    // -------------------------------------
    // SECTION: ADD SHAPE
    // -------------------------------------
    const titleAdd = new UIElement();
    titleAdd.setClass( 'title' );
    titleAdd.setTextContent( 'Add Shape' );
    container.add( titleAdd );

    const shapeButtons = new UIElement();
    shapeButtons.setClass( 'buttons' );
    container.add( shapeButtons );

    // Helper to create a shape button
    function makeShapeButton( label, createFn ) {

        const btn = new UIButton( label ).onClick( () => {
            const mesh = createFn();
            editor.execute( new AddObjectCommand( editor, mesh ) );
        });

        btn.setClass( 'button' );
        shapeButtons.add( btn );
    }

    makeShapeButton( 'Box', () => new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xffffff})) );
    makeShapeButton( 'Circle', () => new THREE.Mesh(new THREE.CircleGeometry(1,32), new THREE.MeshStandardMaterial({color:0xffffff})) );
    makeShapeButton( 'Cylinder', () => new THREE.Mesh(new THREE.CylinderGeometry(1,1,2,32), new THREE.MeshStandardMaterial({color:0xffffff})) );
    makeShapeButton( 'Dodecahedron', () => new THREE.Mesh(new THREE.DodecahedronGeometry(1), new THREE.MeshStandardMaterial({color:0xffffff})) );
    makeShapeButton( 'Plane', () => new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshStandardMaterial({color:0xffffff, side:THREE.DoubleSide})) );
    makeShapeButton( 'Ring', () => new THREE.Mesh(new THREE.RingGeometry(0.5,1,32), new THREE.MeshStandardMaterial({color:0xffffff, side:THREE.DoubleSide})) );
    makeShapeButton( 'Sphere', () => new THREE.Mesh(new THREE.SphereGeometry(1,32,32), new THREE.MeshStandardMaterial({color:0xffffff})) );
    makeShapeButton( 'Tube', () => new THREE.Mesh(new THREE.TorusGeometry(1,0.3,16,100), new THREE.MeshStandardMaterial({color:0xffffff})) );

    // -------------------------------------
    // SEPARATOR
    // -------------------------------------
    const sep = new UIElement();
    sep.setClass( 'separator' );
    container.add( sep );


    // -------------------------------------
    // SECTION: STYLE
    // -------------------------------------
    const titleStyle = new UIElement();
    titleStyle.setClass( 'title' );
    titleStyle.setTextContent( 'Style' );
    container.add( titleStyle );

    const styleLabel = new UIElement();
    styleLabel.setTextContent( 'Select an object to edit its look.' );
    styleLabel.setClass( 'section-label' );
    container.add( styleLabel );


    // COLOR SWATCHES
    const swatchRow = new UIElement();
    swatchRow.setClass( 'color-swatch-row' );
    container.add( swatchRow );

    const colors = [
        '#ffffff','#000000','#ff0000','#00ff00','#0000ff',
        '#ffff00','#ff00ff','#00ffff',
        '#888888','#444444','#aa5500','#ff8800'
    ];

    colors.forEach( color => {

        const swatch = new UIElement();
        swatch.setClass( 'color-swatch' );
        swatch.dom.style.background = color;

        swatch.onClick( () => {
            updateMaterialColor( color );
        });

        swatchRow.add( swatch );
    });


    // CUSTOM COLOR PICKER
    const customRow = new UIElement();
    customRow.setClass( 'color-picker-row' );
    container.add( customRow );

    const customLabel = new UIElement();
    customLabel.setClass( 'label' );
    customLabel.setTextContent( 'Custom' );
    customRow.add( customLabel );

    const customColor = new UIColor().onChange( () => {
        updateMaterialColor( customColor.getValue() );
    });

    customRow.add( customColor );


    // MATERIAL PRESETS
    const matTitle = new UIElement();
    matTitle.setClass( 'section-label' );
    matTitle.setTextContent( 'Material' );
    container.add( matTitle );

    const matRow = new UIElement();
    matRow.setClass( 'material-row' );
    container.add( matRow );

    function makeMatButton( name, props ) {

        const btn = new UIButton( name ).onClick( () => {
            applyMaterialPreset( props );
        });

        btn.setClass( 'button' );
        matRow.add( btn );
    }

    makeMatButton( 'Matte', { roughness: 1, metalness: 0 } );
    makeMatButton( 'Plastic', { roughness: 0.4, metalness: 0.1 } );
    makeMatButton( 'Metal', { roughness: 0.1, metalness: 1 } );
    makeMatButton( 'Glass', { roughness: 0, metalness: 0, opacity: 0.2, transparent: true } );


    // -------------------------------------
    // HELPERS
    // -------------------------------------
    function updateMaterialColor( hex ) {
        const obj = editor.selected;
        if (!obj || !obj.material) return;
        obj.material.color.set( hex );
        obj.material.needsUpdate = true;
        editor.signals.objectChanged.dispatch( obj );
    }

    function applyMaterialPreset( props ) {
        const obj = editor.selected;
        if (!obj || !obj.material) return;
        Object.assign( obj.material, props );
        obj.material.needsUpdate = true;
        editor.signals.objectChanged.dispatch( obj );
    }

    // Disable styling when no object selected
    editor.signals.objectSelected.add( obj => {
        container.dom.classList.toggle( 'no-selection', !obj || !obj.material );
    });

    return container;
}

export { SidebarAddShapes };
