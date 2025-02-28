// Predefined colors (similar to Google Keep)
const predefinedColors = [
  "#ffffff", // White
  "#f28b82", // Light Red
  "#fbbc04", // Orange
  "#fff475", // Yellow
  "#ccff90", // Light Green
  "#a7ffeb", // Cyan
  "#cbf0f8", // Light Blue
  "#aecbfa", // Light Purple
  "#d7aefb", // Purple
  "#fdcfe8", // Pink
  "#e6c9a8", // Light Brown
  "#e8eaed", // Gray
];

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

document.addEventListener("DOMContentLoaded", function () {
  const noteInput = document.getElementById("noteInput");
  const notesGrid = document.querySelector(".fundoo-dash-notes-grid");
  const createNoteSection = document.querySelector(".fundoo-dash-create-note");
  const apiUrl = "http://localhost:3000/api/v1/notes";
  const authToken = localStorage.getItem("jwtToken");

  const editNoteModal = new bootstrap.Modal(
    document.getElementById("editNoteModal")
  );
  const editNoteTitle = document.getElementById("editNoteTitle");
  const editNoteContent = document.getElementById("editNoteContent");
  const saveNoteButton = document.getElementById("saveNoteButton");

  let currentView = "notes";
  let allNotes = [];
  let searchQuery = ""; // Store the search query
  let currentEditingNoteId = null;

  const userName = localStorage.getItem("userName") || "Guest";
  const userEmail = localStorage.getItem("userEmail") || "guest@example.com";

  // Update profile button with first letter of email
  const profileLogo = document.getElementById("profileLogo");
  profileLogo.textContent = userEmail.charAt(0).toUpperCase();

  // Update dropdown with user details
  document.getElementById("userName").textContent = userName;
  document.getElementById("userEmail").textContent = userEmail;
    
  if (!authToken) {
    alert("You are not logged in!");
    return;
  }

  document
    .getElementById("notesTab")
    .addEventListener("click", () => switchView("notes"));
  document
    .getElementById("archiveTab")
    .addEventListener("click", () => switchView("archive"));
  document
    .getElementById("trashTab")
    .addEventListener("click", () => switchView("trash"));

  // Get the search input element
  const searchInput = document.getElementById("searchInput");

  // Add event listener for search input
  if (searchInput) {
    const debouncedSearch = debounce(function () {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderNotes();
    }, 300); // 300ms delay

    searchInput.addEventListener("input", debouncedSearch);
  }

  fetchNotes();

  fetchNotes();

  function switchView(view) {
    currentView = view;
    renderNotes();
    createNoteSection.style.display = view === "notes" ? "block" : "none";

    document
      .querySelectorAll(".fundoo-dash-sidebar li")
      .forEach((tab) => tab.classList.remove("active"));
    document.getElementById(`${view}Tab`).classList.add("active");
  }

  async function fetchNotes() {
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok)
        throw new Error(`Failed to fetch notes. Status: ${response.status}`);
      allNotes = await response.json();
      renderNotes();
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }

  function renderNotes() {
    notesGrid.innerHTML = "";
    const filteredNotes = allNotes.filter((note) => {
      let inView = false;
      if (currentView === "notes") {
        inView = !note.is_deleted && !note.is_archived;
      } else if (currentView === "archive") {
        inView = note.is_archived;
      } else if (currentView === "trash") {
        inView = note.is_deleted;
      }
      if (!inView) return false;

      // Filter notes based on search query
      if (searchQuery) {
        const title = note.title ? note.title.toLowerCase() : "";
        const content = note.content ? note.content.toLowerCase() : "";
        return title.includes(searchQuery) || content.includes(searchQuery);
      }

      return true;
    });

    if (filteredNotes.length === 0) {
      notesGrid.innerHTML = "<p>No notes found</p>";
    } else {
      filteredNotes.forEach(addNoteToGrid);
    }
    console.log("Rendering Notes for View:", currentView, filteredNotes);
  }

  noteInput.addEventListener("blur", async function () {
    const content = noteInput.value.trim();
    if (!content) return;
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ note: { title: "Untitled", content } }),
      });
      const newNote = await response.json();
      allNotes.push(newNote);
      noteInput.value = "";
      renderNotes();
    } catch (error) {
      console.error("Error creating note:", error);
    }
  });

  function addNoteToGrid(note) {
    const noteElement = document.createElement("div");
    noteElement.classList.add("fundoo-dash-note");
    noteElement.style.backgroundColor = note.color || "#fff";
    noteElement.dataset.id = note.id;
    let title =
      note.title && note.title.trim()
        ? note.title
        : note.content.split(" ").slice(0, 5).join(" ") || "Untitled";
    noteElement.innerHTML = `
    <h4>${title}</h4>
    <p>${note.content}</p>
    <div class="note-icons">
        ${
          currentView !== "trash"
            ? `<i class="fas fa-edit edit-icon" data-id="${note.id}" title="Edit"></i>`
            : ""
        }
        ${
          currentView === "notes"
            ? `
            <i class="fas fa-palette color-icon" data-id="${note.id}" title="Change Color"></i>
            <i class="fas fa-box-archive archive-icon" data-id="${note.id}" title="Archive"></i>
            <i class="fas fa-trash delete-icon" data-id="${note.id}" title="Move to Trash"></i>
        `
            : ""
        }
        ${
          currentView === "archive"
            ? `
            <i class="fas fa-folder-open unarchive-icon" data-id="${note.id}" title="Unarchive"></i>
            <i class="fas fa-trash delete-icon" data-id="${note.id}" title="Move to Trash"></i>
        `
            : ""
        }
        ${
          currentView === "trash"
            ? `
            <i class="fas fa-undo restore-icon" data-id="${note.id}" title="Restore"></i>
            <i class="fas fa-trash-alt delete-permanent-icon" data-id="${note.id}" title="Delete Permanently"></i>
        `
            : ""
        }
    </div>
    `;
    notesGrid.prepend(noteElement);
  }

  notesGrid.addEventListener("click", async function (event) {
    const target = event.target;
    const noteId = target.dataset.id;
    if (!noteId) return;
    if (target.classList.contains("edit-icon")) openEditModal(noteId);
    else if (target.classList.contains("archive-icon"))
      toggleArchive(noteId, true);
    else if (target.classList.contains("unarchive-icon"))
      toggleArchive(noteId, false);
    else if (target.classList.contains("delete-icon"))
      toggleTrash(noteId, true);
    else if (target.classList.contains("restore-icon"))
      toggleTrash(noteId, false);
    else if (target.classList.contains("delete-permanent-icon"))
      deleteNote(noteId);
    else if (target.classList.contains("color-icon")) changeColor(noteId);
  });
  function openEditModal(noteId) {
    const note = allNotes.find((n) => n.id == noteId);
    if (!note) return;

    currentEditingNoteId = noteId;
    editNoteTitle.value = note.title || "";
    editNoteContent.value = note.content || "";
    editNoteModal.show();
  }

  saveNoteButton.addEventListener("click", async function () {
    if (!currentEditingNoteId) return;

    const updatedFields = {
      title: editNoteTitle.value.trim(),
      content: editNoteContent.value.trim(),
    };

    try {
      await fetch(`${apiUrl}/${currentEditingNoteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ note: updatedFields }),
      });
      allNotes = allNotes.map((note) =>
        note.id == currentEditingNoteId ? { ...note, ...updatedFields } : note
      );
      renderNotes();
      editNoteModal.hide();
    } catch (error) {
      console.error("Error updating note:", error);
    }
  });

  async function toggleArchive(id, archive) {
    try {
      await fetch(`${apiUrl}/${id}/archive`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ note: { is_archived: archive } }),
      });
      updateNoteLocally(id, { is_archived: archive });
    } catch (error) {
      console.error("Error toggling archive:", error);
    }
  }

  async function toggleTrash(id, deleteStatus) {
    try {
      const note = allNotes.find((note) => note.id == id);
      if (!note) return;

      // If moving to trash, store whether it was archived before deletion
      if (deleteStatus) {
        note.was_archived_before_delete = note.is_archived;
      }

      await fetch(`${apiUrl}/${id}/toggle_delete`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          note: {
            isDeleted: deleteStatus,
            was_archived_before_delete: deleteStatus
              ? note.is_archived
              : undefined,
          },
        }),
      });

      updateNoteLocally(id, {
        is_deleted: deleteStatus,
        is_archived: deleteStatus ? false : note.was_archived_before_delete, // Restore the last known archive state
      });

      renderNotes(); // Refresh UI
    } catch (error) {
      console.error("Error toggling trash:", error);
    }
  }

  async function deleteNote(id) {
    try {
      const response = await fetch(`${apiUrl}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete note. Status: ${response.status}`);
      }

      // Remove the deleted note from the local list
      allNotes = allNotes.filter((note) => note.id !== parseInt(id));

      renderNotes(); // Refresh UI
    } catch (error) {
      console.error("Error deleting note permanently:", error);
    }
  }

  function changeColor(id) {
    // Remove any existing color picker popovers
    const existingPicker = document.querySelector(".color-picker-popover");
    if (existingPicker) existingPicker.remove();
  
    const noteElement = document.querySelector(`.fundoo-dash-note[data-id="${id}"]`);
    const colorIcon = noteElement.querySelector(".color-icon");
  
    // Create the color picker popover
    const colorPicker = document.createElement("div");
    colorPicker.classList.add("color-picker-popover");
  
    // Add color options
    predefinedColors.forEach((color) => {
      const colorOption = document.createElement("div");
      colorOption.classList.add("color-option");
      colorOption.style.backgroundColor = color;
      colorOption.dataset.color = color;
  
      // Add click event to select a color
      colorOption.addEventListener("click", async () => {
        try {
          await fetch(`${apiUrl}/${id}/color`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ color }),
          });
          updateNoteLocally(id, { color });
          colorPicker.remove(); // Close the popover after selection
        } catch (error) {
          console.error("Error changing color:", error);
        }
      });
  
      colorPicker.appendChild(colorOption);
    });
  
    // Position the popover near the color icon
    const iconRect = colorIcon.getBoundingClientRect();
    colorPicker.style.top = `${iconRect.bottom + window.scrollY + 5}px`;
    colorPicker.style.left = `${iconRect.left + window.scrollX - 150}px`; // Adjust based on popover width
  
    // Append the popover to the body
    document.body.appendChild(colorPicker);
  
    // Close the popover if clicking outside
    const closePopover = (event) => {
      if (!colorPicker.contains(event.target) && event.target !== colorIcon) {
        colorPicker.remove();
        document.removeEventListener("click", closePopover);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", closePopover);
    }, 0);
  }

  function updateNoteLocally(id, updatedData) {
    allNotes = allNotes.map((note) =>
      note.id == id ? { ...note, ...updatedData } : note
    );
    renderNotes();
  }

  const logoutButton = document.getElementById("Logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      localStorage.removeItem("jwtToken"); // Remove authentication token
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      window.location.href = "fundooLogin.html"; // Redirect to login page
    });
  }
});
