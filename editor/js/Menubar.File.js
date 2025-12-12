import { UIPanel, UIRow } from './libs/ui.js';

function MenubarFile( editor ) {

const saveArrayBuffer = editor.utils.saveArrayBuffer;
const saveString = editor.utils.saveString;
const save = editor.utils.save;


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
	// New  (just a single item, no submenu)
	// ---------------------------------------------------

	let option = new UIRow()
		.setClass( 'option' )
		.setTextContent( 'New' );

	option.onClick( function () {

		if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

			editor.clear();

		}

	} );

	options.add( option );

	// ---------------------------------------------------
	// Import  (GLB only)
	// ---------------------------------------------------

	const form = document.createElement( 'form' );
	form.style.display = 'none';
	document.body.appendChild( form );

	const fileInput = document.createElement( 'input' );
	fileInput.multiple = false;
	fileInput.type = 'file';

	// Only allow .glb files in the picker
	fileInput.accept = '.glb,model/gltf-binary';

	fileInput.addEventListener( 'change', function () {

		// Optional: guard against anything that slips through
		const files = Array.from( fileInput.files ).filter( file =>
			file.name.toLowerCase().endsWith( '.glb' )
		);

		if ( files.length === 0 ) {

			alert( 'Only .glb files can be imported.' );
			form.reset();
			return;

		}

		editor.loader.loadFiles( files );
		form.reset();

	} );

	form.appendChild( fileInput );

	option = new UIRow()
		.setClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/file/import' ) );

	option.onClick( function () {

		fileInput.click();

	} );

	options.add( option );

	// ---------------------------------------------------
	// Download (.glb) – same logic as three.js "Export GLB"
	// ---------------------------------------------------

	option = new UIRow()
		.setClass( 'option' )
		.setTextContent( 'Download (.glb)' );

	option.onClick( async function () {

		// Optional: warn Safari users that downloads can be flaky
		const isSafari = /^((?!chrome|android).)*safari/i.test( navigator.userAgent );
		if ( isSafari ) {

			alert( 'Heads up: Download works best in Chrome/Edge. ' +
				'If this fails in Safari, please try another browser.' );

		}

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

				// This is exactly what the original editor does:
				// use the editor's saveArrayBuffer helper.
				saveArrayBuffer( result, 'vesl-model.glb' );

			},
			undefined,
			{ binary: true, animations: optimizedAnimations }
		);

	} );

	options.add( option );

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
