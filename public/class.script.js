document.addEventListener("DOMContentLoaded", () => {
  const addClassForm = document.getElementById("add-class-form");
  const classListContainer = document.getElementById("class-list-container");
  const classSelect = document.getElementById("timetable-class-select");
  const facultySection = document.getElementById("faculty-assignment");
  const timetableSection = document.getElementById("class-timetable");

  // 🔹 Load All Classes
  async function loadClasses() {
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      renderClassList(data);
      populateDropdown(data);
    } catch (err) {
      console.error(err);
      classListContainer.innerHTML = "<p style='color:red;'>Error loading classes.</p>";
    }
  }

  // 🔹 Populate Dropdown
  function populateDropdown(classes) {
    classSelect.innerHTML = '<option value="">Select a class</option>';
    classes.forEach(cls => {
      const opt = document.createElement("option");
      opt.value = cls._id;
      opt.textContent = cls.name;
      classSelect.appendChild(opt);
    });
  }

  // 🔹 Render Existing Classes
  function renderClassList(classes) {
    if (!classes.length) {
      classListContainer.innerHTML = "<p>No classes found.</p>";
      return;
    }

    classListContainer.innerHTML = "";
    classes.forEach(cls => {
      const div = document.createElement("div");
      div.className = "class-item";
      div.innerHTML = `
        <div>
          <strong>${cls.name}</strong>
          <p>${cls.description || "No description"}</p>
        </div>
        <div class="class-actions">
          <button class="delete-btn" data-id="${cls._id}">Remove</button>
        </div>
      `;
      div.querySelector(".delete-btn").addEventListener("click", () => deleteClass(cls._id));
      classListContainer.appendChild(div);
    });
  }

  // 🔹 Delete Class
  async function deleteClass(id) {
    if (!confirm("Are you sure you want to delete this class?")) return;
    await fetch(`/api/classes/${id}`, { method: "DELETE" });
    loadClasses();
  }

  // 🔹 Add New Class
  addClassForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("class-name").value.trim();
    const description = document.getElementById("class-description").value.trim();

    if (!name) return alert("Please enter a class name");

    await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    addClassForm.reset();
    loadClasses();
  });

 // When "Master Timetable" button is clicked
document.getElementById("open-master-btn").addEventListener("click", () => {
  const selectedClassId = document.getElementById("timetable-class-select").value;
  const selectedClassName = document.getElementById("timetable-class-select").selectedOptions[0].textContent;

  if (!selectedClassId) {
    alert("Please select a class first!");
    return;
  }

  // Save the selected class in localStorage
  localStorage.setItem("selectedClassId", selectedClassId);
  localStorage.setItem("selectedClassName", selectedClassName);

  // Redirect to master timetable page
  window.location.href = "master.html";
});


// When class is selected → load the MASTER saved timetable grid
classSelect.addEventListener("change", function () {
    const classId = this.value;

    if (!classId) {
        document.getElementById("class-timetable").innerHTML =
          "<p>Select a class to view its saved timetable.</p>";
        document.getElementById("faculty-assignment").innerHTML =
          "<p>Select a class to see faculty assignments.</p>";
        return;
    }

    // Load saved timetable (grid)
    loadSavedTimetable(classId);

    // Load assigned faculty list (from MASTER)
    loadFacultyAssignment(classId);
});

  async function loadFacultyAssignment(classId) {
  const box = document.getElementById("faculty-assignment");

  try {
    const res = await fetch(`/api/master/fetch/${classId}`);
    const json = await res.json();

    if (!json.success) {
      box.innerHTML = "<p>No faculty assigned.</p>";
      return;
    }

    const slots = json.timetable.slots;

    let facultyList = {};

    slots.forEach(s => {
      if (s.facultyName) {
        facultyList[s.facultyName] = s.subject;
      }
    });

    let html = `<table class="table-style"><tr>
                  <th>Faculty</th><th>Subject</th>
                </tr>`;

    Object.keys(facultyList).forEach(fac => {
      html += `<tr>
                <td>${fac}</td>
                <td>${facultyList[fac]}</td>
              </tr>`;
    });

    html += "</table>";

    box.innerHTML = html;

  } catch (err) {
    box.innerHTML = "<p>Error loading faculty.</p>";
  }
}


  // 🔹 Load Classes on Start
  loadClasses();

  // 🔹 Logout Button
  const logoutButton = document.getElementById("logout-button-class");
  logoutButton.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/logout", { method: "POST" });
      const data = await res.json();
      if (data.success) window.location.href = "/";
      else alert("Logout failed.");
    } catch {
      alert("Logout failed.");
    }
  });
});

async function loadSavedTimetable(classId) {
  const box = document.getElementById("class-timetable");

  try {
    const res = await fetch(`/api/master/fetch/${classId}`);
    const json = await res.json();

    if (!json.success) {
      box.innerHTML = "<p>No timetable saved for this class.</p>";
      return;
    }

    const data = json.timetable.slots;

    // Correct time order (same as Master + Faculty)
    const timeOrder = [
      "09:00 am",
      "09:50 am",
      "10:40 am",
      "11:30 am",
      "12:20 pm",
      "01:00 pm",
      "01:50 pm",
      "02:35 pm"
    ];

    // Time labels
    const timeLabels = {
      "09:00 am": "09:00 am - 09:50 am",
      "09:50 am": "09:50 am - 10:40 am",
      "10:40 am": "10:40 am - 11:30 am",
      "11:30 am": "11:30 am - 12:20 pm",
      "12:20 pm": "12:20 pm - 01:00 pm",
      "01:00 pm": "01:00 pm - 01:50 pm",
      "01:50 pm": "01:50 pm - 02:35 pm",
      "02:35 pm": "02:35 pm - 03:15 pm"
    };

    let html = `
      <div class="timetable-grid-box">
        <table class="timetable-grid">
          <thead>
            <tr>
              <th>Day / Time</th>
    `;

    timeOrder.forEach(t => {
      html += `<th>${timeLabels[t]}</th>`;
    });

    html += `
            </tr>
          </thead>
          <tbody>
    `;

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    days.forEach(day => {
      html += `<tr><td class="time-cell">${day}</td>`;

      timeOrder.forEach(startTime => {
        const slot = data.find(s => s.day === day && s.start === startTime);

        html += `
          <td>
            <div class="subject-box">${slot?.subject || "—"}</div>
            <div class="faculty-box">${slot?.facultyName || "—"}</div>
          </td>
        `;
      });

      html += `</tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    box.innerHTML = html;

  } catch (err) {
    box.innerHTML = "<p>Error loading timetable.</p>";
  }
}
