const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  changedBy: String,
  note: String,
  changedAt: { type: Date, default: Date.now },
  previousSlots: Array,
});

module.exports = mongoose.model("MasterTimetableHistory", HistorySchema);
