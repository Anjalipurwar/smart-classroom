document.addEventListener("DOMContentLoaded", () => {
  const timetableContainer = document.getElementById("timetable-grid-container");
  const titleElement = document.getElementById("timetable-title");
  const logoutButton = document.getElementById("logout-button-view");

  // 🧠 Handle Logout
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/logout", { method: "POST" });
        const data = await response.json();
        if (data.success) window.location.href = "/";
      } catch (error) {
        console.error("Logout failed:", error);
      }
    });
  }

  // 🧩 Load saved timetable data
  try {
    const savedData = localStorage.getItem("generatedTimetable");
    const timetableTitle = localStorage.getItem("timetableTitle") || "Your Timetable";

    titleElement.textContent = timetableTitle;

    if (!savedData) {
      timetableContainer.innerHTML = `
        <p style="color:red;">⚠️ No timetable found. Please generate one from the "Generate Timetable" page.</p>`;
      return;
    }

    let timetableData;
    try {
      timetableData = JSON.parse(savedData);
    } catch (err) {
      console.warn("Invalid timetable JSON:", err);
      timetableContainer.innerHTML = `
        <p style="color:red;">⚠️ Unable to read saved timetable data. Please regenerate your timetable.</p>`;
      return;
    }

    if (!Array.isArray(timetableData) || timetableData.length === 0) {
      timetableContainer.innerHTML = `
        <p style="color:red;">⚠️ No timetable slots found. Please generate one first.</p>`;
      return;
    }

    // 🗓 Create a responsive table grid
    let html = `
      <table class="timetable-grid">
        <thead>
          <tr>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Type</th>
            <th>Subject / Break</th>
            <th>Assigned Faculty</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>`;
timetableData.forEach(slot => {
  html += `
    <tr>
      <td>${slot.startTime || "-"}</td>
      <td>${slot.endTime || "-"}</td>
      <td>${slot.type || "-"}</td>
      <td>${slot.subject || "-"}</td>
      <td>${slot.assignedFaculty || "-"}</td>
      <td>${slot.note || ""}</td>
    </tr>`;
});


    html += `</tbody></table>`;

    // 🧩 Add controls
    html += `
      <div class="controls">
        <button id="clear-timetable" class="clear-btn">🗑 Clear Timetable</button>
        <button id="regenerate" class="regen-btn">🔁 Regenerate</button>
      </div>`;

    timetableContainer.innerHTML = html;

    // 🧹 Clear Timetable
    document.getElementById("clear-timetable").addEventListener("click", () => {
      localStorage.removeItem("generatedTimetable");
      localStorage.removeItem("timetableTitle");
      timetableContainer.innerHTML = `
        <p style="color:green;">✅ Timetable cleared. Go to "Generate Timetable" to create a new one.</p>`;
    });

    // 🔁 Regenerate (redirect)
    document.getElementById("regenerate").addEventListener("click", () => {
      window.location.href = "/app";
    });

  } catch (error) {
    console.error("Error loading timetable:", error);
    timetableContainer.innerHTML = `<p style="color:red;">❌ Unexpected error while loading timetable.</p>`;
  }
});


// ===============================
// EXPORT TIMETABLE (PDF & IMAGE)
// ===============================

// ✅ Download as PDF
async function downloadAsPDF(sectionId) {
  const section = document.getElementById(sectionId);

  if (!section) {
    alert("Section not found");
    return;
  }

  const { jsPDF } = window.jspdf;

  const canvas = await html2canvas(section, {
    scale: 2
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("l", "pt", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("Timetable.pdf");
}


// ✅ Download as Image
async function downloadAsImage(sectionId) {
  const section = document.getElementById(sectionId);

  if (!section) {
    alert("Section not found");
    return;
  }

  const canvas = await html2canvas(section, {
    scale: 2
  });

  const link = document.createElement("a");
  link.download = "Timetable.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
