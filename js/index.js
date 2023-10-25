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
var character, controls;
var gui;

const light = new THREE.AmbientLight(0xffffff, 4)
scene.add( light );

var mixer, activeAction, lastAction;
var keyDown = {};
var animationActions = []
var idleJumpAnimation, runningJumpAnimation;
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
var characterType = "dynamic"
var character = "character"
var skin = "cyborg"
var isDynamic = 2;
var orientation = -1;
var skins = ["criminal", "cyborg", "skater1", "skater2", "human1", "human2", "zombie1", "zombie2"]
var dynamicOptions
var newDynamicOptions = function() {
    this.Skin = skin
}

function selectAgent(agent) {
    if (agent == undefined) {
        agent = dynamicOptions.Skin
    }
    var onlyUrl = window.location.href.replace(window.location.search,'');    
    if (onlyUrl.indexOf('?') > -1){
        onlyUrl += '&agent='+agent
    } else {
        onlyUrl += '?agent='+agent
    }
    window.location.href = onlyUrl;
}

function get(name){
    if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
       return decodeURIComponent(name[1]);
 }

if (availableAgents.includes(get("agent"))) {
    characterType = "jjk"
    character = get("agent")
    isDynamic = 1
} if (skins.includes(get("agent"))) {
    characterType = "dynamic"
    skin = get("agent")
    isDynamic = 2
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
    "model/"+characterType+"/"+character+"/"+character+".fbx",
    (model) => {
        var modelMaterial;
        if (isDynamic == 2) {
            textureLoader.load('model/dynamic/textures/'+skin+'.png', function ( texture ) {
                modelMaterial = new THREE.MeshBasicMaterial( {map: texture});
                model.children[1].material = modelMaterial
            })
        }
        if (isDynamic == 1) {
            model.traverse(child => {
                if (child.isMesh) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((mat) => {
                            mat.transparent = false; 
                            mat.vertexColors = false;
                        })
                    } else {
                        child.material.transparent = false
                        child.material.vertexColors = false
                    }
                    
                }
            })
        }
        var box = new THREE.Box3().setFromObject( model )
        var size = new THREE.Vector3();
        var scale = 3/box.getSize( size ).y;
        model.scale.set(scale, scale, scale);
        character = model;
        character.movementState = 0;
        scene.add(character)
        controls = new PointerLockControls( model.getObjectByName("mixamorigSpine1"), document.body, model.getObjectByName("mixamorigHips"), model.getObjectByName("mixamorigHead"), model, camera);
        controls.pointerSpeed = 0.5
        controls.maxPolarAngle = 3/4 * Math.PI
        controls.minPolarAngle = 1/5 * Math.PI
        document.addEventListener("click", () => {
            controls.lock()
        })

        document.body.innerHTML = ""
        document.body.appendChild( renderer.domElement );

        mixer = new THREE.AnimationMixer(model)

        var animationAction = mixer.clipAction(model.animations.find((clip) => clip.name === "Armature|Idle"))
        animationActions.push(animationAction)
        animationAction = mixer.clipAction(model.animations.find((clip) => clip.name === "Armature|Walking"))
        animationActions.push(animationAction)
        animationAction = mixer.clipAction(model.animations.find((clip) => clip.name === "Armature|Running"))
        animationActions.push(animationAction)
        animationAction = mixer.clipAction(model.animations.find((clip) => clip.name === "Armature|WalkingBackwards"))
        animationActions.push(animationAction)

        idleJumpAnimation = mixer.clipAction(model.animations.find((clip) => clip.name === "Armature|Jump"))
        idleJumpAnimation.setLoop(THREE.LoopOnce);
        idleJumpAnimation.timeScale = 1.1
        runningJumpAnimation = mixer.clipAction(model.animations.find((clip) => clip.name === "Armature|JumpRunning"))
        runningJumpAnimation.setLoop(THREE.LoopOnce);

        activeAction = animationActions[0]
        activeAction.play()
        activeAction.paused = true
        character.activeAction = activeAction

        gui = new dat.GUI()
        var jjkFolder = gui.addFolder("Jujutsu Kaisen")
        jjkFolder.add(agentOptionMapping, 'Yuji')
        jjkFolder.add(agentOptionMapping, 'Gojo')
        jjkFolder.add(agentOptionMapping, 'Megumi')
        jjkFolder.add(agentOptionMapping, 'Nobara')
        var dynamicFolder = gui.addFolder("Dynamic Characters")
        dynamicOptions = new newDynamicOptions()
        var dropdown = dynamicFolder.add(dynamicOptions, 'Skin',skins);
        dropdown.setValue(dynamicOptions.Skin)
        dropdown.onChange(selectAgent)
        gui.add(agentOptionMapping, "Change Orientation")

    },
)

function action(index) {
    lastAction = activeAction;
    activeAction = animationActions[index]
    lastAction.fadeOut(0.5)
    activeAction.reset()
    activeAction.fadeIn(0.5)
    activeAction.play()
    if (index == 0) {
        activeAction.paused = true
    }
    character.activeAction = activeAction
}

function jump() {
    jumping = true
    activeAction.fadeOut(0.5)
    if (character.movementState == 0) {
        idleJumpAnimation.reset()
        idleJumpAnimation.fadeIn(0.25)
        idleJumpAnimation.play()
        var time = idleJumpAnimation._clip.duration/1.1
        setTimeout(() => {
            idleJumpAnimation.fadeOut(0.25)
            activeAction.reset()
            activeAction.fadeIn(0.25)
            activeAction.play()
            activeAction.paused = true
            setTimeout(() => {jumping = false;}, 250)
        }, (time-0.25)*1000)
    } else {
        runningJumpAnimation.reset()
        runningJumpAnimation.fadeIn(0.5)
        runningJumpAnimation.play()
        var time = runningJumpAnimation._clip.duration/1.2
        setTimeout(() => {
            runningJumpAnimation.fadeOut(0.25)
            activeAction.reset()
            activeAction.fadeIn(0.5)
            activeAction.play()
            setTimeout(() => {jumping = false;}, 250)
        }, (time-0.25)*1000)
    }
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
        var movementSpeed = 5 * isDynamic
        if (keyDown[17]) {
            if (character.movementState != 2) {
                character.movementState = 2
                action(2)
            }
            controls.moveForward(-movementSpeed)
        } else {
            var movementSpeed = 3 * isDynamic
            if (character.movementState != 1) {
                action(1)
                character.movementState = 1;
            }
            controls.moveForward(-movementSpeed)
        }
    } else {
        if (character.movementState != 0 && character.movementState != 3) {
            action(0)
            character.movementState = 0;
        }
        if (keyDown[83]) {
            var movementSpeed = 2 * isDynamic
            if (character.movementState != 3) {
                action(3)
                character.movementState = 3;
            }
            controls.moveForward(movementSpeed)
        } else {
            if (character.movementState == 3) {
                action(0)
                character.movementState = 0;
            }
        }
    }

    if (keyDown[32] && !jumping) {
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

        camera.position.lerp(newpos, 0.2)
    }

	renderer.render( scene, camera );
}

animate();