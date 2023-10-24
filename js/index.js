import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { PointerLockControls } from './addons/PointerLockControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const fbxLoader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
var character, characterHead, controls, characterSpine;
var gui;

const light = new THREE.AmbientLight(0xffffff, 4)
scene.add( light );

var mixer, activeAction, lastAction;
var keyDown = {};
var animationActions = []
var jumpAnimation;
var jumping = false;
var availableAgents = ["yuji", "gojo", "nobara", "megumi"]
var agentOptionMapping = {
    "Yuji": () => {
        selectAgent("yuji")
    },
    "Gojo": () => {
        selectAgent("gojo")
    },
    "Megumi": () => {
        selectAgent("megumi")
    },
    "Nobara": () => {
        selectAgent("nobara")
    },
    "Change Orientation": () => {orientation *= -1}
}
var character = "yuji"
var orientation = -1;

function selectAgent(agent) {
    window.location.href = "/?agent="+agent
}

function get(name){
    if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
       return decodeURIComponent(name[1]);
 }

if (availableAgents.includes(get("agent"))) {
    character = get("agent")
}

textureLoader.load('textures/ground.jpg', function ( texture ) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set( 0, 0 );
    texture.repeat.set( 6, 6 );
    const geometry = new THREE.BoxGeometry( 100, 1, 100 );
    const material = new THREE.MeshBasicMaterial( {map: texture, overdraw: 0.5});
    const cube = new THREE.Mesh( geometry, material );

    cube.position.y = -0.5
    scene.add( cube );
});

fbxLoader.load(
    "model/"+character+"/"+character+".fbx",
    (model) => {
        model.traverse(child => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => {mat.transparent = false; mat.vertexColors = false})
                } else {
                    child.material.transparent = false
                    child.material.vertexColors = false
                }
            }
          })
        var box = new THREE.Box3().setFromObject( model )
        var size = new THREE.Vector3();
        var scale = 3/box.getSize( size ).y;
        model.scale.set(scale, scale, scale);
        character = model;
        character.walking = false;
        characterHead = model.getObjectByName("zeweier_Skin02_high_face001");
        scene.add(character)
        characterSpine = model.getObjectByName("mixamorigSpine1")
        controls = new PointerLockControls( model.getObjectByName("mixamorigSpine1"), document.body, model.getObjectByName("mixamorigHips"), model.getObjectByName("mixamorigHead"), model, camera);
        controls.pointerSpeed = 0.5
        controls.maxPolarAngle = 3/4 * Math.PI
        controls.minPolarAngle = 1/5 * Math.PI
        document.addEventListener("click", () => {
            controls.lock()
        })

        mixer = new THREE.AnimationMixer(model)
        var animationAction = mixer.clipAction(model.animations.find((clip) => clip.name.includes("Idle")))
        animationActions.push(animationAction)
        var animationAction = mixer.clipAction(model.animations.find((clip) => clip.name.includes("Walking")))
        animationActions.push(animationAction)
        jumpAnimation = mixer.clipAction(model.animations.find((clip) => clip.name.includes("Jumping")))
        jumpAnimation.setLoop(THREE.LoopOnce);
        jumpAnimation.timeScale = 1.25

        mixer.addEventListener("finished", (event) => {
            if (event.action._clip.name.includes("Jumping")) {
                jumpAnimation.fadeOut(0.5)
                jumping = false;
            }
        })

        activeAction = animationActions[0]
        activeAction.play()
        activeAction.paused = true
        character.activeAction = activeAction

        document.body.innerHTML = ""
        document.body.appendChild( renderer.domElement );

        gui = new dat.GUI()
        gui.add(agentOptionMapping, 'Megumi')
        gui.add(agentOptionMapping, 'Gojo')
        gui.add(agentOptionMapping, 'Nobara')
        gui.add(agentOptionMapping, 'Yuji')
        gui.add(agentOptionMapping, "Change Orientation")

    },
    (xhr) => {},
    (error) => {}
)

function toggle() {
    lastAction = activeAction;
    if (animationActions.indexOf(lastAction) == 0) {
        activeAction = animationActions[1]
        lastAction.fadeOut(0.5)
        activeAction.reset()
        activeAction.fadeIn(0.5)
        activeAction.play()
    } else {
        activeAction = animationActions[0]
        lastAction.fadeOut(0.5)
        activeAction.reset()
        activeAction.fadeIn(0.5)
        activeAction.play()
        activeAction.paused = true
    }
    character.activeAction = activeAction
}

function jump() {
    jumping = true
    jumpAnimation.reset()
    jumpAnimation.fadeIn(0.5)
    jumpAnimation.play()
}

let sky, sun;

sky = new Sky();
sky.scale.setScalar( 450000 );
scene.add( sky );

sun = new THREE.Vector3();

const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure
};

const uniforms = sky.material.uniforms;
uniforms[ 'turbidity' ].value = effectController.turbidity;
uniforms[ 'rayleigh' ].value = effectController.rayleigh;
uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
const theta = THREE.MathUtils.degToRad( effectController.azimuth );

sun.setFromSphericalCoords( 1, phi, theta );

uniforms[ 'sunPosition' ].value.copy( sun );

renderer.toneMappingExposure = effectController.exposure;

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

const clock = new THREE.Clock()

document.onkeydown = function(ev) {keyDown[ev.keyCode] = true;}
document.onkeyup = function(ev) {delete keyDown[ev.keyCode]}

function evaluateMovement() {
    if (keyDown[87]) {
        if (!character.walking) {
            toggle()
            character.walking = true;
        }
        controls.moveForward(-2)
    } else {
        if (character.walking) {
            toggle()
            character.walking = false;
        }
    }

    if (keyDown[32] && !jumping) {
        console.log('yi6')
        jump()
    }
}

function animate() {
	requestAnimationFrame( animate );

    if (mixer) {
        evaluateMovement();

        mixer.update(clock.getDelta())
        
        var headPos = character.position.clone()
        headPos.y += 2;
        
        camera.lookAt(headPos)

        controls.recalculateEuler1()
        var newpos = new THREE.Vector3(orientation * Math.sin(controls.calculateAngle())*4+character.position.x, 4, orientation*Math.cos(controls.calculateAngle())*4+character.position.z);

        camera.position.lerp(newpos, 0.4)
    }

	renderer.render( scene, camera );
}

animate();