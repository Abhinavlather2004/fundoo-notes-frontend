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
    searchInput.addEventListener("input", function () {
      searchQuery = searchInput.value.trim().toLowerCase(); // Update searchQuery
      renderNotes(); // Re-render notes based on search
    });
  }

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

  async function changeColor(id) {
    const newColor = prompt("Enter new color (e.g., #ff5733):");
    if (!newColor) return;
    try {
      await fetch(`${apiUrl}/${id}/color`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ note: { color: newColor } }),
      });
      updateNoteLocally(id, { color: newColor });
    } catch (error) {
      console.error("Error changing color:", error);
    }
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
      window.location.href = "fundooLogin.html"; // Redirect to login page
    });
  }
});
