const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const DATA_FILE = path.join(__dirname, "data.json");
const PORT = Number(process.env.PORT) || 3000;

function readEvents() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeEvents(events) {
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(events, null, 2)}\n`);
}

function withAvailability(event) {
  return { ...event, available_slots: event.capacity - event.registered };
}

function isValidEvent(event) {
  return (
    event !== null &&
    typeof event === "object" &&
    !Array.isArray(event) &&
    typeof event.event_name === "string" &&
    event.event_name.trim().length > 0 &&
    typeof event.date === "string" &&
    event.date.trim().length > 0 &&
    typeof event.venue === "string" &&
    event.venue.trim().length > 0 &&
    Number.isInteger(event.capacity) &&
    event.capacity >= 0 &&
    Number.isInteger(event.registered) &&
    event.registered >= 0
  );
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/events", (request, response) => {
  response.json(readEvents().map(withAvailability));
});

app.get("/api/events/:id", (request, response) => {
  const event = readEvents().find((item) => item.id === Number(request.params.id));
  if (!event) {
    return response.status(404).json({ error: "Event not found" });
  }
  return response.json(withAvailability(event));
});

app.post("/api/events", (request, response) => {
  const event = request.body;
  if (!isValidEvent(event)) {
    return response.status(400).json({
      error: "Event must include event_name, date, venue, and non-negative integer capacity and registered values",
    });
  }
  if (event.registered > event.capacity) {
    return response.status(400).json({ error: "Registered participants cannot exceed capacity" });
  }

  const events = readEvents();
  const createdEvent = {
    id: events.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
    event_name: event.event_name.trim(),
    date: event.date.trim(),
    venue: event.venue.trim(),
    capacity: event.capacity,
    registered: event.registered,
  };
  events.push(createdEvent);
  writeEvents(events);
  return response.status(201).json(withAvailability(createdEvent));
});

app.delete("/api/events/:id", (request, response) => {
  const events = readEvents();
  const eventIndex = events.findIndex((item) => item.id === Number(request.params.id));
  if (eventIndex === -1) {
    return response.status(404).json({ error: "Event not found" });
  }
  if (events[eventIndex].registered > 0) {
    return response.status(400).json({ error: "Cannot delete an event with registered participants" });
  }

  const [deletedEvent] = events.splice(eventIndex, 1);
  writeEvents(events);
  return response.json({ message: "Event deleted", event: withAvailability(deletedEvent) });
});

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return response.status(400).json({ error: "Request body must be valid JSON" });
  }
  if (error.type === "entity.too.large") {
    return response.status(413).json({ error: "Request body is too large" });
  }
  return next(error);
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Event Management API listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, withAvailability };
