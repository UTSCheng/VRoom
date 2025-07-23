const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const wss = new WebSocket.Server({ server });

// Initialize server-side objects with fixed IDs, positions, and colors
const objects = {};
const players = {};
const cubeOwnership = {}; // Track who owns each cube
const cubeIds = ['cube1', 'cube2', 'cube3', 'cube4', 'clock'];

// Generate highly saturated colors
function generateSaturatedColor() {
    const colors = [
        0xff0000, // Bright Red
        0x00ff00, // Bright Green
        0x0000ff, // Bright Blue
        0xff00ff, // Bright Magenta
        0xffff00, // Bright Yellow
        0x00ffff, // Bright Cyan
        0xff8000, // Bright Orange
        0x8000ff, // Bright Purple
        0xff0080, // Bright Pink
        0x80ff00  // Bright Lime
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Initialize cube positions and colors
cubeIds.forEach((id, index) => {
    objects[id] = {
        x: Math.random() * 8 - 4,
        y: Math.random() * 8 + 1,
        z: Math.random() * 8 - 4,
        color: id === 'clock' ? 0x000000 : generateSaturatedColor(), // Black for clock, saturated colors for others
        type: id === 'clock' ? 'clock' : 'cube'
    };
});

// Face emojis for player avatars
const faceEmojis = ['😀', '😃', '😄', '😁', '😆', '😊', '😎', '🤓', '😋', '🙂', '😉', '😌', '😍', '🥰', '😘'];

console.log('Initialized server objects:', objects);

wss.on('connection', (ws) => {
    ws.id = Math.random().toString(36).substring(2, 9);
    console.log(`Client ${ws.id} connected`);

    // Assign random emoji to player
    const randomEmoji = faceEmojis[Math.floor(Math.random() * faceEmojis.length)];
    players[ws.id] = {
        id: ws.id,
        emoji: randomEmoji,
        position: { x: 0, y: 5, z: 15 },
        rotation: { x: 0, y: 0, z: 0 }
    };

    // Send the current state to the new client
    ws.send(JSON.stringify({ 
        type: 'initialState', 
        objects,
        players,
        yourId: ws.id
    }));

    // Notify other clients about new player
    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
                type: 'playerJoined', 
                player: players[ws.id]
            }));
        }
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'grabObject') {
            // Check if object is already owned by someone else
            if (!cubeOwnership[data.id] || cubeOwnership[data.id] === ws.id) {
                cubeOwnership[data.id] = ws.id;
                
                // Broadcast grab to all clients
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ 
                            type: 'objectGrabbed', 
                            id: data.id, 
                            ownerId: ws.id,
                            isOwner: client === ws
                        }));
                    }
                });
            }
        } else if (data.type === 'releaseObject') {
            // Release ownership
            if (cubeOwnership[data.id] === ws.id) {
                delete cubeOwnership[data.id];
                objects[data.id] = data.position;
                
                // Broadcast release to all clients
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ 
                            type: 'objectReleased', 
                            id: data.id, 
                            position: data.position
                        }));
                    }
                });
            }
        } else if (data.type === 'moveObject') {
            // Only allow movement if client owns the object
            if (cubeOwnership[data.id] === ws.id) {
                // Broadcast real-time movement to all other clients
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ 
                            type: 'objectMoving', 
                            id: data.id, 
                            position: data.position 
                        }));
                    }
                });
            }
        } else if (data.type === 'updatePlayer') {
            // Update player position and rotation
            if (players[ws.id]) {
                players[ws.id].position = data.position;
                players[ws.id].rotation = data.rotation;
                
                // Broadcast player update to all other clients
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ 
                            type: 'playerMoved', 
                            player: players[ws.id]
                        }));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        console.log(`Client ${ws.id} disconnected`);
        
        // Remove player and notify others
        if (players[ws.id]) {
            delete players[ws.id];
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ 
                        type: 'playerLeft', 
                        playerId: ws.id
                    }));
                }
            });
        }
    });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
