# QuickNotes

QuickNotes is a browser-based notes client and a backend system design for a service intended to scale to one million registered users. The client demonstrates GET, POST, and DELETE requests against JSONPlaceholder; the design documents describe a production API and architecture.

## Run the API client

Serve this folder with any static HTTP server, then open the local address in a browser. For example, if Python is installed:

```sh
python -m http.server 8000
```

Open <http://localhost:8000>. Select **Load notes** to retrieve ten sample posts, or submit the form to try creating a note. JSONPlaceholder is a practice API: created posts are not persisted, and DELETE only returns a simulated success response. The client adds/removes notes locally for the current page view.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- A small API client needs explicit loading, success, empty, and error states to make asynchronous work understandable.
- Text should be rendered as text rather than HTML so user-provided note content cannot become executable markup.
- Database constraints and indexes should reflect ownership rules and the queries the service actually needs.
- Scaling to a million users requires explicit assumptions about traffic, storage, failure domains, and consistency trade-offs.
