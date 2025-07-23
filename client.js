import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';

const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');

// Check WebXR support and update loading bar
async function checkWebXRAndStart() {
    try {
        // Update loading bar to 25%
        loadingBar.style.width = '25%';
        
        let webxrSupported = false;
        if ('xr' in navigator) {
            try {
                webxrSupported = await navigator.xr.isSessionSupported('immersive-vr');
            } catch (e) {
                webxrSupported = false;
            }
        }
        
        // Update loading bar to 50%
        loadingBar.style.width = '50%';
        
        // Add WebXR status to loading screen
        const loadingContainer = document.getElementById('loading-bar-container');
        const statusText = document.createElement('div');
        statusText.style.color = 'white';
        statusText.style.marginTop = '20px';
        statusText.style.textAlign = 'center';
        statusText.textContent = webxrSupported ? 'WebXR VR Supported ✓' : 'WebXR VR Not Supported (Desktop Only)';
        loadingContainer.parentNode.appendChild(statusText);
        
        // Update loading bar to 75%
        loadingBar.style.width = '75%';
        
        // Wait a moment for user to see the status
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Complete loading
        loadingBar.style.width = '100%';
        
        // Wait a bit more then hide loading screen
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            animate();
        }, 500);
        
    } catch (error) {
        console.error('Error during initialization:', error);
        // Force start even if there's an error
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            animate();
        }, 1000);
    }
}

// Start the initialization
checkWebXRAndStart();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Room - wireframe walls but solid floor
const roomWalls = new THREE.LineSegments(
    new BoxLineGeometry(10, 10, 10, 10, 10, 10),
    new THREE.LineBasicMaterial({ color: 0x808080 })
);
roomWalls.geometry.translate(0, 5, 0);
scene.add(roomWalls);

// Add solid room floor (separate from teleportation floor)
const roomFloorGeometry = new THREE.PlaneGeometry(10, 10);
const roomFloorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.1
});
const roomFloor = new THREE.Mesh(roomFloorGeometry, roomFloorMaterial);
roomFloor.rotation.x = -Math.PI / 2;
roomFloor.position.y = 0;
roomFloor.receiveShadow = true;
scene.add(roomFloor);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 0.8);
pointLight.position.set(2, 5, 5);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 1024;
pointLight.shadow.mapSize.height = 1024;
scene.add(pointLight);

// Objects
const objects = [];
const geometry = new THREE.BoxGeometry(1, 1, 1);

// Create floor for teleportation
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    roughness: 0.8,
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

// Create interactive cubes with fixed IDs (positions and colors will be set by server)
const cubeIds = ['cube1', 'cube2', 'cube3', 'cube4', 'clock'];
let clockCube = null;

cubeIds.forEach((id) => {
    if (id === 'clock') {
        // Create digital clock cube
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.1,
            metalness: 0.8
        });
        
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 1, 0);
        cube.userData.id = id;
        cube.userData.type = 'clock';
        cube.userData.canvas = canvas;
        cube.userData.context = context;
        cube.userData.texture = texture;
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        objects.push(cube);
        clockCube = cube;
        
        // Initial clock update
        updateClockTexture(cube);
    } else {
        // Create regular cube (color will be set by server)
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // Temporary color, will be updated by server
            roughness: 0.7,
            metalness: 0.3
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 1, 0);
        cube.userData.id = id;
        cube.userData.type = 'cube';
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        objects.push(cube);
    }
});

// Function to update clock texture
function updateClockTexture(clockCube) {
    const canvas = clockCube.userData.canvas;
    const context = clockCube.userData.context;
    const texture = clockCube.userData.texture;
    
    // Clear canvas
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get current time
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    
    // Draw time
    context.fillStyle = '#00ff00';
    context.font = 'bold 48px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Draw time in center
    context.fillText(timeString, canvas.width / 2, canvas.height / 2 - 30);
    
    // Draw date below
    context.font = 'bold 32px monospace';
    context.fillText(dateString, canvas.width / 2, canvas.height / 2 + 30);
    
    // Update texture
    texture.needsUpdate = true;
}

// Update clock every second
setInterval(() => {
    if (clockCube) {
        updateClockTexture(clockCube);
    }
}, 1000);

camera.position.set(0, 5, 15);

// Player avatars and movement
const players = new Map();
let myPlayerId = null;
let lastPlayerUpdate = 0;

// Movement controls
const keys = {
    w: false, a: false, s: false, d: false,
    space: false, shift: false
};

const moveSpeed = 0.15;
const velocity = new THREE.Vector3();
let isFlying = false;

// Desktop Controls - disable when flying
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;

// Create player avatar function
function createPlayerAvatar(playerData) {
    // Create canvas for emoji
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Draw yellow circle background
    context.fillStyle = '#FFD700';
    context.beginPath();
    context.arc(128, 128, 120, 0, Math.PI * 2);
    context.fill();
    
    // Draw emoji
    context.font = '120px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(playerData.emoji, 128, 128);
    
    // Create texture and material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 2, 1);
    sprite.userData.playerId = playerData.id;
    sprite.userData.canvas = canvas;
    sprite.userData.context = context;
    sprite.userData.texture = texture;
    sprite.userData.emoji = playerData.emoji;
    
    // Position the avatar
    sprite.position.copy(playerData.position);
    
    scene.add(sprite);
    return sprite;
}

// Update player avatar rotation to face direction
function updatePlayerAvatar(sprite, playerData) {
    sprite.position.copy(playerData.position);
    
    // Make sprite always face camera but rotate based on player's looking direction
    sprite.lookAt(camera.position);
    
    // Apply player's Y rotation to the sprite
    sprite.rotation.z = -playerData.rotation.y;
}

// VR Controllers
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const controllerGrips = [];
const grabbedObjects = new Map();

// Teleportation setup
const teleportationMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32),
    new THREE.MeshBasicMaterial({ color: 0x0077ff })
);
teleportationMarker.rotation.x = -Math.PI / 2;
teleportationMarker.visible = false;
scene.add(teleportationMarker);

// Teleportation raycaster
const teleportRaycaster = new THREE.Raycaster();

for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
    scene.add(controller);
    controllers.push(controller);

    const controllerGrip = renderer.xr.getControllerGrip(i);
    controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
    scene.add(controllerGrip);
    controllerGrips.push(controllerGrip);

    // Add ray visualization
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff }));
    line.name = 'line';
    line.scale.z = 5;
    controller.add(line);
}

// Raycaster for desktop interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
let isDragging = false;
const dragPlane = new THREE.Plane();
const dragOffset = new THREE.Vector3();
const dragIntersection = new THREE.Vector3();

// Desktop mouse handling
function onMouseDown(event) {
    if (renderer.xr.isPresenting) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects);
    
    if (intersects.length > 0) {
        const object = intersects[0].object;
        
        // Request ownership of the object
        ws.send(JSON.stringify({
            type: 'grabObject',
            id: object.userData.id
        }));
        
        orbitControls.enabled = false;
        selectedObject = object;
        
        // Create a drag plane perpendicular to the camera
        dragPlane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(dragPlane.normal),
            selectedObject.position
        );
        
        // Calculate the offset from the intersection point to the object position
        raycaster.ray.intersectPlane(dragPlane, dragIntersection);
        dragOffset.subVectors(selectedObject.position, dragIntersection);
        
        isDragging = true;
    }
}

function onMouseMove(event) {
    // Update mouse position for hover effects
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Handle dragging
    if (isDragging && selectedObject) {
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(dragPlane, dragIntersection);
        selectedObject.position.copy(dragIntersection).add(dragOffset);
        
        // Keep the object within the room bounds
        selectedObject.position.x = Math.max(-4.5, Math.min(4.5, selectedObject.position.x));
        selectedObject.position.y = Math.max(0.5, Math.min(9.5, selectedObject.position.y));
        selectedObject.position.z = Math.max(-4.5, Math.min(4.5, selectedObject.position.z));
        
        // Send real-time movement updates
        ws.send(JSON.stringify({ 
            type: 'moveObject', 
            id: selectedObject.userData.id, 
            position: selectedObject.position 
        }));
    } else {
        // Hover effect
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objects);
        
        // Reset all objects to original color
        objects.forEach(obj => {
            if (!isDragging || obj !== selectedObject) {
                obj.material.emissive.setHex(0x000000);
            }
        });
        
        // Highlight hovered object
        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            if (!isDragging || hoveredObject !== selectedObject) {
                hoveredObject.material.emissive.setHex(0x222222);
            }
        }
    }
}

function onMouseUp() {
    if (selectedObject) {
        selectedObject.material.emissive.setHex(0x000000);
        
        // Release ownership of the object
        ws.send(JSON.stringify({
            type: 'releaseObject',
            id: selectedObject.userData.id,
            position: selectedObject.position
        }));
        
        selectedObject = null;
    }
    isDragging = false;
    orbitControls.enabled = true;
}

// VR controller handling
function onSelectStart(event) {
    const controller = event.target;
    controller.userData.isSelecting = true;
    
    // Check for object interactions first
    const intersections = getIntersections(controller);
    
    if (intersections.length > 0) {
        const object = intersections[0].object;
        // Only grab cubes, not the floor
        if (objects.includes(object)) {
            // Request ownership of the object
            ws.send(JSON.stringify({
                type: 'grabObject',
                id: object.userData.id
            }));
            
            grabbedObjects.set(controller, {
                object: object,
                offset: new THREE.Vector3().subVectors(object.position, controller.position)
            });
            object.material.emissive.setHex(0x444444);
            return; // Exit if we grabbed an object
        }
    }
    
    // If no object was grabbed, try teleportation
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    teleportRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    teleportRaycaster.ray.direction.set(0, -1, -1).applyMatrix4(tempMatrix).normalize();
    
    const intersects = teleportRaycaster.intersectObject(floor);
    
    if (intersects.length > 0) {
        // Show teleportation marker
        teleportationMarker.position.copy(intersects[0].point);
        teleportationMarker.visible = true;
        
        // Store teleport target
        controller.userData.teleportTarget = intersects[0].point.clone();
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    
    // Handle object release
    const grabbed = grabbedObjects.get(controller);
    if (grabbed) {
        grabbed.object.material.emissive.setHex(0x000000);
        
        // Release ownership of the object
        ws.send(JSON.stringify({
            type: 'releaseObject',
            id: grabbed.object.userData.id,
            position: grabbed.object.position
        }));
        
        grabbedObjects.delete(controller);
    }
    
    // Handle teleportation
    if (controller.userData.teleportTarget) {
        // Get camera rig (parent of camera) to move the user
        const cameraRig = renderer.xr.getCamera().parent;
        if (cameraRig) {
            // Adjust Y position to maintain user height
            const currentY = cameraRig.position.y;
            cameraRig.position.copy(controller.userData.teleportTarget);
            cameraRig.position.y = currentY;
        }
        
        // Hide teleportation marker
        teleportationMarker.visible = false;
        controller.userData.teleportTarget = null;
    }
}

function getIntersections(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    return raycaster.intersectObjects(objects);
}

function sendObjectUpdate(object) {
    ws.send(JSON.stringify({ 
        type: 'moveObject', 
        id: object.userData.id, 
        position: object.position 
    }));
}

// WebSocket
const ws = new WebSocket(`ws://${window.location.host}`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'initialState') {
        myPlayerId = data.yourId;
        
        // Initialize objects
        for (const id in data.objects) {
            const object = objects.find(o => o.userData.id === id);
            if (object) {
                const serverObj = data.objects[id];
                object.position.copy(serverObj);
                
                // Set color for regular cubes (not clock)
                if (object.userData.type === 'cube' && serverObj.color !== undefined) {
                    object.material.color.setHex(serverObj.color);
                    object.userData.originalColor = object.material.color.clone();
                }
            }
        }
        
        // Initialize other players
        for (const id in data.players) {
            if (id !== myPlayerId) {
                const playerData = data.players[id];
                const avatar = createPlayerAvatar(playerData);
                players.set(id, avatar);
            }
        }
    } else if (data.type === 'objectGrabbed') {
        const object = objects.find(o => o.userData.id === data.id);
        if (object && !data.isOwner) {
            // Visual feedback that object is being controlled by someone else
            object.material.emissive.setHex(0x444444);
        }
    } else if (data.type === 'objectReleased') {
        const object = objects.find(o => o.userData.id === data.id);
        if (object) {
            object.material.emissive.setHex(0x000000);
            object.position.copy(data.position);
        }
    } else if (data.type === 'objectMoving') {
        const object = objects.find(o => o.userData.id === data.id);
        if (object) {
            object.position.copy(data.position);
        }
    } else if (data.type === 'objectMoved') {
        const object = objects.find(o => o.userData.id === data.id);
        if (object) {
            object.position.copy(data.position);
        }
    } else if (data.type === 'playerJoined') {
        const playerData = data.player;
        if (playerData.id !== myPlayerId) {
            const avatar = createPlayerAvatar(playerData);
            players.set(playerData.id, avatar);
        }
    } else if (data.type === 'playerMoved') {
        const playerData = data.player;
        if (playerData.id !== myPlayerId) {
            const avatar = players.get(playerData.id);
            if (avatar) {
                updatePlayerAvatar(avatar, playerData);
            }
        }
    } else if (data.type === 'playerLeft') {
        const playerId = data.playerId;
        const avatar = players.get(playerId);
        if (avatar) {
            scene.remove(avatar);
            players.delete(playerId);
        }
    }
};

// Send player update to server
function sendPlayerUpdate() {
    if (myPlayerId && ws.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - lastPlayerUpdate > 50) { // Throttle to 20fps
            ws.send(JSON.stringify({
                type: 'updatePlayer',
                position: camera.position,
                rotation: camera.rotation
            }));
            lastPlayerUpdate = now;
        }
    }
}

// VR Button setup
const vrButton = document.getElementById('vr-button');

// Check for WebXR support and show VR button
if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
            vrButton.style.display = 'block';
            vrButton.addEventListener('click', () => {
                if (renderer.xr.isPresenting) {
                    renderer.xr.getSession().end();
                } else {
                    navigator.xr.requestSession('immersive-vr', {
                        requiredFeatures: ['local-floor']
                    }).then((session) => {
                        renderer.xr.setSession(session);
                        vrButton.textContent = 'Exit VR';
                    });
                }
            });
        }
    });
}

// Update VR button text based on session state
renderer.xr.addEventListener('sessionstart', () => {
    vrButton.textContent = 'Exit VR';
});

renderer.xr.addEventListener('sessionend', () => {
    vrButton.textContent = 'Enter VR';
});

// Keyboard controls
window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW':
            keys.w = true;
            break;
        case 'KeyA':
            keys.a = true;
            break;
        case 'KeyS':
            keys.s = true;
            break;
        case 'KeyD':
            keys.d = true;
            break;
        case 'Space':
            keys.space = true;
            event.preventDefault();
            break;
        case 'ShiftLeft':
            keys.shift = true;
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW':
            keys.w = false;
            break;
        case 'KeyA':
            keys.a = false;
            break;
        case 'KeyS':
            keys.s = false;
            break;
        case 'KeyD':
            keys.d = false;
            break;
        case 'Space':
            keys.space = false;
            break;
        case 'ShiftLeft':
            keys.shift = false;
            break;
    }
});

// Event listeners
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    // Handle keyboard movement (only when not in VR and not dragging)
    if (!renderer.xr.isPresenting && !isDragging) {
        velocity.set(0, 0, 0);
        
        // Check if any movement keys are pressed
        isFlying = keys.w || keys.a || keys.s || keys.d || keys.space || keys.shift;
        
        if (isFlying) {
            // Disable orbit controls when flying
            orbitControls.enabled = false;
            
            // Get camera's forward direction (including Y component for 3D movement)
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            forward.normalize();
            
            // Get camera's right direction
            const right = new THREE.Vector3();
            right.crossVectors(forward, camera.up).normalize();
            
            // Get camera's up direction
            const up = new THREE.Vector3();
            up.copy(camera.up).normalize();
            
            // Apply movement based on keys - Minecraft creative mode style
            if (keys.w) velocity.add(forward.clone().multiplyScalar(moveSpeed)); // Forward (including up/down based on look direction)
            if (keys.s) velocity.add(forward.clone().multiplyScalar(-moveSpeed)); // Backward
            if (keys.a) velocity.add(right.clone().multiplyScalar(-moveSpeed)); // Left
            if (keys.d) velocity.add(right.clone().multiplyScalar(moveSpeed)); // Right
            if (keys.space) velocity.add(up.clone().multiplyScalar(moveSpeed)); // Up (world up)
            if (keys.shift) velocity.add(up.clone().multiplyScalar(-moveSpeed)); // Down (world down)
            
            // Apply movement to camera
            camera.position.add(velocity);
            
            // Keep camera within room bounds
            camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x));
            camera.position.y = Math.max(0.5, Math.min(9.5, camera.position.y));
            camera.position.z = Math.max(-4.5, Math.min(4.5, camera.position.z));
            
            // Send player update
            sendPlayerUpdate();
        } else {
            // Re-enable orbit controls when not flying
            orbitControls.enabled = true;
        }
    }
    
    // Update grabbed objects in VR
    grabbedObjects.forEach((grabbed, controller) => {
        grabbed.object.position.copy(controller.position).add(grabbed.offset);
        
        // Send real-time movement updates for VR
        ws.send(JSON.stringify({ 
            type: 'moveObject', 
            id: grabbed.object.userData.id, 
            position: grabbed.object.position 
        }));
    });
    
    if (!renderer.xr.isPresenting) {
        orbitControls.update();
    }
    
    renderer.render(scene, camera);
}
