const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,

  // Master timetable (latest)
  masterTimetable: {
    type: Array,
    default: []
  },

  // 🧠 HISTORY (all previous saved timetables)
  history: [
    {
      timetable: { type: Array, default: [] },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: String, default: "Admin" },
      note: { type: String, default: "" }
    }
  ]
});

module.exports = mongoose.model("Class", ClassSchema);
