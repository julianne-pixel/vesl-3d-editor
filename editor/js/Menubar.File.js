import { UIPanel, UIRow } from './libs/ui.js';

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
	// New (single option – no submenu)
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
	// Import (same behavior as original)
	// ---------------------------------------------------

const form = document.createElement( 'form' );
form.style.display = 'none';
document.body.appendChild( form );

const fileInput = document.createElement( 'input' );
fileInput.multiple = true;
fileInput.type = 'file';

// Only allow .glb
fileInput.accept = '.glb,model/gltf-binary';

fileInput.addEventListener( 'change', function () {

    const files = Array.from( fileInput.files ).filter( file =>
        file.name.toLowerCase().endsWith( '.glb' )
    );

    if ( files.length === 0 ) {

        alert( 'Only .glb files can be imported right now.' );
        form.reset();
        return;

    }

    editor.loader.loadFiles( files );
    form.reset();

} );

form.appendChild( fileInput );

// Menu item
option = new UIRow()
    .setClass( 'option' )
    .setTextContent( strings.getKey( 'menubar/file/import' ) );

option.onClick( function () {

    fileInput.click();   // ✅ Corrected line

} );

options.add( option );


	// ---------------------------------------------------
	// Download (.glb) – one-click GLB export
	// ---------------------------------------------------

	option = new UIRow()
		.setClass( 'option' )
		.setTextContent( 'Download (.glb)' );

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

	options.add( option );

	// ---------------------------------------------------
	// Share (.glb) – download + open email draft
	// ---------------------------------------------------

	option = new UIRow()
		.setClass( 'option' )
		.setTextContent( 'Share (.glb)' );

	option.onClick( async function () {

		const scene = editor.scene;
		const animations = getAnimations( scene );
		const optimizedAnimations = [];

		for ( const animation of animations ) {

			optimizedAnimations.push( animation.clone().optimize() );

		}

		const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );
		const exporter = new GLTFExporter();

		// 1) Export and download GLB
		exporter.parse(
			scene,
			function ( result ) {

				saveArrayBuffer( result, 'vesl-model.glb' );

				// 2) Open email draft (browser cannot auto-attach the file,
				//    but this nudges them to attach vesl-model.glb)
				const subject = encodeURIComponent( 'VESL 3D model' );
				const body = encodeURIComponent(
					'Hi!\n\nI exported a 3D model from the VESL editor. ' +
					'The file is named "vesl-model.glb" – attaching it here.\n\n'
				);

				window.location.href =
					'mailto:?subject=' + subject + '&body=' + body;

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


