const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");
const statusMessage = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

let notes = [];
let activeRequests = 0;

async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`The server returned status ${response.status}.`);
  }

  if (response.status === 204) {
    return { data: null, status: response.status };
  }

  return { data: await response.json(), status: response.status };
}

async function getNotes() {
  return request(`${API_URL}?_limit=10`);
}

async function createNote(note) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });
}

async function deleteNote(id) {
  return request(`${API_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

function updateButtons() {
  const disabled = activeRequests > 0;
  loadButton.disabled = disabled;
  submitButton.disabled = disabled;
  notesList.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled;
  });
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = type ? `status-${type}` : "";
}

function renderNotes() {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "No notes to show. Load notes or create one to get started.";
    notesList.append(emptyItem);
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("li");
    item.className = "note";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body || "No body provided.";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => handleDelete(note.id));

    item.append(title, body, deleteButton);
    notesList.append(item);
  });
}

async function handleLoad() {
  activeRequests += 1;
  updateButtons();
  setStatus("Loading notes...", "loading");

  try {
    const { data } = await getNotes();
    if (!Array.isArray(data)) {
      throw new Error("The server returned an unexpected response.");
    }
    notes = data;
    renderNotes();
    setStatus(
      notes.length === 0
        ? "No notes were found."
        : `Loaded ${notes.length} notes from the server.`,
      "success"
    );
  } catch (error) {
    console.error("Failed to load notes:", error);
    setStatus("Could not load notes. Please try again.", "error");
  } finally {
    activeRequests -= 1;
    updateButtons();
  }
}

async function handleCreate(event) {
  event.preventDefault();
  const title = titleInput.value.trim();

  if (!title) {
    setStatus("Please enter a title.", "error");
    titleInput.focus();
    return;
  }
  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  activeRequests += 1;
  updateButtons();
  setStatus("Creating note...", "loading");

  try {
    const { data, status } = await createNote({
      title,
      body: bodyInput.value,
      userId: 1
    });
    notes = [data, ...notes];
    renderNotes();
    noteForm.reset();
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
  } catch (error) {
    console.error("Failed to create note:", error);
    setStatus("Could not create the note. Please try again.", "error");
  } finally {
    activeRequests -= 1;
    updateButtons();
  }
}

async function handleDelete(id) {
  activeRequests += 1;
  updateButtons();
  setStatus("Deleting note...", "loading");

  try {
    await deleteNote(id);
    // JSONPlaceholder confirms DELETE but does not persist it, so remove the item locally.
    notes = notes.filter((note) => note.id !== id);
    renderNotes();
    setStatus("Note deleted.", "success");
  } catch (error) {
    console.error("Failed to delete note:", error);
    setStatus("Could not delete the note. Please try again.", "error");
  } finally {
    activeRequests -= 1;
    updateButtons();
  }
}

loadButton.addEventListener("click", handleLoad);
noteForm.addEventListener("submit", handleCreate);
renderNotes();
