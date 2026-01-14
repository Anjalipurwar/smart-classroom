const mongoose = require("mongoose");

const FacultySchema = new mongoose.Schema({
  name: { type: String, required: true },

  subjects: [{ type: String }],   // subjects taught

  facultyType: {
    type: String,
    default: "both"  // lecture / lab / both
  },

  isPresent: { type: Boolean, default: true },

  availability: {
    Monday: [{ start: String, end: String, status: String }],
    Tuesday: [{ start: String, end: String, status: String }],
    Wednesday: [{ start: String, end: String, status: String }],
    Thursday: [{ start: String, end: String, status: String }],
    Friday: [{ start: String, end: String, status: String }],
    Saturday: [{ start: String, end: String, status: String }],
  },
});

module.exports = mongoose.model("Faculty", FacultySchema);
