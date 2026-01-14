const express = require("express");
const router = express.Router();
const MasterTimetable = require("../models/MasterTimetable");
const MasterHistory = require("../models/MastertimetableHistory");

// default slots
function defaultSlots() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const times = [
    { start: "09:00 am", end: "09:50 am" },
    { start: "09:50 am", end: "10:40 am" },
    { start: "10:40 am", end: "11:30 am" },
    { start: "11:30 am", end: "12:20 pm" },
    { start: "12:20 pm", end: "01:00 pm" },
    { start: "01:00 pm", end: "01:50 pm" },
    { start: "01:50 pm", end: "02:35 pm" },
    { start: "02:35 pm", end: "03:15 pm" }
  ];

  const slots = [];
  days.forEach(day => {
    times.forEach(t => {
      slots.push({
        day,
        start: t.start,
        end: t.end,
        subject: "",
        facultyName: "",
      });
    });
  });

  return slots;
}


// get timetable
router.get("/:classId", async (req, res) => {
  try {
    const { classId } = req.params;
    let master = await MasterTimetable.findOne({ classId });
    if (!master) {
      master = await MasterTimetable.create({
        classId,
        className: "Selected Class",
        slots: defaultSlots(),
      });
    }
    res.json({ success: true, master });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to load" });
  }
});

// save timetable
router.post("/:classId", async (req, res) => {
  try {
    const { classId } = req.params;
    const { className, slots, admin } = req.body;
    let existing = await MasterTimetable.findOne({ classId });
    if (existing) {
      
      await MasterHistory.create({
        classId,
        changedBy: admin || "Admin",
        note: "Updated timetable",
        previousSlots: existing.slots,
      });
      existing.slots = slots;
      existing.updatedAt = Date.now();
      existing.className = className;
      await existing.save();
      return res.json({ success: true, master: existing });
    } else {
      const newOne = await MasterTimetable.create({ classId, className, slots });
      return res.json({ success: true, master: newOne });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save" });
  }
});

// get history
router.get("/:classId/history", async (req, res) => {
  try {
    const history = await MasterHistory.find({ classId: req.params.classId }).sort({ changedAt: -1 });
    res.json({ success: true, history: history || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, history: [] });
  }
});

module.exports = router;


// GET saved timetable for class (used in VIEW TIMETABLE)
router.get("/fetch/:classId", async (req, res) => {
  try {
    const classId = req.params.classId;
    const data = await MasterTimetable.findOne({ classId });

    if (!data) {
      return res.json({ success: false, message: "No timetable saved" });
    }

    res.json({ success: true, timetable: data });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});





