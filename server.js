const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const uniqid = require("uniqid");
const mongoose = require("mongoose");
const tictactoeQueue = require("./Models/tictactoeQueue");

mongoose.connect(
  "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.3.1",
  () => {
    console.log("successfully connected to db");
  }
);

const app = express();
const server = createServer(app);
const io = new Server(server);
const port = 3300;

app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", (socket) => {
  console.log("client connected");

  socket.on("played", (data, roomid) => {
    // emit to the specific room the user is in
    console.log(roomid);
    socket.to(roomid).emit("opponentPlayed", data);
  });

  // fires when a user requests to enter a tic-tac-toe game
  socket.on("tic-tac-toe", async (data) => {
    // get waiting users from database
    const waitingUsers = await tictactoeQueue.find();
    const roomid = uniqid("tic-tac-toe-"); //  generate random roomid

    // if there are waiting users, pair them up
    if (waitingUsers.length !== 0) {
      const user = waitingUsers[0].socketId;
      const player = "X";

      // notify the waiting user of the match and remove the user from the queue
      socket.to(user).emit("found match", { roomid, player: "O" });
      await tictactoeQueue.findOneAndDelete({ socketId: user });

      // place user in a private room/game together with the opponent
      socket.join(roomid);
      socket.emit("start", player, roomid);
    } else {
      // add user to the list of waiting users
      try {
        const user = await tictactoeQueue.create({ socketId: socket.id });
        if (user) {
          socket.emit("waiting");
        }
      } catch (error) {
        console.log(error);
      }
    }
  });

  // fired when a user wins the game
  socket.on("Won", (data, roomid) => {
    console.log(roomid);
    socket.to(roomid).emit("lost", data);
  });

  // when there's a tie
  socket.on("draw", (roomid) => {
    io.to(roomid).emit("draw");
  });

  // places this user in the room specified in the data object
  socket.on("join room", async (data) => {
    socket.join(data.roomid);
  });
});

server.listen(port, () => {
  console.log("listening on port", port);
});
