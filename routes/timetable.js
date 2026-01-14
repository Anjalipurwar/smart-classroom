// File: routes/timetable.js
const express = require("express");
const router = express.Router();
const Faculty = require("../models/Faculty");
const Groq = require("groq-sdk");
const MasterTimetable = require("../models/MasterTimetable");
require("dotenv").config();

// ✅ Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =====================================================
   🧠 AI ADMIN COMMAND INTERPRETER
===================================================== */
async function interpretAdminCommand(command) {
  if (!command) return {};

  const prompt = `
You are an AI timetable assistant.

Convert the admin command into STRICT JSON.
Do NOT explain anything.

JSON FORMAT:
{
  "action": "add_slot | remove_slot | no_class | change_start_time",
  "day": "today | tomorrow",
  "start_time": "hh:mm am/pm | null",
  "end_time": "hh:mm am/pm | null",
  "subject": "string | null",
  "remove": "first | last | number | null"
}

Command:
"${command}"
`;

  const chat = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  return JSON.parse(chat.choices[0].message.content);
}

/* ---------------------------------------------------------
   TEST
--------------------------------------------------------- */
router.get("/", (req, res) => {
  res.json({ success: true, message: "Timetable route active ✅" });
});


/* =====================================================
   🧩 HALF-DAY FACULTY ABSENT PARSER
===================================================== */
async function parseHalfDayCommand(command) {
  if (!command) return null;

  const allFaculty = await Faculty.find();
  const facultyNames = allFaculty.map(f => f.name.toLowerCase());

  const cmd = command.toLowerCase();

  // Find which teacher name is mentioned
  const faculty = facultyNames.find(f => cmd.includes(f));
  if (!faculty) return null;

  // detect half-day keywords
  const isHalf = 
        cmd.includes("half") ||
        cmd.includes("baad") ||
        cmd.includes("lunch") ||
        cmd.includes("second half") ||
        cmd.includes("after");

  const isAbsent =
        cmd.includes("absent") ||
        cmd.includes("nahi") ||
        cmd.includes("not coming") ||
        cmd.includes("nhi aayega");

  if (isHalf && isAbsent) {
    return {
      faculty: faculty.toUpperCase(),
      halfDay: true
    };
  }

  return null;
}

/* ---------------------------------------------------------
   ✅ GENERATE TIMETABLE
--------------------------------------------------------- */
router.post("/generate", async (req, res) => {
  try {
    const { classId, generationType, adminCommand } = req.body;

    const classData = await MasterTimetable.findOne({ classId });
    if (!classData) {
      return res.json({ success: false, message: "Master timetable not found" });
    }
     const aiCommand = adminCommand
      ? await interpretAdminCommand(adminCommand)
      : {};

    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const today = new Date();
    let selectedDay = days[today.getDay()];

     if (aiCommand.day) {
      const map = {
        today: days[today.getDay()],
        tomorrow: days[(today.getDay() + 1) % 7],
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday"
      };

      selectedDay = map[aiCommand.day.toLowerCase()] || selectedDay;
    }

    if (generationType === "tomorrow") {
      selectedDay = days[(today.getDay() + 1) % 7];
    }

    let slots = classData.slots.filter(
      s => s.day.toLowerCase() === selectedDay.toLowerCase()
    );
    
    // 🔥 Half-day faculty absent detection
const halfDayInfo = await parseHalfDayCommand(adminCommand);
/* =====================================================
   🧠 HALF DAY COMMAND PARSER
===================================================== */
async function parseHalfDayCommand(command) {
  if (!command) return null;

  const prompt = `
Extract HALF DAY absence info from the sentence.

Rules:
- If teacher is absent AFTER half day → detect faculty name
- Half day means after lunch / after 12 / afternoon
- If not half day, return null

Reply ONLY JSON.

Format:
{
  "faculty": "SD | AM | NS | ADM | null",
  "afterHalf": true | false
}

Sentence:
"${command}"
`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  return JSON.parse(res.choices[0].message.content);
}

    /* ---------- AI ADMIN COMMAND ---------- */
    if (adminCommand) {
      const ai = await interpretAdminCommand(adminCommand);

      if (ai.action === "no_class") {
        slots = [];
      }

      if (ai.action === "remove_slot") {
        if (ai.remove === "first") slots.shift();
        else if (ai.remove === "last") slots.pop();
        else if (typeof ai.remove === "number") slots.splice(ai.remove - 1, 1);
      }

      if (ai.action === "add_slot") {
        slots.push({
          day: selectedDay,
          start: ai.start_time,
          end: ai.end_time,
          subject: ai.subject || "",
          facultyName: ""
        });
      }

      if (ai.action === "change_start_time" && slots.length) {
        slots[0].start = ai.start_time;
      }
    }

    if (!slots.length) {
      return res.json({ success: true, day: selectedDay, generatedTimetable: [] });
    }

    const schedule = slots.map(s => ({
      startTime: s.start,
      endTime: s.end,
      subject: s.subject || "",
      originalFaculty: s.facultyName || "",
      day: s.day
    }));

    const allFaculty = await Faculty.find();
    const presentFaculty = allFaculty.filter(f => f.isPresent);

    const teacherLoad = {};
    presentFaculty.forEach(f => teacherLoad[f.name] = 0);

    function isFree(name, slot) {
      const f = allFaculty.find(x => x.name === name);
      if (!f?.weeklyAvailability) return true;
      return f.weeklyAvailability[slot.day]?.[slot.startTime] === "FREE";
    }

    function teacherSubject(name) {
      return allFaculty.find(f => f.name === name)?.subjects?.[0] || "";
    }

    const generatedTimetable = schedule.map(slot => {

      // ✅ BREAK
      if (slot.subject.toLowerCase() === "break") {
        return { ...slot, subject: "Break", assignedFaculty: "—", note: "" };
      }

      // ✅ LIBRARY
      if (slot.subject.toLowerCase() === "library") {
        return { ...slot, subject: "Library", assignedFaculty: "—", note: "" };
      }

      // ✅ NO CLASS
      if (!slot.subject) {
        return {
          ...slot,
          subject: "No Class",
          assignedFaculty: "No Class",
          note: ""
        };
      }

      /* ---------------------------------------------
   🔥 HALF DAY REPLACEMENT LOGIC
--------------------------------------------- */
if (
  halfDayInfo &&
  halfDayInfo.afterHalf === true &&
  slot.originalFaculty === halfDayInfo.faculty
) {


  // assume half-time = 12:20 pm (you can adjust)
  const HALF_TIME = "12:20 pm";

  const slotTime = slot.startTime.toLowerCase();

  // apply replacement only after half time
  if (slotTime > HALF_TIME) {

    // find free faculty (except the absent one)
    const free = presentFaculty
      .map(f => f.name)
      .filter(n => n !== halfDayInfo.faculty && isFree(n, slot));

    if (free.length) {
      free.sort((a, b) => teacherLoad[a] - teacherLoad[b]);
      const rep = free[0];
      teacherLoad[rep]++;

      return {
        ...slot,
        assignedFaculty: rep,
        subject: teacherSubject(rep),
        note: `${halfDayInfo.faculty} absent after half day`
      };
    }

    return {
      ...slot,
      assignedFaculty: "-",
      note: `${halfDayInfo.faculty} absent after half day`
    };
  }
}

      // ✅ Original faculty present
      if (
        slot.originalFaculty &&
        presentFaculty.find(f => f.name === slot.originalFaculty)
      ) {
        return { ...slot, assignedFaculty: slot.originalFaculty, note: "" };
      }

      // ✅ Replacement
      const free = presentFaculty.map(f => f.name).filter(n => isFree(n, slot));
      if (!free.length) {
        return { ...slot, assignedFaculty: "-", note: "No faculty available" };
      }

      free.sort((a,b) => teacherLoad[a] - teacherLoad[b]);
      const rep = free[0];
      teacherLoad[rep]++;

      return {
        ...slot,
        subject: teacherSubject(rep),
        assignedFaculty: rep,
        note: "Replaced absent teacher"
      };
    });

    res.json({
      success: true,
      day: selectedDay,
      generatedTimetable
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/* =====================================================
   🤖 CHATGPT STYLE ADMIN CHAT
===================================================== */

router.post("/chat", async (req, res) => {
  try {
    const { classId, message } = req.body;

    if (!message?.trim()) {
      return res.json({
        message: "Please type something 🙂",
        generate: false
      });
    }

    /* ------------------------------------
       ✅ STEP 1: AI INTENT DETECTION
    ------------------------------------ */
    const intentPrompt = `
You are an AI timetable assistant.

Decide whether the following message is a TIMETABLE COMMAND
or just NORMAL CHAT.

Reply ONLY strict JSON.

Format:
{
  "isTimetable": true | false
}

Message:
"${message}"
`;

    const intentRes = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: intentPrompt }],
      temperature: 0
    });

    const { isTimetable } = JSON.parse(
      intentRes.choices[0].message.content
    );

    /* ------------------------------------
       ✅ STEP 2: NORMAL CHAT
    ------------------------------------ */
    if (!isTimetable) {
      const chat = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a friendly assistant." },
          { role: "user", content: message }
        ],
        temperature: 0.7
      });

      return res.json({
        message: chat.choices[0].message.content,
        generate: false
      });
    }

    /* ------------------------------------
       ✅ STEP 3: CLASS NOT SELECTED
    ------------------------------------ */
    if (!classId) {
      return res.json({
        message: "Please select a class first.",
        generate: false
      });
    }

    /* ------------------------------------
       ✅ STEP 4: AI TIMETABLE COMMAND PARSING
    ------------------------------------ */
    const aiCommand = await interpretAdminCommand(message);

    return res.json({
      message: "✅ Timetable command understood.",
      generate: true,
      aiCommand   // 🔥 frontend ya /generate route use karega
    });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      message: "AI failed to respond.",
      generate: false
    });
  }
});

module.exports = router;
