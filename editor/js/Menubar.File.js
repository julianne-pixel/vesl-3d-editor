import { UIPanel, UIRow, UIHorizontalRule } from './libs/ui.js';

function MenubarFile( editor ) {

	const strings = editor.strings;

	const saveArrayBuffer = editor.utils.saveArrayBuffer;
	const saveString = editor.utils.saveString;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/file' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// ---------------------------------------------------
	// New Project (only "Empty")
	// ---------------------------------------------------

	const newProjectSubmenuTitle = new UIRow()
		.setTextContent( strings.getKey( 'menubar/file/new' ) )
		.addClass( 'option' )
		.addClass( 'submenu-title' );

	newProjectSubmenuTitle.onMouseOver( function () {

		const { top, right } = this.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );

		newProjectSubmenu.setLeft( right + 'px' );
		newProjectSubmenu.setTop( top - parseFloat( paddingTop ) + 'px' );
		newProjectSubmenu.setDisplay( 'block' );

	} );

	newProjectSubmenuTitle.onMouseOut( function () {

		newProjectSubmenu.setDisplay( 'none' );

	} );

	options.add( newProjectSubmenuTitle );

	const newProjectSubmenu = new UIPanel()
		.setPosition( 'fixed' )
		.addClass( 'options' )
		.setDisplay( 'none' );

	newProjectSubmenuTitle.add( newProjectSubmenu );

	// New Project / Empty (the only option we keep)

	let option = new UIRow()
		.setTextContent( strings.getKey( 'menubar/file/new/empty' ) )
		.setClass( 'option' );

	option.onClick( function () {

		if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

			editor.clear();

		}

	} );

	newProjectSubmenu.add( option );

	// ---------------------------------------------------
	// Open
	// ---------------------------------------------------

	const openProjectForm = document.createElement( 'form' );
	openProjectForm.style.display = 'none';
	document.body.appendChild( openProjectForm );

	const openProjectInput = document.createElement( 'input' );
	openProjectInput.multiple = false;
	openProjectInput.type = 'file';
	openProjectInput.accept = '.json';

	openProjectInput.addEventListener( 'change', async function () {

		const file = openProjectInput.files[ 0 ];

		if ( file === undefined ) return;

		try {

			const json = JSON.parse( await file.text() );

			async function onEditorCleared() {

				await editor.fromJSON( json );
				editor.signals.editorCleared.remove( onEditorCleared );

			}

			editor.signals.editorCleared.add( onEditorCleared );

			editor.clear();

		} catch ( e ) {

			alert( strings.getKey( 'prompt/file/failedToOpenProject' ) );
			console.error( e );

		} finally {

			// reset the *open* form, not the import form
			openProjectForm.reset();

		}

	} );

	openProjectForm.appendChild( openProjectInput );

	option = new UIRow()
		.addClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/file/open' ) )
		.onClick( function () {

			if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

				openProjectInput.click();

			}

		} );

	options.add( option );

	// ---------------------------------------------------
	// (Save removed – we don't show it anymore)
	// ---------------------------------------------------
	/*
	option = new UIRow()
		.addClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/file/save' ) )
		.onClick( function () {

			const json = editor.toJSON();
			const blob = new Blob( [ JSON.stringify( json ) ], { type: 'application/json' } );
			editor.utils.save( blob, 'project.json' );

		} );

	options.add( option );
	options.add( new UIHorizontalRule() );
	*/

	// ---------------------------------------------------
	// Import
	// ---------------------------------------------------

	const form = document.createElement( 'form' );
	form.style.display = 'none';
	document.body.appendChild( form );

	const fileInput = document.createElement( 'input' );
	fileInput.multiple = true;
	fileInput.type = 'file';

	fileInput.addEventListener( 'change', function () {

		editor.loader.loadFiles( fileInput.files );
		form.reset();

	} );

	form.appendChild( fileInput );

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/file/import' ) );
	option.onClick( function () {

		fileInput.click();

	} );

	options.add( option );

	// ---------------------------------------------------
	// Export (only GLB + JSON share)
	// ---------------------------------------------------

	const fileExportSubmenuTitle = new UIRow()
		.setTextContent( strings.getKey( 'menubar/file/export' ) )
		.addClass( 'option' )
		.addClass( 'submenu-title' );

	fileExportSubmenuTitle.onMouseOver( function () {

		const { top, right } = this.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );

		fileExportSubmenu.setLeft( right + 'px' );
		fileExportSubmenu.setTop( top - parseFloat( paddingTop ) + 'px' );
		fileExportSubmenu.setDisplay( 'block' );

	} );

	fileExportSubmenuTitle.onMouseOut( function () {

		fileExportSubmenu.setDisplay( 'none' );

	} );

	options.add( fileExportSubmenuTitle );

	const fileExportSubmenu = new UIPanel()
		.setPosition( 'fixed' )
		.addClass( 'options' )
		.setDisplay( 'none' );

	fileExportSubmenuTitle.add( fileExportSubmenu );

	// --- Export GLB (Download .glb) ---------------------

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'Download (.glb)' );
	option.onClick( async function () {

		const scene = editor.scene;
		const animations = getAnimations( scene );
		const optimizedAnimations = [];

		for ( const animation of animations ) {

			optimizedAnimations.push( animation.clone().optimize() );

		}

		const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );

		const exporter = new GLTFExporter();

		exporter.parse(
			scene,
			function ( result ) {

				// binary GLB buffer
				saveArrayBuffer( result, 'vesl-model.glb' );

			},
			undefined,
			{ binary: true, animations: optimizedAnimations }
		);

	} );

	fileExportSubmenu.add( option );

	// --- Share (Download JSON) --------------------------

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'Share (.json)' );
	option.onClick( function () {

		const json = editor.toJSON();
		const pretty = JSON.stringify( json, null, 2 );

		// download as JSON; user can email the file to a friend
		saveString( pretty, 'vesl-scene.json' );

	} );

	fileExportSubmenu.add( option );

	// ---------------------------------------------------

	function getAnimations( scene ) {

		const animations = [];

		scene.traverse( function ( object ) {

			animations.push( ...object.animations );

		} );

		return animations;

	}

	return container;

}

export { MenubarFile };

