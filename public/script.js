
let selectedClassId = "";
let lastAdminCommand = "";

document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     ELEMENTS
  =============================== */
  const checkFacultyBtn = document.getElementById("check-faculty-btn");
  const facultyAttendanceList = document.getElementById("faculty-attendance-list");
  const generationControlsForm = document.getElementById("generation-controls-form");
  const resultDiv = document.getElementById("timetable-result");
const chatSendBtn = document.getElementById("send-chat-btn");

  const adminCommandInput = document.getElementById("admin-command");
const chatBox = document.getElementById("chat-messages");

  const classSelect = document.getElementById("class-select");
  const classWarning = document.getElementById("class-warning");
const generateBtn = document.getElementById("generate-btn");

  let selectedClassId = "";

  /* ===============================
     LOAD CLASSES
  =============================== */
  async function loadClasses() {
    try {
      const res = await fetch("/api/classes");
      const classes = await res.json();

      classSelect.innerHTML = `<option value="">-- Select Class --</option>`;
      classes.forEach(cls => {
        const opt = document.createElement("option");
        opt.value = cls._id;
        opt.textContent = cls.name;
        classSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("❌ Error loading classes:", err);
    }
  }
  loadClasses();

  classSelect.addEventListener("change", () => {
    selectedClassId = classSelect.value;
    classWarning.style.display = selectedClassId ? "none" : "block";
  });

  /* ===============================
     CHECK FACULTY (UNCHANGED)
  =============================== */
  if (checkFacultyBtn) {
    checkFacultyBtn.addEventListener("click", async () => {
      facultyAttendanceList.innerHTML = "<p>Loading faculty...</p>";

      try {
        const res = await fetch("/api/faculty");
        const faculty = await res.json();

        if (!faculty.length) {
          facultyAttendanceList.innerHTML = "<p>No faculty found.</p>";
          return;
        }

        facultyAttendanceList.innerHTML = "";
        faculty.forEach(f => {
          const p = document.createElement("p");
          p.textContent = f.isPresent
            ? `✔ ${f.name} (Present)`
            : `✖ ${f.name} (Absent)`;
          p.className = f.isPresent ? "faculty-present" : "faculty-absent";
          facultyAttendanceList.appendChild(p);
        });

      } catch (err) {
        console.error(err);
        facultyAttendanceList.innerHTML =
          "<p style='color:red;'>Error loading faculty</p>";
      }
    });
  }

  /* ===============================
     ✅ GENERATE TIMETABLE (AI COMMAND)
  =============================== */
  generationControlsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!selectedClassId) {
      classWarning.style.display = "block";
      return;
    }

    const generationType =
      document.querySelector('input[name="generation-type"]:checked').value;

    const adminCommand = lastAdminCommand || "";

resultDiv.innerHTML = "<p>⏳ Generating timetable...</p>";

    try {
      const response = await fetch("/api/timetable/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          generationType,
          adminCommand   // ✅ natural language command
        })
      });

      const data = await response.json();

      if (!data.success) {
        resultDiv.innerHTML =
          `<p style="color:red;">${data.message || "Generation failed"}</p>`;
        return;
      }

      /* ✅ STORE RESULT */
      localStorage.setItem(
        "generatedTimetable",
        JSON.stringify(data.generatedTimetable)
      );
      localStorage.setItem(
        "timetableTitle",
        `Timetable (${data.day})`
      );

      window.location.href = "/view-timetable";

    } catch (err) {
      console.error("❌ Generate error:", err);
      resultDiv.innerHTML =
        "<p style='color:red;'>Generation failed</p>";
    }
  });

  /* ===============================
     LOGOUT
  =============================== */
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/";
    });
  }

});

/* =================================================
   FACULTY ATTENDANCE BOX (UNCHANGED)
================================================= */
async function loadFacultyAttendanceBox() {
  const box = document.getElementById("faculty-attendance-box");
  if (!box) return;

  try {
    const res = await fetch("/api/faculty");
    const facultyList = await res.json();

    box.innerHTML = "";

    facultyList.forEach(fac => {
      const row = document.createElement("div");
      row.classList.add("faculty-item");

      row.innerHTML = `
        <div class="faculty-info">
          <strong>${fac.name}</strong>
          <div class="subjects-list">Teaches:
            ${fac.subjects.map(s => `<span>${s}</span>`).join("")}
          </div>
        </div>

        <div class="attendance-toggle">
          <span class="toggle-label">
            ${fac.isPresent ? "Present" : "Absent"}
          </span>
          <label class="switch">
            <input type="checkbox"
              data-id="${fac._id}"
              ${fac.isPresent ? "checked" : ""}>
            <span class="slider"></span>
          </label>
        </div>
      `;

      row.querySelector("input").addEventListener("change", async (e) => {
        await fetch(`/api/faculty/attendance/${fac._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPresent: e.target.checked })
        });
      });

      box.appendChild(row);
    });

  } catch (err) {
    console.error(err);
    box.innerHTML =
      "<p style='color:red;'>Error loading faculty</p>";
  }
}

loadFacultyAttendanceBox();
document.addEventListener("DOMContentLoaded", () => {
let selectedClassId = null;
let lastAdminCommand = "";

  const chatSendBtn = document.getElementById("send-chat-btn");
  const adminCommandInput = document.getElementById("admin-command");
  const chatBox = document.getElementById("chat-messages");
  const classSelect = document.getElementById("class-select");

  if (!chatSendBtn || !adminCommandInput || !chatBox) {
    console.error("❌ Chat elements missing");
    return;
  }

  // ✅ keep class id updated
  if (classSelect) {
    classSelect.addEventListener("change", () => {
      selectedClassId = classSelect.value || null;
      console.log("✅ Selected class:", selectedClassId);
    });
  }

  // ✅ SEND MESSAGE
  chatSendBtn.addEventListener("click", sendMessage);

  adminCommandInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  async function sendMessage() {
    const command = adminCommandInput.value.trim();
    if (!command) return;

    lastAdminCommand = command;

    // ✅ Admin bubble
    chatBox.innerHTML += `
      <div class="chat-bubble admin">${command}</div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;
    adminCommandInput.value = "";

    try {
      const res = await fetch("/api/timetable/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          message: command
        })
      });

      const data = await res.json();

      // ✅ AI bubble
      chatBox.innerHTML += `
        <div class="chat-bubble ai">${data.message || "✅ Command received"}</div>
      `;

      // ✅ generate button INSIDE CHAT
      if (data.generate === true) {
        chatBox.innerHTML += `
          <div class="chat-bubble ai">
            <button class="chat-generate-btn"
              onclick="document.getElementById('generate-btn').click()">
              Generate Timetable
            </button>
          </div>
        `;
      }

      chatBox.scrollTop = chatBox.scrollHeight;

    } catch (err) {
      console.error(err);
      chatBox.innerHTML += `
        <div class="chat-bubble ai">❌ AI failed</div>
      `;
    }
  }
});
