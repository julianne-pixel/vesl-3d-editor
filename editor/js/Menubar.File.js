import { UIPanel, UIRow } from './libs/ui.js';

function MenubarFile( editor ) {

	// i18n strings from editor
	const strings = editor.strings;

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
	// New (single item)
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
	// Import (.glb only)
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

		// Extra guard in case something weird slips through
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
// Download (.glb)
// ---------------------------------------------------

	option = new UIRow()
		.setClass( 'option' )
		.setTextContent( 'Download (.glb)' );

	option.onClick( async function () {

		const scene = editor.scene;

		// Collect and optimize any animations on the scene
		const animations = getAnimations( scene ).map( anim => {

			// Some animation clips may not have optimize()
			return ( typeof anim.clone === 'function' && typeof anim.optimize === 'function' )
				? anim.clone().optimize()
				: anim;

		} );

		const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );
		const exporter = new GLTFExporter();

		exporter.parse(
			scene,
			function ( result ) {

				// result is an ArrayBuffer for binary export
				downloadArrayBuffer( result, 'vesl-model.glb' );

			},
			undefined,
			{ binary: true, animations: animations }
		);

	} );

	options.add( option );

	// ---------------------------------------------------
	// Helpers
	// ---------------------------------------------------

	function getAnimations( scene ) {

		const animations = [];

		scene.traverse( function ( object ) {

			if ( object.animations && object.animations.length ) {

				animations.push( ...object.animations );

			}

		} );

		return animations;

	}

	// Download helper – uses File instead of plain Blob
	function downloadArrayBuffer( buffer, filename ) {

		// Wrap the buffer in a File so the name is attached at the blob level
		const file = new File(
			[ buffer ],
			filename,
			{ type: 'model/gltf-binary' }
		);

		const url = URL.createObjectURL( file );

		const link = document.createElement( 'a' );
		link.style.display = 'none';
		link.href = url;
		link.download = filename;

		// (Optional) tiny Safari nudge
		// const isSafari = /^((?!chrome|android).)*safari/i.test( navigator.userAgent );
		// if ( isSafari ) link.target = '_blank';

		document.body.appendChild( link );
		link.click();

		setTimeout( function () {

			document.body.removeChild( link );
			URL.revokeObjectURL( url );

		}, 2000 );

	}

	return container;

}

export { MenubarFile };
