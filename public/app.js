const eventsList = document.querySelector("#events-list");
const statusMessage = document.querySelector("#status-message");
const searchForm = document.querySelector("#search-form");
const addEventForm = document.querySelector("#add-event-form");

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "The request could not be completed.");
  }
  return body;
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function renderEvents(events, emptyMessage = "No events to display.") {
  eventsList.replaceChildren();
  if (events.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = emptyMessage;
    eventsList.append(emptyState);
    return;
  }

  for (const event of events) {
    const card = document.createElement("article");
    card.className = "event-card";

    const details = document.createElement("div");
    details.className = "event-details";

    const title = document.createElement("h3");
    title.textContent = event.event_name;

    const metadata = document.createElement("p");
    metadata.className = "event-meta";
    metadata.textContent = `ID ${event.id} · ${event.date} · ${event.venue}`;

    const capacity = document.createElement("p");
    capacity.className = "event-capacity";
    capacity.textContent = `${event.registered} registered · ${event.available_slots} available of ${event.capacity}`;

    details.append(title, metadata, capacity);
    card.append(details);

    const deleteButton = document.createElement("button");
    deleteButton.className = "button button-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${event.event_name}`);
    deleteButton.addEventListener("click", () => deleteEvent(event.id));
    card.append(deleteButton);
    eventsList.append(card);
  }
}

async function loadEvents() {
  try {
    const events = await requestJson("/api/events");
    renderEvents(events);
    setStatus(`${events.length} event${events.length === 1 ? "" : "s"} found.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function searchEventsByName(name) {
  try {
    const events = await requestJson("/api/events");
    const query = name.trim().toLocaleLowerCase();
    const matches = events.filter((event) =>
      event.event_name.toLocaleLowerCase().includes(query)
    );
    renderEvents(matches, `No events match "${name}".`);
    setStatus(`${matches.length} event${matches.length === 1 ? "" : "s"} found matching "${name}".`);
  } catch (error) {
    renderEvents([]);
    setStatus(error.message, true);
  }
}

async function deleteEvent(id) {
  try {
    const result = await requestJson(`/api/events/${id}`, { method: "DELETE" });
    setStatus(result.message);
    await loadEvents();
  } catch (error) {
    setStatus(error.message, true);
  }
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = new FormData(searchForm).get("name");
  await searchEventsByName(name);
});

document.querySelector("#show-all-button").addEventListener("click", loadEvents);
document.querySelector("#refresh-button").addEventListener("click", loadEvents);

addEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(addEventForm);
  const eventData = {
    event_name: formData.get("event_name").trim(),
    date: formData.get("date"),
    venue: formData.get("venue").trim(),
    capacity: Number(formData.get("capacity")),
    registered: Number(formData.get("registered")),
  };

  try {
    const created = await requestJson("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
    addEventForm.reset();
    addEventForm.elements.registered.value = "0";
    setStatus(`Added “${created.event_name}” as event ${created.id}.`);
    await loadEvents();
  } catch (error) {
    setStatus(error.message, true);
  }
});

loadEvents();
