// models/MasterTimetable.js
const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  day: { type: String, required: true },     // Monday, Tuesday, ...
  start: String, // e.g. "09:00"
  end: String,   // e.g. "09:50"
  subject: String,
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
  facultyName: String,
});

const MasterTimetableSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Class' }, // or your class model
  className: { type: String, required: true },
  slots: [SlotSchema],
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String }, // optional admin username/id
});

module.exports = mongoose.model('MasterTimetable', MasterTimetableSchema);
