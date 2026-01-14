// File: public/master.script.js

document.addEventListener("DOMContentLoaded", () => {
  const timetableGrid = document.getElementById("timetable-grid");
  const editBtn = document.getElementById("edit-btn");
  const saveBtn = document.getElementById("save-btn");
  const historyBtn = document.getElementById("history-btn");
  const historyPanel = document.getElementById("history-panel");
  const historyList = document.getElementById("history-list");
  const logoutButton = document.getElementById("logout-button-master");
  const classTitle = document.getElementById("class-title");

  let currentClass = localStorage.getItem("selectedClassId");
  let masterData = null;
  let editing = false;

  // ✅ Faculty + subject lists from /api/faculty
  let facultyList = [];
  let subjectList = [];

  if (!currentClass) {
    timetableGrid.innerHTML = `<p style="color:red;">⚠️ No class selected. Please select a class in Class Management first.</p>`;
    return;
  }

  // ------------------ LOAD DATA ------------------ //

  // Load faculty & subjects from Faculty collection
  async function loadFacultyMeta() {
    try {
      const res = await fetch("/api/faculty");
      if (!res.ok) throw new Error("Failed to load faculty");

      const list = await res.json();
      facultyList = Array.isArray(list) ? list : [];

      const subjects = new Set();
      facultyList.forEach((f) => {
        (f.subjects || []).forEach((s) => subjects.add(s));
      });
      subjectList = [...subjects];
      console.log("✅ Faculty loaded:", facultyList);
      console.log("✅ Subjects list:", subjectList);
    } catch (err) {
      console.error("Error loading faculty meta:", err);
      facultyList = [];
      subjectList = [];
    }
  }

  // Load master timetable for selected class
  async function loadMaster(id) {
    try {
      // 1️⃣ Make sure faculty + subjects are loaded
      await loadFacultyMeta();

      const res = await fetch(`/api/master/${id}`);
      const json = await res.json();
      if (json.success) {
        masterData = json.master;
        classTitle.textContent = `Class: ${masterData.className}`;
        renderGrid();
      } else {
        timetableGrid.innerHTML = "<p>Failed to load timetable.</p>";
      }
    } catch (err) {
      console.error(err);
      timetableGrid.innerHTML = "<p>Error loading timetable.</p>";
    }
  }

  // Initial load
  loadMaster(currentClass);

  // ------------------ RENDER GRID ------------------ //

  function renderGrid() {
    const slots = masterData.slots || [];
    const days = [...new Set(slots.map((s) => s.day))];
    const times = [...new Set(slots.map((s) => `${s.start}-${s.end}`))];

    if (!days.length || !times.length) {
      timetableGrid.innerHTML = `<p>No slots found for this class. Please save a timetable at least once.</p>`;
      return;
    }

    let html = `<table class="timetable-grid"><thead><tr><th>Day / Time</th>`;
    times.forEach((t) => (html += `<th>${t}</th>`));
    html += `</tr></thead><tbody>`;

    days.forEach((day) => {
      html += `<tr><td>${day}</td>`;
      times.forEach((t) => {
        const slot = slots.find(
          (s) => s.day === day && `${s.start}-${s.end}` === t
        );

        const subj = slot?.subject || "";
        const fac = slot?.facultyName || "";
        const type = slot?.type || "lecture"; // default

        html += `<td data-day="${day}" data-time="${t}">`;

        if (editing) {
          // 🟣 EDIT MODE: show dropdowns

          // TYPE DROPDOWN
          html += `
            <select class="slot-type">
              <option value="lecture" ${type === "lecture" ? "selected" : ""}>Lecture</option>
              <option value="lab" ${type === "lab" ? "selected" : ""}>Lab</option>
              <option value="break" ${type === "break" ? "selected" : ""}>Break</option>
              <option value="event" ${type === "event" ? "selected" : ""}>Event</option>
  <option value="meeting" ${type === "meeting" ? "selected" : ""}>Meeting</option>
  <option value="library" ${type === "library" ? "selected" : ""}>Library</option>
  <option value="noclass" ${type === "noclass" ? "selected" : ""}>No Class</option>

              </select>

              <!-- Custom textbox for Event / Meeting -->
<input 
  type="text"
  class="custom-title-input"
  placeholder="Enter title..."
  style="display:none; margin-top:4px; width:95%;"
>
          `;

          // SUBJECT DROPDOWN (options filled later by JS)
          html += `
            <select class="subject-dropdown">
              <option value="">Select Subject</option>
            </select>
          `;

          // FACULTY DROPDOWN (options filled later by JS)
          html += `
            <select class="faculty-dropdown">
              <option value="">Select Faculty</option>
            </select>
          `;
        } else {
          // 🟢 VIEW MODE
          html += `
            <div class="subject-box">${subj || "—"}</div>
            <div class="faculty-box">${fac || "—"}</div>
          `;
        }

        html += `</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    timetableGrid.innerHTML = html;

    if (editing) {
      setupCellDropdowns();
    }
  }

  // ------------------ DROPDOWN LOGIC ------------------ //

function setupCellDropdowns() {
  const cells = timetableGrid.querySelectorAll("td[data-day]");

  cells.forEach((td) => {
    const day = td.dataset.day;
    const time = td.dataset.time;
    const [start, end] = time.split("-");

    const slotIndex = masterData.slots.findIndex(
      (s) => s.day === day && s.start === start && s.end === end
    );
    if (slotIndex === -1) return;

    const slot = masterData.slots[slotIndex];

    const typeSelect = td.querySelector(".slot-type");
    const subjectSelect = td.querySelector(".subject-dropdown");
    const facultySelect = td.querySelector(".faculty-dropdown");

    // --------------------------
    // 1) SUBJECT DROPDOWN FIRST
    // --------------------------
    subjectSelect.innerHTML = `<option value="">Select Subject</option>`;
    subjectList.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      if (slot.subject === s) opt.selected = true;
      subjectSelect.appendChild(opt);
    });

    // --------------------------
    // Helper to populates faculty

    // --------------------------
    function updateFaculty(subject) {
  facultySelect.innerHTML = `<option value="">Select Faculty</option>`;

  // ✅ NO FACULTY FOR THESE
  if (
    !subject ||
    slot.type === "break" ||
    slot.type === "library" ||
    slot.type === "noclass"
  ) {
    facultySelect.disabled = true;
    facultySelect.value = "";
    slot.facultyName = "";
    return;
  }

  facultySelect.disabled = false;

  const filtered = facultyList.filter(f =>
    Array.isArray(f.subjects) && f.subjects.includes(subject)
  );

  filtered.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.name;
    opt.textContent = f.name;
    facultySelect.appendChild(opt);
  });

  // ✅ auto-select only if 1 teacher
  if (filtered.length === 1) {
    facultySelect.value = filtered[0].name;
    slot.facultyName = filtered[0].name;
  }

  if (slot.facultyName && filtered.some(f => f.name === slot.facultyName)) {
    facultySelect.value = slot.facultyName;
  }
}

    // --------------------------
    // 2) INITIAL faculty setup
    // --------------------------
    updateFaculty(slot.subject);

    // --------------------------
    // 3) TYPE dropdown (Lecture/Lab/Break)
    // --------------------------
    typeSelect.addEventListener("change", () => {
  const type = typeSelect.value;
  slot.type = type;

  const titleInput = td.querySelector(".custom-title-input");

  // reset
  subjectSelect.disabled = false;
  facultySelect.disabled = false;
  titleInput.style.display = "none";
  titleInput.value = "";

  // BREAK
  if (type === "break") {
    subjectSelect.disabled = true;
    facultySelect.disabled = true;
    subjectSelect.value = "Break";
    slot.subject = "Break";
    slot.facultyName = "";
    facultySelect.value = "";
  }

  // LIBRARY
  else if (type === "library") {
    subjectSelect.disabled = true;
    facultySelect.disabled = true;
    subjectSelect.value = "Library";
    slot.subject = "Library";
    slot.facultyName = "";
    facultySelect.value = "";
  }

  // NO CLASS
  else if (type === "noclass") {
    subjectSelect.disabled = true;
    facultySelect.disabled = true;
    subjectSelect.value = "";
    slot.subject = "";
    slot.facultyName = "";
    facultySelect.value = "";
  }

  // EVENT / MEETING (textbox appears)
  else if (type === "event" || type === "meeting") {
    subjectSelect.disabled = true;
    facultySelect.disabled = true;

    subjectSelect.value = "";
    facultySelect.value = "";
    slot.facultyName = "";

    titleInput.style.display = "block";
    titleInput.placeholder = type === "event" ? "Enter Event Name" : "Enter Meeting Title";
  }

  // LECTURE / LAB NORMAL
  else {
    subjectSelect.disabled = false;
    facultySelect.disabled = false;
    updateFaculty(slot.subject);
  }
});

// Save custom Event/Meeting title
td.querySelector(".custom-title-input").addEventListener("input", (e) => {
  slot.subject = e.target.value;
  slot.facultyName = "";
});

    // --------------------------
    // 4) SUBJECT dropdown
    // --------------------------
    subjectSelect.addEventListener("change", () => {
      slot.subject = subjectSelect.value;
      slot.facultyName = "";
      updateFaculty(slot.subject);
    });

    // --------------------------
    // 5) FACULTY dropdown
    // --------------------------
    facultySelect.addEventListener("change", () => {
      slot.facultyName = facultySelect.value;
    });

    // --------------------------
    // BREAK on load
    // --------------------------
    if (slot.type === "break") {
      subjectSelect.disabled = true;
      facultySelect.disabled = true;
      subjectSelect.value = "Break";
      facultySelect.value = "";
    }
  });
}

  // ------------------ SAVE / EDIT BUTTONS ------------------ //

  editBtn.addEventListener("click", () => {
    editing = true;
    editBtn.classList.add("hidden");
    saveBtn.classList.remove("hidden");
    renderGrid();
  });

  saveBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/master/${currentClass}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: masterData.className,
          slots: masterData.slots,
          admin: "Admin",
        }),
      });
      const json = await res.json();
      if (json.success) {
        editing = false;
        editBtn.classList.remove("hidden");
        saveBtn.classList.add("hidden");
        alert("✅ Timetable saved!");
        loadMaster(currentClass);
      } else {
        alert("Save failed!");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving.");
    }
  });

  // ------------------ HISTORY PANEL ------------------ //

  historyBtn.addEventListener("click", async () => {
    historyPanel.classList.toggle("hidden");
    if (historyPanel.classList.contains("hidden")) return;

    historyList.innerHTML = "<p>Loading history...</p>";
    try {
      const res = await fetch(`/api/master/${currentClass}/history`);
      const json = await res.json();
      const history = Array.isArray(json.history) ? json.history : [];
      if (!history.length) {
        historyList.innerHTML = "<p>No timetable changes yet.</p>";
        return;
      }

      historyList.innerHTML = "";
      history.forEach((h) => {
        const date = new Date(h.changedAt).toLocaleString();
        const div = document.createElement("div");
        div.className = "history-item";
        div.innerHTML = `
          <div>
            <strong>${date}</strong> — ${h.changedBy || "Admin"}<br>
            <em>${h.note || "No note"}</em>
          </div>
          <button class="view-history-btn" data-id="${h._id}">View</button>
        `;
        historyList.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      historyList.innerHTML = "<p>Error loading history.</p>";
    }
  });

  // ------------------ LOGOUT ------------------ //

  logoutButton.addEventListener("click", async () => {
    const res = await fetch("/api/logout", { method: "POST" });
    const data = await res.json();
    if (data.success) window.location.href = "/";
  });
});

// ------------------ VIEW HISTORY MODAL ------------------ //
// (Assumes generateTimetableHTML is already defined somewhere)

document.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("view-history-btn")) return;

  const historyId = e.target.dataset.id;

  try {
    const res = await fetch(`/api/master/history/${historyId}`);
    const data = await res.json();

    if (!data || !data.timetable) {
      document.getElementById("historyTimetable").innerHTML =
        "<p>No timetable found for this version.</p>";
    } else {
      document.getElementById("historyTimetable").innerHTML =
        generateTimetableHTML(data.timetable);
    }

    document.getElementById("historyModal").style.display = "flex";
  } catch (err) {
    console.error("Error loading history timetable:", err);
  }
});

// CLOSE modal
document.getElementById("closeModal").onclick = () => {
  document.getElementById("historyModal").style.display = "none";
};


// ===============================
// MASTER TIMETABLE EXPORT
// ===============================

// ✅ PDF
async function downloadMasterPDF(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) {
    alert("Section not found");
    return;
  }

  const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(section, { scale: 2 });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("l", "pt", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("Master_Timetable.pdf");
}

// ✅ IMAGE
async function downloadMasterImage(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) {
    alert("Section not found");
    return;
  }

  const canvas = await html2canvas(section, { scale: 2 });
  const link = document.createElement("a");
  link.download = "Master_Timetable.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
