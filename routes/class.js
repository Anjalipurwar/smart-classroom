const express = require("express");
const router = express.Router();
const Class = require("../models/Class");


// =============================
// 1️⃣ GET all classes
// =============================
router.get("/", async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch {
    res.status(500).json({ error: "Failed to load classes" });
  }
});


// =============================
// 2️⃣ ADD NEW CLASS
// =============================
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    const newClass = new Class({ name, description });
    await newClass.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to add class" });
  }
});


// =============================
// 3️⃣ DELETE CLASS
// =============================
router.delete("/:id", async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete class" });
  }
});


// =============================
// 4️⃣ GET MASTER TIMETABLE
// =============================
router.get("/:id/master", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: "Class not found" });

    res.json({
      success: true,
      master: {
        className: cls.name,
        slots: cls.masterTimetable || []
      }
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch master timetable" });
  }
});


// =============================
// 5️⃣ SAVE MASTER TIMETABLE + HISTORY
// =============================
router.post("/:id/master", async (req, res) => {
  try {
    const { slots, admin = "Admin", note = "" } = req.body;

    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: "Class not found" });

    // Save "current" timetable
    cls.masterTimetable = slots;

    // Save history entry
    cls.history.push({
      timetable: slots,
      changedBy: admin,
      note: note
    });

    await cls.save();

    res.json({ success: true, message: "Master timetable updated!" });

  } catch (err) {
    console.error("Error saving master timetable:", err);
    res.status(500).json({ error: "Failed to save master timetable" });
  }
});


// =============================
// 6️⃣ GET ALL HISTORY FOR A CLASS
// =============================
router.get("/:id/history", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: "Class not found" });

    res.json({
      success: true,
      history: cls.history || []
    });

  } catch {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});


// =============================
// 7️⃣ GET SINGLE HISTORY TIMETABLE FOR VIEW BUTTON
// =============================
router.get("/history/:historyId", async (req, res) => {
  try {
    const historyId = req.params.historyId;

    const cls = await Class.findOne(
      { "history._id": historyId },
      { "history.$": 1 } // return only matching item
    );

    if (!cls) {
      return res.status(404).json({ error: "History item not found" });
    }

    const entry = cls.history[0];

    res.json({
      success: true,
      timetable: entry.timetable,
      changedAt: entry.changedAt,
      changedBy: entry.changedBy,
      note: entry.note
    });

  } catch (err) {
    console.error("Error fetching single history:", err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
