const mongoose = require("mongoose");
const { Schema } = mongoose;

const QueueSchema = new Schema({
  socketId: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("tictactoe", QueueSchema);
