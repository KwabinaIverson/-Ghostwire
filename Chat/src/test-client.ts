import { io } from "socket.io-client";

console.log('Starting test-client.ts');

// Keep the script alive a few seconds to observe socket activity in this terminal
setTimeout(() => {
  console.log('Test-client timeout reached - exiting');
  process.exit(0);
}, 8000);

// 1. PASTE YOUR VALID JWT TOKEN HERE (From Login API)
const MY_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFhMDQ5NGU5LTBkMjctNGIyZC1iYjMzLTYwYzAzOGQyNDI4MiIsInVzZXJuYW1lIjoiVGVzdCBBZG1pbiIsImlhdCI6MTc2OTgxODQ4OCwiZXhwIjoxNzcwNDIzMjg4fQ.trIz3DTyh-8WuscHMJ8XEiQwXLdOihGjWeLe9VlOn8I"; 

// 2. PASTE A VALID GROUP ID HERE (From Create Group API)
const GROUP_ID = "5edd07f3-6248-40e5-b760-d0775e953202"; 

const socket = io("http://localhost:3000", {
  // Keep auth token (legacy) but also send it as an HTTP cookie so server middleware can read it
  auth: { token: MY_TOKEN },
  extraHeaders: { cookie: `token=${MY_TOKEN}` },
  reconnectionAttempts: 5,
  transports: ['websocket']
});

socket.on("connect", () => {
  console.log("Connected to Server! ID:", socket.id);

  // STEP 1: Join the Group
  console.log(`Joining Group: ${GROUP_ID}`);
  socket.emit("join_group", GROUP_ID);
});

// Handle connection-level errors (e.g., auth failure happens as 'connect_error')
socket.on('connect_error', (err: any) => {
  console.error('Connect Error:', err?.message || err);
});

// Listen for history (Server sends this after joining)
socket.on("history", (messages) => {
  console.log(`Received History: ${messages.length} messages.`);
});

// Listen for new messages
socket.on("new_message", (msg) => {
  console.log("NEW MESSAGE:", msg);
});

// Listen for runtime errors emitted by server handlers
socket.on("error", (err) => {
  console.error("ERROR:", err);
});

// Log disconnects (useful to know server closed the connection)
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// STEP 2: Send a message after 2 seconds
setTimeout(() => {
  console.log("Sending Message...");
  socket.emit("send_message", {
    targetId: GROUP_ID,
    type: "group",
    content: "This is a test message sent via the test-client.ts script!"
  });
}, 500);