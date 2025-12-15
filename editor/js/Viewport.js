// editor/js/Viewport.js

import * as THREE from 'three';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { UIPanel } from './libs/ui.js';

import { EditorControls } from './EditorControls.js';

import { ViewportControls } from './Viewport.Controls.js';
import { ViewportInfo } from './Viewport.Info.js';

import { ViewHelper } from './Viewport.ViewHelper.js';
import { XR } from './Viewport.XR.js';

import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ViewportPathtracer } from './Viewport.Pathtracer.js';

function Viewport( editor ) {

	const selector = editor.selector;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'viewport' );
	container.setPosition( 'absolute' );

	container.add( new ViewportControls( editor ) );
	container.add( new ViewportInfo( editor ) );

	// ---------------------------------------------------
	// IMPORTANT:
	// Keep renderer INSIDE the function and ONLY ONCE.
	// Many code paths fire (resize/mousedown/render) before
	// rendererCreated, so we guard those paths.
	// ---------------------------------------------------
	let renderer = null;
	let pmremGenerator = null;
	let pathtracer = null;

	const camera = editor.camera;
	const scene = editor.scene;
	const sceneHelpers = editor.sceneHelpers;
	const ENABLE_VIEW_HELPER = false;

	// =====================================================================
	// SOLID MODE FIX:
	// Use a shared override material so SOLID always displays per-object color
	// even when materials get swapped (matte/plastic/metal/glass) or lights/env
	// are missing. We copy the object's material color/opacity per draw.
	// =====================================================================

	const SOLID_OVERRIDE = new THREE.MeshBasicMaterial( { color: 0xffffff } );
	SOLID_OVERRIDE.depthTest = true;
	SOLID_OVERRIDE.depthWrite = true;
	SOLID_OVERRIDE.transparent = false;
	SOLID_OVERRIDE.opacity = 1.0;

	function ensureSolidHooksEnabled() {

		scene.traverse( function ( obj ) {

			if ( obj.isMesh !== true ) return;
			if ( obj.userData.__solidHooked === true ) return;

			obj.userData.__solidHooked = true;
			obj.userData.__solidPrevOnBeforeRender = obj.onBeforeRender;

			obj.onBeforeRender = function ( renderer, sceneArg, cameraArg, geometry, materialArg, group ) {

				// Only apply when SOLID override is active
				if ( scene.overrideMaterial === SOLID_OVERRIDE ) {

					const m = obj.material;
					const c = ( m && m.color ) ? m.color : null;

					if ( c ) {
						SOLID_OVERRIDE.color.copy( c );
					} else {
						SOLID_OVERRIDE.color.setHex( 0xffffff );
					}

					// Respect transparency-ish settings so "glass" doesn't get stuck black
					const opacity = ( m && typeof m.opacity === 'number' ) ? m.opacity : 1.0;
					const transparent = ( m && m.transparent === true ) || opacity < 1.0;

					SOLID_OVERRIDE.opacity = opacity;
					SOLID_OVERRIDE.transparent = transparent;
					SOLID_OVERRIDE.depthWrite = !transparent;

				}

				// Preserve any original onBeforeRender
				if ( typeof obj.userData.__solidPrevOnBeforeRender === 'function' ) {
					obj.userData.__solidPrevOnBeforeRender.call( obj, renderer, sceneArg, cameraArg, geometry, materialArg, group );
				}

			};

		} );

	}

	function restoreSolidHooks() {

		scene.traverse( function ( obj ) {

			if ( obj.isMesh !== true ) return;
			if ( obj.userData.__solidHooked !== true ) return;

			obj.onBeforeRender = obj.userData.__solidPrevOnBeforeRender || function () {};
			delete obj.userData.__solidPrevOnBeforeRender;
			delete obj.userData.__solidHooked;

		} );

	}

	// helpers ------------------------------------------------

	const GRID_COLORS_LIGHT = [ 0x999999, 0x777777 ];
	const GRID_COLORS_DARK = [ 0x555555, 0x888888 ];

	const grid = new THREE.Group();

	const grid1 = new THREE.GridHelper( 30, 30 );
	grid1.material.color.setHex( GRID_COLORS_LIGHT[ 0 ] );
	grid1.material.vertexColors = false;
	grid.add( grid1 );

	const grid2 = new THREE.GridHelper( 30, 6 );
	grid2.material.color.setHex( GRID_COLORS_LIGHT[ 1 ] );
	grid2.material.vertexColors = false;
	grid.add( grid2 );

	sceneHelpers.add( grid );

const viewHelper = ENABLE_VIEW_HELPER ? new ViewHelper( camera, container ) : null;

	//

	const box = new THREE.Box3();

	const selectionBox = new THREE.Box3Helper( box );
	selectionBox.material.depthTest = false;
	selectionBox.material.transparent = true;
	selectionBox.visible = false;
	sceneHelpers.add( selectionBox );

	let objectPositionOnDown = null;
	let objectRotationOnDown = null;
	let objectScaleOnDown = null;

	const transformControls = new TransformControls( camera );
	transformControls.addEventListener( 'axis-changed', function () {

		if ( editor.viewportShading !== 'realistic' ) render();

	} );
	transformControls.addEventListener( 'objectChange', function () {

		signals.objectChanged.dispatch( transformControls.object );

	} );
	transformControls.addEventListener( 'mouseDown', function () {

		const object = transformControls.object;

		objectPositionOnDown = object.position.clone();
		objectRotationOnDown = object.rotation.clone();
		objectScaleOnDown = object.scale.clone();

		controls.enabled = false;

	} );
	transformControls.addEventListener( 'mouseUp', function () {

		const object = transformControls.object;

		if ( object !== undefined ) {

			switch ( transformControls.getMode() ) {

				case 'translate':

					if ( ! objectPositionOnDown.equals( object.position ) ) {

						editor.execute( new SetPositionCommand( editor, object, object.position, objectPositionOnDown ) );

					}

					break;

				case 'rotate':

					if ( ! objectRotationOnDown.equals( object.rotation ) ) {

						editor.execute( new SetRotationCommand( editor, object, object.rotation, objectRotationOnDown ) );

					}

					break;

				case 'scale':

					if ( ! objectScaleOnDown.equals( object.scale ) ) {

						editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );

					}

					break;

			}

		}

		controls.enabled = true;

	} );

	sceneHelpers.add( transformControls.getHelper() );

	//

	const xr = new XR( editor, transformControls ); // eslint-disable-line no-unused-vars

	// events -------------------------------------------------

	function updateAspectRatio() {

		for ( const uuid in editor.cameras ) {

			const cam = editor.cameras[ uuid ];
			const aspect = container.dom.offsetWidth / container.dom.offsetHeight;

			if ( cam.isPerspectiveCamera ) {

				cam.aspect = aspect;

			} else {

				cam.left = - aspect;
				cam.right = aspect;

			}

			cam.updateProjectionMatrix();

			const cameraHelper = editor.helpers[ cam.id ];
			if ( cameraHelper ) cameraHelper.update();

		}

	}

	const onDownPosition = new THREE.Vector2();
	const onUpPosition = new THREE.Vector2();
	const onDoubleClickPosition = new THREE.Vector2();

	function getMousePosition( dom, x, y ) {

		const rect = dom.getBoundingClientRect();
		return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

	}

	function handleClick() {

		if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {

			const intersects = selector.getPointerIntersects( onUpPosition, camera );
			signals.intersectionsDetected.dispatch( intersects );

			render();

		}

	}

	function onMouseDown( event ) {

		// IMPORTANT: renderer can be null until rendererCreated fires
		if ( renderer === null ) return;
		if ( event.target !== renderer.domElement ) return;

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'mouseup', onMouseUp );

	}

	function onMouseUp( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'mouseup', onMouseUp );

	}

	function onTouchStart( event ) {

		const touch = event.changedTouches[ 0 ];
		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'touchend', onTouchEnd );

	}

	function onTouchEnd( event ) {

		const touch = event.changedTouches[ 0 ];
		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'touchend', onTouchEnd );

	}

	function onDoubleClick( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDoubleClickPosition.fromArray( array );

		const intersects = selector.getPointerIntersects( onDoubleClickPosition, camera );

		if ( intersects.length > 0 ) {

			const intersect = intersects[ 0 ];
			signals.objectFocused.dispatch( intersect.object );

		}

	}

	container.dom.addEventListener( 'mousedown', onMouseDown );
	container.dom.addEventListener( 'touchstart', onTouchStart, { passive: false } );
	container.dom.addEventListener( 'dblclick', onDoubleClick );

	// controls must be added after main logic ----------------

	const controls = new EditorControls( camera );
	controls.addEventListener( 'change', function () {

		signals.cameraChanged.dispatch( camera );
		signals.refreshSidebarObject3D.dispatch( camera );

	} );

if ( viewHelper ) viewHelper.center = controls.center;
	editor.controls = controls;

	// signals ------------------------------------------------

	signals.editorCleared.add( function () {

		controls.center.set( 0, 0, 0 );

		if ( pathtracer ) pathtracer.reset();

		initPT();
		render();

	} );

	signals.transformModeChanged.add( function ( mode ) {

		transformControls.setMode( mode );
		render();

	} );

	signals.snapChanged.add( function ( dist ) {

		transformControls.setTranslationSnap( dist );

	} );

	signals.spaceChanged.add( function ( space ) {

		transformControls.setSpace( space );
		render();

	} );

	signals.rendererUpdated.add( function () {

		scene.traverse( function ( child ) {

			if ( child.material !== undefined ) {

				child.material.needsUpdate = true;

			}

		} );

		render();

	} );

	signals.rendererCreated.add( function ( newRenderer ) {

		// clean up old renderer if exists
		if ( renderer !== null ) {

			renderer.setAnimationLoop( null );
			renderer.dispose();

			if ( pmremGenerator ) pmremGenerator.dispose();

			if ( renderer.domElement && renderer.domElement.parentNode === container.dom ) {

				container.dom.removeChild( renderer.domElement );

			}

		}

		controls.connect( newRenderer.domElement );
		transformControls.connect( newRenderer.domElement );

		renderer = newRenderer;

		renderer.setAnimationLoop( animate );
		renderer.setClearColor( 0xaaaaaa );

		if ( window.matchMedia ) {

			const mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
			mediaQuery.addEventListener( 'change', function ( event ) {

				if ( renderer === null ) return;

				renderer.setClearColor( event.matches ? 0x333333 : 0xaaaaaa );
				updateGridColors( grid1, grid2, event.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

				render();

			} );

			renderer.setClearColor( mediaQuery.matches ? 0x333333 : 0xaaaaaa );
			updateGridColors( grid1, grid2, mediaQuery.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

		}

		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		pmremGenerator = new THREE.PMREMGenerator( renderer );
		pmremGenerator.compileEquirectangularShader();

		pathtracer = new ViewportPathtracer( renderer );

		container.dom.appendChild( renderer.domElement );

		// If the app boots already in SOLID, make sure hooks exist
		if ( editor.viewportShading === 'solid' ) {
			ensureSolidHooksEnabled();
			scene.overrideMaterial = SOLID_OVERRIDE;
		}

		render();

	} );

	signals.rendererDetectKTX2Support.add( function ( ktx2Loader ) {

		if ( renderer === null ) return;
		ktx2Loader.detectSupport( renderer );

	} );

	signals.sceneGraphChanged.add( function () {

		initPT();

		// new meshes can appear; ensure solid hooks stay applied when needed
		if ( editor.viewportShading === 'solid' ) ensureSolidHooksEnabled();

		render();

	} );

	signals.cameraChanged.add( function () {

		if ( pathtracer ) pathtracer.reset();
		render();

	} );

	signals.objectSelected.add( function ( object ) {

		selectionBox.visible = false;
		transformControls.detach();

		if ( object !== null && object !== scene && object !== camera ) {

			box.setFromObject( object, true );

			if ( box.isEmpty() === false ) {

				selectionBox.visible = true;

			}

			transformControls.attach( object );

		}

		render();

	} );

	signals.objectFocused.add( function ( object ) {

		controls.focus( object );

	} );

	signals.geometryChanged.add( function ( object ) {

		if ( object !== undefined ) {

			box.setFromObject( object, true );

		}

		initPT();
		render();

	} );

	signals.objectChanged.add( function ( object ) {

		if ( editor.selected === object ) {

			box.setFromObject( object, true );

		}

		if ( object.isPerspectiveCamera ) {

			object.updateProjectionMatrix();

		}

		const helper = editor.helpers[ object.id ];

		if ( helper !== undefined && helper.isSkeletonHelper !== true ) {

			helper.update();

		}

		initPT();

		// if colors/materials change while in SOLID, hooks ensure it renders
		if ( editor.viewportShading === 'solid' ) ensureSolidHooksEnabled();

		render();

	} );

	signals.objectRemoved.add( function ( object ) {

		controls.enabled = true; // see #14180

		if ( object === transformControls.object ) {

			transformControls.detach();

		}

	} );

	signals.materialChanged.add( function () {

		updatePTMaterials();

		if ( editor.viewportShading === 'solid' ) ensureSolidHooksEnabled();

		render();

	} );

	// background --------------------------------------------

	signals.sceneBackgroundChanged.add( function (
		backgroundType,
		backgroundColor,
		backgroundTexture,
		backgroundEquirectangularTexture,
		backgroundColorSpace,
		backgroundBlurriness,
		backgroundIntensity,
		backgroundRotation
	) {

		scene.background = null;

		switch ( backgroundType ) {

			case 'Color':

				scene.background = new THREE.Color( backgroundColor );

				break;

			case 'Texture':

				if ( backgroundTexture ) {

					backgroundTexture.colorSpace = backgroundColorSpace;
					backgroundTexture.needsUpdate = true;

					scene.background = backgroundTexture;

				}

				break;

			case 'Equirectangular':

				if ( backgroundEquirectangularTexture ) {

					backgroundEquirectangularTexture.mapping = THREE.EquirectangularReflectionMapping;
					backgroundEquirectangularTexture.colorSpace = backgroundColorSpace;
					backgroundEquirectangularTexture.needsUpdate = true;

					scene.background = backgroundEquirectangularTexture;
					scene.backgroundBlurriness = backgroundBlurriness;
					scene.backgroundIntensity = backgroundIntensity;
					scene.backgroundRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

					if ( useBackgroundAsEnvironment ) {

						scene.environment = scene.background;
						scene.environmentRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

					}

				}

				break;

		}

		updatePTBackground();
		render();

	} );

	// environment -------------------------------------------

	let useBackgroundAsEnvironment = false;

	signals.sceneEnvironmentChanged.add( function ( environmentType, environmentEquirectangularTexture ) {

		scene.environment = null;
		useBackgroundAsEnvironment = false;

		switch ( environmentType ) {

			case 'Background':

				useBackgroundAsEnvironment = true;

				if ( scene.background !== null && scene.background.isTexture ) {

					scene.environment = scene.background;
					scene.environment.mapping = THREE.EquirectangularReflectionMapping;
					scene.environmentRotation.y = scene.backgroundRotation.y;

				}

				break;

			case 'Equirectangular':

				if ( environmentEquirectangularTexture ) {

					scene.environment = environmentEquirectangularTexture;
					scene.environment.mapping = THREE.EquirectangularReflectionMapping;

				}

				break;

			case 'Room':

				if ( pmremGenerator ) {

					scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

				}

				break;

		}

		updatePTEnvironment();
		render();

	} );

	// fog ----------------------------------------------------

	signals.sceneFogChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'None':
				scene.fog = null;
				break;

			case 'Fog':
				scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
				break;

			case 'FogExp2':
				scene.fog = new THREE.FogExp2( fogColor, fogDensity );
				break;

		}

		render();

	} );

	signals.sceneFogSettingsChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'Fog':
				scene.fog.color.setHex( fogColor );
				scene.fog.near = fogNear;
				scene.fog.far = fogFar;
				break;

			case 'FogExp2':
				scene.fog.color.setHex( fogColor );
				scene.fog.density = fogDensity;
				break;

		}

		render();

	} );

	signals.viewportCameraChanged.add( function () {

		const viewportCamera = editor.viewportCamera;

		if ( viewportCamera.isPerspectiveCamera || viewportCamera.isOrthographicCamera ) {

			updateAspectRatio();

		}

		// disable EditorControls when setting a user camera
		controls.enabled = ( viewportCamera === editor.camera );

		initPT();
		render();

	} );

	signals.viewportShadingChanged.add( function () {

		const viewportShading = editor.viewportShading;

		// Always clear override first, then apply per mode
		scene.overrideMaterial = null;

		// Restore any SOLID hooks unless we are going into solid
		if ( viewportShading !== 'solid' ) restoreSolidHooks();

		switch ( viewportShading ) {

			case 'realistic':
				if ( pathtracer ) pathtracer.init( scene, editor.viewportCamera );
				break;

			case 'solid':
				ensureSolidHooksEnabled();
				scene.overrideMaterial = SOLID_OVERRIDE;
				break;

			case 'normals':
				scene.overrideMaterial = new THREE.MeshNormalMaterial();
				break;

			case 'wireframe':
				scene.overrideMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } );
				break;

		}

		render();

	} );

	// resize -------------------------------------------------

	signals.windowResize.add( function () {

		updateAspectRatio();

		// renderer may still be null if rendererCreated hasn’t fired yet
		if ( renderer === null ) return;

		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		if ( pathtracer ) {

			pathtracer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		}

		render();

	} );

	signals.showHelpersChanged.add( function ( appearanceStates ) {

		grid.visible = appearanceStates.gridHelper;

		sceneHelpers.traverse( function ( object ) {

			switch ( object.type ) {

				case 'CameraHelper':
					object.visible = appearanceStates.cameraHelpers;
					break;

				case 'PointLightHelper':
				case 'DirectionalLightHelper':
				case 'SpotLightHelper':
				case 'HemisphereLightHelper':
					object.visible = appearanceStates.lightHelpers;
					break;

				case 'SkeletonHelper':
					object.visible = appearanceStates.skeletonHelpers;
					break;

				default:
					// not a helper
					break;

			}

		} );

		render();

	} );

	signals.cameraResetted.add( updateAspectRatio );

	// animations ---------------------------------------------

	let prevActionsInUse = 0;
	const clock = new THREE.Clock();

	function animate() {

		// renderer can be null during early boot
		if ( renderer === null ) return;

		const mixer = editor.mixer;
		const delta = clock.getDelta();

		let needsUpdate = false;

		const actions = mixer.stats.actions;

		if ( actions.inUse > 0 || prevActionsInUse > 0 ) {

			prevActionsInUse = actions.inUse;

			mixer.update( delta );
			needsUpdate = true;

			if ( editor.selected !== null ) {

				editor.selected.updateWorldMatrix( false, true );
				selectionBox.box.setFromObject( editor.selected, true );

			}

		}
if ( viewHelper && viewHelper.animating === true ) {

	viewHelper.update( delta );
	needsUpdate = true;

}


		if ( renderer.xr && renderer.xr.isPresenting === true ) {

			needsUpdate = true;

		}

		if ( needsUpdate === true ) render();

		updatePT();

	}

	function initPT() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.init( scene, editor.viewportCamera );

		}

	}

	function updatePTBackground() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.setBackground( scene.background, scene.backgroundBlurriness );

		}

	}

	function updatePTEnvironment() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.setEnvironment( scene.environment );

		}

	}

	function updatePTMaterials() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.updateMaterials();

		}

	}

	function updatePT() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.update();
			editor.signals.pathTracerUpdated.dispatch( pathtracer.getSamples() );

		}

	}

	// render -------------------------------------------------

	let startTime = 0;
	let endTime = 0;

	function render() {

		if ( renderer === null ) return;

		startTime = performance.now();

		renderer.setViewport( 0, 0, container.dom.offsetWidth, container.dom.offsetHeight );
		renderer.render( scene, editor.viewportCamera );

		if ( camera === editor.viewportCamera ) {

			renderer.autoClear = false;

			if ( grid.visible === true ) renderer.render( grid, camera );
			if ( sceneHelpers.visible === true ) renderer.render( sceneHelpers, camera );
if ( viewHelper && renderer.xr && renderer.xr.isPresenting !== true ) viewHelper.render( renderer );

			renderer.autoClear = true;

		}

		endTime = performance.now();
		editor.signals.sceneRendered.dispatch( endTime - startTime );

	}

	return container;

}

function updateGridColors( grid1, grid2, colors ) {

	grid1.material.color.setHex( colors[ 0 ] );
	grid2.material.color.setHex( colors[ 1 ] );

}

export { Viewport };
