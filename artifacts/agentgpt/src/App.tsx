import { FormEvent, useEffect, useMemo, useState } from "react";

type Bookmark = {
  id: string;
  title: string;
  url: string;
};

const STORAGE_KEY = "favorite-bookmarks";

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function createBookmark(title: string, url: string): Bookmark {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    url: normalizeUrl(url),
  };
}

function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Bookmark[];
      if (Array.isArray(parsed)) {
        setBookmarks(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const hasBookmarks = useMemo(() => bookmarks.length > 0, [bookmarks.length]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextUrl = normalizeUrl(url);
    const nextTitle = title.trim() || nextUrl;

    if (!nextUrl) {
      setError("Please enter a URL.");
      return;
    }

    try {
      const parsed = new URL(nextUrl);
      if (!parsed.hostname) {
        throw new Error("Invalid URL");
      }
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    setBookmarks((current) => [createBookmark(nextTitle, nextUrl), ...current]);
    setTitle("");
    setUrl("");
  }

  function removeBookmark(id: string) {
    setBookmarks((current) => current.filter((bookmark) => bookmark.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-6 sm:p-10">
      <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold">Favorite Bookmarks</h1>
          <p className="mt-1 text-sm text-slate-600">
            Save quick links and open them anytime.
          </p>
        </header>

        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-12">
          <label className="sm:col-span-4">
            <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Docs"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="sm:col-span-6">
            <span className="mb-1 block text-sm font-medium text-slate-700">URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              required
            />
          </label>

          <div className="sm:col-span-2 self-end">
            <button
              type="submit"
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Save
            </button>
          </div>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 space-y-2">
          {hasBookmarks ? (
            bookmarks.map((bookmark) => (
              <article
                key={bookmark.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
              >
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0"
                >
                  <p className="truncate font-medium">{bookmark.title}</p>
                  <p className="truncate text-sm text-slate-600">{bookmark.url}</p>
                </a>

                <button
                  type="button"
                  onClick={() => removeBookmark(bookmark.id)}
                  className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  Remove
                </button>
              </article>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 px-3 py-8 text-center text-slate-500">
              No bookmarks yet. Add your first one above.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
