// File: public/faculty.script.js
document.addEventListener('DOMContentLoaded', () => {
let editingFacultyId = null;

  // --- Elements ---
  const addFacultyForm = document.getElementById('add-faculty-form');
  const facultyListContainer = document.getElementById('faculty-list-container');
  const facultyAddStatus = document.getElementById('faculty-add-status');
  const logoutButton = document.getElementById('logout-button-faculty');

  // --- Event Listeners ---

  // Handle Logout
  logoutButton.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        window.location.href = '/'; // Redirect to login page
      } else {
        alert('Logout failed.');
      }
    } catch (error) {
      alert('Logout error.');
    }
  });

  // Handle Add Faculty Form Submission
  addFacultyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('faculty-name');
    const subjectsInput = document.getElementById('faculty-subjects');
    const name = nameInput.value.trim();
    const subjects = subjectsInput.value.trim();

    if (!name || !subjects) {
        showStatus('Please fill in both name and subjects.', true);
        return;
    }

    showStatus('Adding...', false);

    try {
      const response = await fetch('/api/faculty', { // Calls routes/faculty.js POST '/'
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subjects })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add faculty');
      }

      showStatus('Faculty added successfully!', false);
      addFacultyForm.reset(); // Clear the form
      loadFaculty(); // Refresh the list

    } catch (error) {
      showStatus(`Error: ${error.message}`, true);
    }
  });


  // --- Timetable Grid Logic ---
let selectedFacultyId = null;
const facultySelect = document.getElementById('faculty-select');
const availabilityGrid = document.getElementById('availability-grid');
const saveButton = document.getElementById('save-availability');
const statusMsg = document.getElementById('availability-status');

// Load dropdown with faculty names
async function loadFacultyDropdown() {
  const res = await fetch('/api/faculty');
  const data = await res.json();
  facultySelect.innerHTML = '<option value="">Select Faculty</option>';
  data.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f._id;
    opt.textContent = f.name;
    facultySelect.appendChild(opt);
  });
}

// Create timetable grid
function createGrid(availability = {}) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = [
    { start: '09:00 am', end: '09:50 am' },
    { start: '09:50 am', end: '10:40 am' },
    { start: '10:40 am', end: '11:30 am' },
    { start: '11:30 am', end: '12:20 pm' },
    { start: '12:20 pm', end: '01:00 pm' },
    { start: '01:00 pm', end: '01:50 pm' },
    { start: '01:50 pm', end: '02:35 pm' },
    { start: '02:35 pm', end: '03:15 pm' },
  ];

  let html = `<table class="availability-table"><thead><tr><th>Time</th>`;
  days.forEach(d => html += `<th>${d}</th>`);
  html += `</tr></thead><tbody>`;

  times.forEach(t => {
    html += `<tr><td>${t.start} - ${t.end}</td>`;

    days.forEach(day => {
      const slot = (availability[day] || []).find(s => s.start === t.start);
      const status = slot ? slot.status : "free";

      html += `
        <td>
          <div class="status-box ${status}">
            ${status.toUpperCase()}
          </div>
        </td>
      `;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;
  availabilityGrid.innerHTML = html;
}


document.getElementById("save-availability").style.display = "none";

// When faculty selected → load their saved availability
facultySelect.addEventListener('change', async () => {
  selectedFacultyId = facultySelect.value;

  if (!selectedFacultyId) {
    availabilityGrid.innerHTML = "";
    return;
  }

  // Load auto busy/free from MASTER timetable
  const res = await fetch(`/api/faculty/auto-availability/${selectedFacultyId}`);
  const json = await res.json();

  if (!json.success) {
    availabilityGrid.innerHTML = "<p>Error loading timetable.</p>";
    return;
  }

  createGrid(json.availability);
});

// Save button
saveButton.addEventListener('click', async () => {
  if (!selectedFacultyId) {
    statusMsg.textContent = 'Select a faculty first.';
    return;
  }

  const availability = {};
  document.querySelectorAll('#availability-grid select').forEach(sel => {
    const day = sel.dataset.day;
    if (!availability[day]) availability[day] = [];
    availability[day].push({
      start: sel.dataset.start,
      end: sel.dataset.end,
      status: sel.value,
    });
  });

  const res = await fetch(`/api/faculty/availability/${selectedFacultyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability }),
  });

  const data = await res.json();
  statusMsg.textContent = data.success
    ? 'Availability saved successfully!'
    : 'Failed to save availability.';
  setTimeout(() => (statusMsg.textContent = ''), 3000);
});

// Initial load
loadFacultyDropdown();


  // --- Functions ---

  // Function to load and display all faculty
  async function loadFaculty() {
    facultyListContainer.innerHTML = '<p>Loading faculty...</p>';
    try {
      const response = await fetch('/api/faculty'); // Calls routes/faculty.js GET '/'
      if (response.status === 401) { window.location.href = '/'; return; } // Redirect if not logged in
      if (!response.ok) throw new Error('Failed to fetch faculty');
      const facultyList = await response.json();

      if (!Array.isArray(facultyList)) {
        throw new Error('Invalid data received from server');
      }

      if (facultyList.length === 0) {
        facultyListContainer.innerHTML = '<p>No faculty added yet.</p>';
        return;
      }

      facultyListContainer.innerHTML = ''; // Clear loading message

      facultyList.forEach(faculty => {
        const div = document.createElement('div');
        div.className = 'faculty-item';
        div.dataset.id = faculty._id; // Store ID for potential updates

        const isPresent = faculty.isPresent !== false; // Default to true

        // Create subject spans
        const subjectsHtml = faculty.subjects && faculty.subjects.length > 0
          ? faculty.subjects.map(s => `<span>${s}</span>`).join('')
          : '<span>No subjects listed</span>';

        div.innerHTML = `
          <div class="faculty-item-details">
            <strong>${faculty.name}</strong>
            <div class="subjects-list">Teaches: ${subjectsHtml}</div>
          </div>
          <div class="attendance-toggle">
            <span class="toggle-label">${isPresent ? 'Present' : 'Absent'}</span>
            <label class="switch">
              <input type="checkbox" class="attendance-checkbox" data-id="${faculty._id}" ${isPresent ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <button class="edit-button" data-id="${faculty._id}">Edit</button>
          <button class="delete-button" data-id="${faculty._id}">Delete</button>
        `;

        // Attach event listeners using event delegation might be more efficient for many items,
        // but attaching directly is fine for moderate numbers.

        // Delete button listener
        div.querySelector('.delete-button').addEventListener('click', handleDelete);
div.querySelector('.edit-button').addEventListener('click', () => {
  openEditModal(faculty);
});

        // Attendance toggle listener
        div.querySelector('.attendance-checkbox').addEventListener('change', handleAttendanceToggle);

        facultyListContainer.appendChild(div);
      });

    } catch (error) {
      console.error(error);
      facultyListContainer.innerHTML = `<p style="color: red;">Error loading faculty: ${error.message}</p>`;
    }
  }

  // Handler for delete button click
  async function handleDelete(event) {
    const button = event.target;
    const id = button.dataset.id;
    if (confirm(`Are you sure you want to delete this faculty member?`)) {
      button.disabled = true; // Prevent double-clicks
      button.textContent = 'Deleting...';
      try {
        const response = await fetch(`/api/faculty/${id}`, { method: 'DELETE' }); // Calls routes/faculty.js DELETE '/:id'
        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Failed to delete');
        }
        // Remove the item directly from the DOM for instant feedback
        button.closest('.faculty-item').remove();
        // Optional: Show a success message if needed
        // If the list is now empty, show the message
        if (facultyListContainer.children.length === 0) {
            facultyListContainer.innerHTML = '<p>No faculty added yet.</p>';
        }

      } catch (error) {
        alert(`Error deleting faculty: ${error.message}`);
        button.disabled = false; // Re-enable button on error
        button.textContent = 'Delete';
      }
    }
  }

  // Handler for attendance toggle change
  async function handleAttendanceToggle(event) {
    const checkbox = event.target;
    const id = checkbox.dataset.id;
    const isPresent = checkbox.checked;
    const label = checkbox.closest('.attendance-toggle').querySelector('.toggle-label');

    label.textContent = isPresent ? 'Present' : 'Absent'; // Update label immediately

    try {
      const response = await fetch(`/api/faculty/attendance/${id}`, { // Calls routes/faculty.js PUT '/attendance/:id'
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPresent: isPresent })
      });
       if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Failed to update attendance');
        }
      // Success - no further action needed as UI updated optimistically
    } catch (error) {
      alert(`Error updating attendance: ${error.message}`);
      // Revert UI on error
      checkbox.checked = !isPresent;
      label.textContent = !isPresent ? 'Present' : 'Absent';
    }
  }

  // Helper function to show status messages
  function showStatus(message, isError) {
    facultyAddStatus.textContent = message;
    facultyAddStatus.style.color = isError ? '#dc3545' : '#00c6a7';
    // Clear message after 3 seconds
    setTimeout(() => { facultyAddStatus.textContent = ''; }, 3000);
  }

  // --- Initial Load ---
  loadFaculty(); // Load the faculty list when the page loads


  function openEditModal(faculty) {
  editingFacultyId = faculty._id;

  document.getElementById("edit-faculty-name").value = faculty.name;
  document.getElementById("edit-faculty-type").value = faculty.type || "both";
  document.getElementById("edit-faculty-subjects").value =
    faculty.subjects.join(",");

  document.getElementById("edit-modal").style.display = "flex";
}
document.getElementById("cancel-edit-btn").addEventListener("click", () => {
  document.getElementById("edit-modal").style.display = "none";
  editingFacultyId = null;
});
document.getElementById("save-edit-btn").addEventListener("click", async () => {
  if (!editingFacultyId) return;

  const name = document.getElementById("edit-faculty-name").value.trim();
  const type = document.getElementById("edit-faculty-type").value;
  const subjects = document.getElementById("edit-faculty-subjects")
    .value.split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (!name || subjects.length === 0) {
    alert("Name and subjects required");
    return;
  }

  try {
    const res = await fetch(`/api/faculty/${editingFacultyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subjects, type })
    });

    const data = await res.json();
    if (!data.success) {
      alert("Update failed");
      return;
    }

    document.getElementById("edit-modal").style.display = "none";
    editingFacultyId = null;
    loadFaculty(); // ✅ REFRESH LIST

  } catch {
    alert("Server error");
  }
});

}); // End DOMContentLoaded

// ===============================
// EXPORT FACULTY (PDF & IMAGE)
// ===============================

async function downloadAsPDF(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) {
    alert("Section not found");
    return;
  }

  const { jsPDF } = window.jspdf;

  const canvas = await html2canvas(section, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "pt", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("Faculty_List.pdf");
}

async function downloadAsImage(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) {
    alert("Section not found");
    return;
  }

  const canvas = await html2canvas(section, { scale: 2 });
  const link = document.createElement("a");
  link.download = "Faculty_List.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
