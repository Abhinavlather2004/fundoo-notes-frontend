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

    const editNoteModal = new bootstrap.Modal(document.getElementById("editNoteModal"));
    const editNoteTitle = document.getElementById("editNoteTitle");
    const editNoteContent = document.getElementById("editNoteContent");
    const saveNoteButton = document.getElementById("saveNoteButton");
    const reminderModal = new bootstrap.Modal(document.getElementById("reminderModal"));
    const reminderDateTime = document.getElementById("reminderDateTime");
    const setReminderButton = document.getElementById("setReminderButton");

    // Hamburger Menu Toggle
    const hamburgerIcon = document.querySelector(".fundoo-dash-hamburger");
    const sidebar = document.querySelector(".fundoo-dash-sidebar");
    const mainContent = document.querySelector(".fundoo-dash-main-content");
    const sectionLabel = document.querySelector(".section-label");

    // Load sidebar state from localStorage
    const isSidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (isSidebarCollapsed) {
        sidebar.classList.add("collapsed");
        mainContent.classList.add("sidebar-collapsed");
    }

    hamburgerIcon.addEventListener("click", function () {
        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("sidebar-collapsed");
        localStorage.setItem("sidebarCollapsed", sidebar.classList.contains("collapsed"));
    });

    let currentView = "notes";
    let allNotes = [];
    let searchQuery = "";
    let currentEditingNoteId = null;

    const userName = localStorage.getItem("userName") || "Guest";
    const userEmail = localStorage.getItem("userEmail") || "guest@example.com";

    document.getElementById("profileLogo").textContent = userEmail.charAt(0).toUpperCase();
    document.getElementById("userName").textContent = userName;
    document.getElementById("userEmail").textContent = userEmail;

    if (!authToken) {
        alert("You are not logged in!");
        return;
    }

    document.getElementById("notesTab").addEventListener("click", () => switchView("notes"));
    document.getElementById("archiveTab").addEventListener("click", () => switchView("archive"));
    document.getElementById("reminderTab").addEventListener("click", () => switchView("reminder"));
    document.getElementById("trashTab").addEventListener("click", () => switchView("trash"));

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        const debouncedSearch = debounce(function () {
            searchQuery = searchInput.value.trim().toLowerCase();
            renderNotes();
        }, 300);
        searchInput.addEventListener("input", debouncedSearch);
    }

    fetchNotes();
    requestNotificationPermission();

    function switchView(view) {
        currentView = view;
        renderNotes();
        createNoteSection.style.display = view === "notes" ? "block" : "none";
        sectionLabel.textContent = view.charAt(0).toUpperCase() + view.slice(1);

        document.querySelectorAll(".fundoo-dash-sidebar li").forEach(tab => tab.classList.remove("active"));
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
            if (!response.ok) throw new Error(`Failed to fetch notes. Status: ${response.status}`);
            allNotes = await response.json();
            scheduleAllReminders();
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
            } else if (currentView === "reminder") {
                inView = note.reminder && !note.is_deleted;
            }
            if (!inView) return false;

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
    }

    function formatTimestamp(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return isToday ? `Today, ${hours}:${minutes}` : date.toLocaleDateString();
    }

    function addNoteToGrid(note) {
        const noteElement = document.createElement("div");
        noteElement.classList.add("fundoo-dash-note");
        noteElement.style.backgroundColor = note.color || "#fff";
        noteElement.dataset.id = note.id;
        let title = note.title && note.title.trim() ? note.title : 
                   note.content.split(" ").slice(0, 5).join(" ") || "Untitled";
        const timestamp = note.updated_at || note.created_at || new Date().toISOString();
        
        noteElement.innerHTML = `
            <h4>${title}</h4>
            <p>${note.content}</p>
            <div class="timestamp">${formatTimestamp(timestamp)}</div>
            ${note.reminder ? `
                <div class="reminder-info">
                    <i class="fas fa-bell"></i>
                    <span>${formatTimestamp(note.reminder)}</span>
                </div>
            ` : ''}
            <div class="note-icons">
                ${currentView !== "trash" ? `
                    <i class="fas fa-edit edit-icon" data-id="${note.id}" title="Edit"></i>
                    <i class="fas fa-bell reminder-icon" data-id="${note.id}" title="Set Reminder"></i>
                ` : ""}
                ${currentView === "notes" ? `
                    <i class="fas fa-palette color-icon" data-id="${note.id}" title="Change Color"></i>
                    <i class="fas fa-box-archive archive-icon" data-id="${note.id}" title="Archive"></i>
                    <i class="fas fa-trash delete-icon" data-id="${note.id}" title="Move to Trash"></i>
                ` : ""}
                ${currentView === "archive" ? `
                    <i class="fas fa-folder-open unarchive-icon" data-id="${note.id}" title="Unarchive"></i>
                    <i class="fas fa-trash delete-icon" data-id="${note.id}" title="Move to Trash"></i>
                ` : ""}
                ${currentView === "reminder" ? `
                    <i class="fas fa-trash delete-icon" data-id="${note.id}" title="Move to Trash"></i>
                ` : ""}
                ${currentView === "trash" ? `
                    <i class="fas fa-undo restore-icon" data-id="${note.id}" title="Restore"></i>
                    <i class="fas fa-trash-alt delete-permanent-icon" data-id="${note.id}" title="Delete Permanently"></i>
                ` : ""}
            </div>
        `;
        notesGrid.prepend(noteElement);
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

    notesGrid.addEventListener("click", async function (event) {
        const target = event.target;
        const noteId = target.dataset.id;
        if (!noteId) return;

        if (target.classList.contains("edit-icon")) openEditModal(noteId);
        else if (target.classList.contains("archive-icon")) toggleArchive(noteId, true);
        else if (target.classList.contains("unarchive-icon")) toggleArchive(noteId, false);
        else if (target.classList.contains("delete-icon")) toggleTrash(noteId, true);
        else if (target.classList.contains("restore-icon")) toggleTrash(noteId, false);
        else if (target.classList.contains("delete-permanent-icon")) deleteNote(noteId);
        else if (target.classList.contains("color-icon")) changeColor(noteId);
        else if (target.classList.contains("reminder-icon")) openReminderModal(noteId);
    });

    function openEditModal(noteId) {
        const note = allNotes.find((n) => n.id == noteId);
        if (!note) return;
        currentEditingNoteId = noteId;
        editNoteTitle.value = note.title || "";
        editNoteContent.value = note.content || "";
        editNoteModal.show();
    }

    function openReminderModal(noteId) {
        currentEditingNoteId = noteId;
        const note = allNotes.find((n) => n.id == noteId);
        reminderDateTime.value = note.reminder || "";
        reminderModal.show();
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
            updateNoteLocally(currentEditingNoteId, updatedFields);
            editNoteModal.hide();
        } catch (error) {
            console.error("Error updating note:", error);
        }
    });

    setReminderButton.addEventListener("click", async function () {
        if (!currentEditingNoteId) return;
        const reminderTime = reminderDateTime.value;
        try {
            await fetch(`${apiUrl}/${currentEditingNoteId}/reminder`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ reminder: reminderTime || null }),
            });
            updateNoteLocally(currentEditingNoteId, { reminder: reminderTime || null });
            scheduleReminder({ id: currentEditingNoteId, reminder: reminderTime, content: editNoteContent.value });
            reminderModal.hide();
        } catch (error) {
            console.error("Error setting reminder:", error);
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
            if (deleteStatus) {
                note.was_archived_before_delete = note.is_archived;
            }
            await fetch(`${apiUrl}/${id}/toggle_delete`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({
                    note: {
                        isDeleted: deleteStatus,
                        was_archived_before_delete: deleteStatus ? note.is_archived : undefined,
                    },
                }),
            });
            updateNoteLocally(id, {
                is_deleted: deleteStatus,
                is_archived: deleteStatus ? false : note.was_archived_before_delete,
            });
        } catch (error) {
            console.error("Error toggling trash:", error);
        }
    }

    async function deleteNote(id) {
        try {
            await fetch(`${apiUrl}/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${authToken}` },
            });
            allNotes = allNotes.filter((note) => note.id !== parseInt(id));
            renderNotes();
        } catch (error) {
            console.error("Error deleting note permanently:", error);
        }
    }

    function changeColor(id) {
        const existingPicker = document.querySelector(".color-picker-popover");
        if (existingPicker) existingPicker.remove();

        const noteElement = document.querySelector(`.fundoo-dash-note[data-id="${id}"]`);
        const colorIcon = noteElement.querySelector(".color-icon");

        const colorPicker = document.createElement("div");
        colorPicker.classList.add("color-picker-popover");

        predefinedColors.forEach((color) => {
            const colorOption = document.createElement("div");
            colorOption.classList.add("color-option");
            colorOption.style.backgroundColor = color;
            colorOption.dataset.color = color;

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
                    colorPicker.remove();
                } catch (error) {
                    console.error("Error changing color:", error);
                }
            });

            colorPicker.appendChild(colorOption);
        });

        const iconRect = colorIcon.getBoundingClientRect();
        colorPicker.style.top = `${iconRect.bottom + window.scrollY + 5}px`;
        colorPicker.style.left = `${iconRect.left + window.scrollX - 150}px`;

        document.body.appendChild(colorPicker);

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
        allNotes = allNotes.map((note) => note.id == id ? { ...note, ...updatedData } : note);
        renderNotes();
    }

    function requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.error("This browser does not support desktop notifications.");
            return;
        }
    
        if (Notification.permission === "granted") {
            console.log("Notification permission already granted.");
            return;
        }
    
        if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Notification permission granted.");
                } else {
                    console.warn("Notification permission denied.");
                }
            }).catch(error => {
                console.error("Error requesting notification permission:", error);
            });
        } else {
            console.warn("Notification permission previously denied.");
        }
    }

    function scheduleReminder(note) {
        if (!note.reminder) {
            console.log(`No reminder set for note ${note.id}`);
            return;
        }
    
        const reminderTime = new Date(note.reminder).getTime();
        const currentTime = new Date().getTime();
        const timeDifference = reminderTime - currentTime;
    
        console.log(`Scheduling reminder for note ${note.id}:`, {
            reminderTime: new Date(note.reminder).toISOString(),
            currentTime: new Date(currentTime).toISOString(),
            timeDifference: timeDifference / 1000 / 60, // Log difference in minutes
        });
    
        if (timeDifference <= 0) {
            console.log(`Reminder for note ${note.id} is in the past. Skipping.`);
            return;
        }
    
        setTimeout(() => {
            console.log(`Triggering reminder for note ${note.id}`);
            if (Notification.permission === "granted") {
                new Notification("Fundoo Notes Reminder", {
                    body: note.content || note.title || "Reminder",
                    // icon: "/path/to/icon.png", // Ensure this path is valid
                });
                console.log(`Notification sent for note ${note.id}`);
            } else {
                console.warn(`Cannot send notification for note ${note.id}: Permission not granted.`);
            }
        }, timeDifference);
    }
    
    function scheduleAllReminders() {
        console.log("Scheduling all reminders...");
        allNotes.forEach(note => {
            if (note.reminder) {
                console.log(`Found note ${note.id} with reminder: ${note.reminder}`);
                scheduleReminder(note);
            }
        });
    }

    const logoutButton = document.getElementById("Logout");
    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            localStorage.removeItem("jwtToken");
            localStorage.removeItem("userName");
            localStorage.removeItem("userEmail");
            window.location.href = "fundooLogin.html";
        });
    }
});