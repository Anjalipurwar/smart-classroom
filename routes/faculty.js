const express = require('express');
const router = express.Router();
const Faculty = require('../models/Faculty');
const MasterTimetable = require("../models/MasterTimetable");

// ---------------------- LOGIN MIDDLEWARE ----------------------
const isLoggedIn = (req, res, next) => {
  if (req.session.userId) return next();
  res.status(401).json({ error: "Unauthorized" });
};

// =============================================================
//                  FACULTY ROUTES
// =============================================================

// 1. GET all faculty
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const faculty = await Faculty.find();
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching faculty" });
  }
});

// 2. ADD new faculty
router.post('/', isLoggedIn, async (req, res) => {
  try {
    const { name, subjects } = req.body;
    const subjectsArray = subjects.split(',').map(s => s.trim());

    const newFaculty = new Faculty({
      name,
      subjects: subjectsArray,
      isPresent: true
    });

    await newFaculty.save();

    res.status(201).json({
      success: true,
      message: "Faculty added!",
      faculty: newFaculty
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to add faculty" });
  }
});

// 3. DELETE a faculty member
router.delete('/:id', isLoggedIn, async (req, res) => {
  try {
    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Faculty deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete faculty" });
  }
});

// 4. UPDATE attendance (Present / Absent)
router.put('/attendance/:id', isLoggedIn, async (req, res) => {
  try {
    const { isPresent } = req.body;

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      { isPresent },
      { new: true }
    );

    if (!updatedFaculty)
      return res.status(404).json({ error: "Faculty not found" });

    res.json({ success: true, faculty: updatedFaculty });

  } catch (err) {
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

// 5. MANUAL availability (not used after AUTO sync)
router.put('/availability/:id', isLoggedIn, async (req, res) => {
  try {
    const { availability } = req.body;

    const updated = await Faculty.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: "Faculty not found" });

    res.json({ success: true, faculty: updated });

  } catch (err) {
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// =============================================================
//       AUTO SYNC AVAILABILITY BASED ON MASTER TIMETABLE
// =============================================================
// =============================================================
//       AUTO SYNC AVAILABILITY BASED ON MASTER TIMETABLE
// =============================================================

router.get("/auto-availability/:facultyId", isLoggedIn, async (req, res) => {
  try {
    const facultyId = req.params.facultyId;

    // Find faculty
    const faculty = await Faculty.findById(facultyId);
    if (!faculty)
      return res.json({ success: false, error: "Faculty not found" });

    const facultyName = faculty.name.trim().toLowerCase();

    // Master timetable
    const allClasses = await MasterTimetable.find();

    // Days used in UI
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // UI TIMES (your grid)
    const UI_TIMES = [
      { start: "09:00 am", end: "09:50 am" },
      { start: "09:50 am", end: "10:40 am" },
      { start: "10:40 am", end: "11:30 am" },
      { start: "11:30 am", end: "12:20 pm" },
      { start: "12:20 pm", end: "01:00 pm" },
      { start: "01:00 pm", end: "01:50 pm" },
      { start: "01:50 pm", end: "02:35 pm" },
      { start: "02:35 pm", end: "03:15 pm" },
    ];

    // Normalize times (important!)
    function normalizeTime(t) {
      return (t || "").replace(/\s+/g, "").toLowerCase();
    }

    // Create base availability (all free initially)
    const availability = {};
    days.forEach(day => {
      availability[day] = UI_TIMES.map(t => ({
        start: t.start,
        end: t.end,
        status: "free"
      }));
    });

    // Fill BUSY from master timetable
    allClasses.forEach(cls => {
      (cls.generatedTimetable || cls.slots || []).forEach(slot => {

        const day = slot.day;
        if (!availability[day]) return;

        const slotFaculty = (slot.assignedFaculty || slot.facultyName || "").trim().toLowerCase();

        const uiSlot = availability[day].find(
          s => normalizeTime(s.start) === normalizeTime(slot.startTime || slot.start)
        );

        if (!uiSlot) return;

        if (slotFaculty === facultyName) {
          uiSlot.status = "busy";
        }
      });
    });

    res.json({ success: true, availability });

  } catch (err) {
    console.error("AUTO AVAILABILITY ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to generate availability" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, subjects, type } = req.body;
    await Faculty.findByIdAndUpdate(req.params.id, {
      name, subjects, type
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

// =============================================================
module.exports = router;
