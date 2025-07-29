# Development Plan for Project Cube MR

This document outlines the development plan for creating a real-time collaborative 3D environment with a movable cube, supporting both desktop and VR/MR experiences.

## 1. HTML Structure (`index.html`)

- **Objective:** Create the basic HTML structure for the application.
- **Tasks:**
    - Set up a standard HTML5 document.
    - Include a `<canvas>` element which will be used by `three.js` to render the 3D scene.
    - Add a button or UI element to enable the user to enter VR/MR mode.
    - Link to the necessary JavaScript files, including the `three.js` library and our custom `client.js` application logic.

## 2. Client-Side JavaScript (`client.js`)

- **Objective:** Implement the client-side logic for the 3D environment and user interaction.
- **Sub-sections:**
    - **Scene Setup:**
        - Initialize the `three.js` scene, camera (perspective), and renderer.
        - Add lighting to the scene for visibility (e.g., `AmbientLight` and `DirectionalLight`).
        - Create a ground plane or floor for context.
        - Create the central cube object (`BoxGeometry` with `MeshStandardMaterial`).
    - **WebSocket Connection:**
        - Establish a connection to the WebSocket server.
        - Implement handlers for messages received from the server (e.g., updates to the cube's position, which client has control).
        - Create functions to send client actions to the server (e.g., when the user moves the cube).
    - **Controls:**
        - Implement desktop controls:
            - Use keyboard events (WASD) for camera movement.
            - Use mouse events for looking around and interacting with the cube (e.g., `PointerLockControls`).
        - Implement interaction for grabbing and moving the cube with the mouse.
    - **Render Loop:**
        - Create a `requestAnimationFrame` loop for continuous rendering of the scene.
        - Inside the loop, update the positions of the camera and any animated objects based on user input or server data.

## 3. Server-Side JavaScript (`server.js`)

- **Objective:** Develop the server to handle real-time communication and state management.
- **Sub-sections:**
    - **HTTP Server:**
        - Create a basic HTTP server to serve the `index.html`, `client.js`, and any other static assets.
    - **WebSocket Server:**
        - Set up a WebSocket server using the `ws` library.
        - Manage a list of all connected clients.
    - **State Management:**
        - Maintain the authoritative state of the 3D world, particularly the cube's position and rotation.
        - Implement a mechanism for priority control, allowing the first user who "grabs" the cube to have exclusive control over its movement.
    - **Message Handling:**
        - Process incoming messages from clients (e.g., a client is trying to move the cube).
        - When the state changes (e.g., the cube is moved), broadcast the updated state to all connected clients to ensure everyone sees the same thing in real-time.

## 4. VR/MR Integration (`WebXR`)

- **Objective:** Add support for immersive VR/MR experiences.
- **Tasks:**
    - Integrate `three.js`'s `WebXRManager` to handle entering and exiting VR/MR mode.
    - Add a "Enter VR" button that appears only if the user's browser and device support WebXR.
    - Map VR controller inputs to actions within the scene, such as:
        - Teleportation or smooth locomotion for movement.
        - Grabbing and manipulating the cube with the controllers.
    - Ensure the render loop is compatible with the WebXR presentation loop.

## 5. Cube Color Synchronization Fix

- **Objective:** Ensure all clients see identical cube colors for consistent shared experience.
- **Priority:** High - Critical bug affecting user experience
- **Implementation:** Follow the detailed spec at `.kiro/specs/cube-color-synchronization/`
- **Key Tasks:**
    - Enhance server-side color logging and validation
    - Improve client-side color application with error handling
    - Add color synchronization verification system
    - Implement color resync mechanism for recovery
    - Add comprehensive debugging and error logging
    - Create automated tests for color consistency
- **Note:** This addresses the reported issue where "cubes that spawn in are not the same colour across different clients"
