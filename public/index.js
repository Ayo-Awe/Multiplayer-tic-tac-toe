const boardElement = document.getElementById("board");
const searchButton = document.getElementById("searchButton");
const display = document.getElementById("display");
let roomid = "";
let boardState = {
  openPositions: ["0", "1", "2", "3", "4", "5", "6", "7", "8"],
  xPositions: [],
  oPositions: [],
  winPositions: [
    ["0", "1", "2"],
    ["3", "2", "5"],
    ["6", "7", "8"],
    ["0", "3", "6"],
    ["1", "4", "7"],
    ["2", "5", "8"],
    ["0", "4", "8"],
    ["2", "4", "6"],
  ],
  updateState: (player, position) => {
    if (player == "X") {
      boardState.openPositions = boardState.openPositions.filter(
        (pos) => pos !== position
      );
      boardState.xPositions.push(position);
      const space = document.getElementById(position);
      space.innerHTML = player;
      space.className += " closed";
    } else if (player == "O") {
      boardState.openPositions = boardState.openPositions.filter(
        (pos) => pos !== position
      );
      boardState.oPositions.push(position);
      const space = document.getElementById(position);
      space.innerHTML = player;
      space.className += " closed";
    }
  },

  checkForWin: () => {
    const xWon = boardState.winPositions.filter((winPos) => {
      // check if this position is a subset of the xPositions i.e winPos[0,3,6] -> xPos[0,3,4,6] returns [0,3,6]
      return winPos.every((p) => {
        return boardState.xPositions.includes(p);
      });
    });
    const oWon = boardState.winPositions.filter((winPos) => {
      // check if this position is a subset of the yPositions i.e winPos[0,3,6] -> yPos[0,3,4,6] returns [0,3,6]
      return winPos.every((p) => {
        return boardState.oPositions.includes(p);
      });
    });

    if (xWon.length !== 0) {
      isGameOver = true;
      return { won: true, player: "X", positions: xWon, gameOver: true };
    } else if (oWon.length !== 0) {
      isGameOver = true;
      return { won: true, player: "O", positions: oWon, gameOver: true };
    } else if (boardState.openPositions.length === 0) {
      isGameOver = true;
      return { won: false, gameOver: true };
    } else {
      return { won: false, gameOver: false };
    }
  },
};

var socket = io();
let thisPlayer = "";
let isTurn = false;
let isGameOver = false;

// Search button implementations
searchButton.addEventListener("click", (e) => {
  e.preventDefault();
  socket.emit("tic-tac-toe");
});

// fired after the opponent has played
socket.on("opponentPlayed", (changes) => {
  // updates the boardState object
  if (changes) {
    isTurn = true;
    display.innerText = `Your turn`; // set display to show this player as the current player
    boardState.updateState(changes.player, changes.position);
    boardState.checkForWin();
  }
});

// fires after when a match is found for the player
socket.on("found match", (data) => {
  // set thisPlayer to the server assigned player then initialise board
  thisPlayer = data.player;
  initBoard();
  display.innerText = `Player ${getOpponent(thisPlayer)}'s turn`;
  socket.emit("join room", { roomid: data.roomid });
  roomid = data.roomid; // set room id
  searchButton.remove();
});

// fires when this player is the starting player
socket.on("start", (player, room) => {
  roomid = room; // set room id
  isTurn = true;
  thisPlayer = player;
  display.innerText = `Your turn`;
  initBoard();
  searchButton.remove();
});

socket.on("lost", (data) => {
  display.innerText = "Game Over: You Lost";
});

socket.on("draw", (data) => {
  display.innerText = "Game Over: Draw";
});

function getOpponent(player) {
  if (player == "X") {
    return "O";
  } else {
    return "X";
  }
}

// create a grid space and initialise it with the required event listeners
function createGridSpace(id) {
  const gridSpace = document.createElement("div");
  gridSpace.id = id;
  gridSpace.className = "space";

  // add event listeners
  gridSpace.addEventListener("mouseover", (e) => {
    if (!gridSpace.classList.contains("closed") && !isGameOver) {
      gridSpace.innerText = thisPlayer;
    }
  });
  gridSpace.addEventListener("mouseleave", (e) => {
    if (!gridSpace.classList.contains("closed") && !isGameOver) {
      gridSpace.innerText = "";
    }
  });
  gridSpace.addEventListener("click", (e) => {
    if (!gridSpace.classList.contains("closed") && isTurn && !isGameOver) {
      // play if gridSpace isn't already played and is the

      boardState.updateState(thisPlayer, gridSpace.id);
      const win = boardState.checkForWin();
      socket.emit(
        "played",
        {
          player: thisPlayer,
          position: gridSpace.id,
        },
        roomid
      );
      if (win.won && win.gameOver) {
        socket.emit("Won", win, roomid);
        display.innerText = `Game Over: You Won`;
      } else if (!win.won && win.gameOver) {
        socket.emit("draw", roomid);
      } else {
        isTurn = false;
        display.innerText = `Player ${getOpponent(thisPlayer)}'s turn`;
      }
    }
  });

  return gridSpace;
}

function initBoard() {
  // create and instantiate gridSpace objects
  for (let i = 0; i < 9; i++) {
    const gridSpace = createGridSpace(i);
    boardElement.appendChild(gridSpace);
  }
}
