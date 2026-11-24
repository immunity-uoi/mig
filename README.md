# Molecular Immunology Group — website

A static website. No build step, no server, no database. Three JSON files hold
all the content; the page reads them when it loads.

---

## Part 1 — Putting the site online (once, about 10 minutes)

**1. Create the repository**

On GitHub, click **New repository**. Give it a name - this becomes part of the
web address, so something like `immunology-group` works well. Set it to
**Public** (required for free GitHub Pages). Leave everything else as is.

**2. Upload these files**

On the new repository's page, click **uploading an existing file**, then drag in
everything from this folder. Keep the folder structure: `css/`, `js/`, `data/`
and `images/` must stay as folders. Click **Commit changes**.

**3. Switch Pages on**

Go to **Settings → Pages**. Under *Source* choose **Deploy from a branch**,
set the branch to `main` and the folder to `/ (root)`. Click **Save**.

Wait a minute, then the site is live at:

```
https://<your-github-username>.github.io/<repository-name>/
```

That address is free and permanent. A custom domain is optional and changes
nothing about how the site works.

---

## Part 2 — Letting anyone edit the content

**1. Sign in to Pages CMS**

Go to **https://app.pagescms.org** and sign in with the GitHub account that owns
the repository. Choose the repository from the list. The editing forms appear
automatically - they are described in `.pages.yml`, which is already set up.

**2. Edit**

Three sections appear in the sidebar:

| Section | What it holds |
|---|---|
| **People** | One entry per person: name, title, which heading they sit under, photo, short description, email, profile link |
| **Publications** | One entry per paper: year, authors, title, journal, volume/pages, DOI, optional highlight star |
| **Page text** | Everything else - the logo, menu labels, the opening screen, the five animation captions, research axes, methods, pull quote, footer |

Adding a person: open **People**, click the **+** on the list, fill the form,
drag a photo into the Photo field, press **Save**. The site updates within a
minute or so.

**3. Changing the logo**

Open **Page text → Site and menu**. The *Logo (top left)* field takes an image by
drag-and-drop; *Browser tab icon* sets the small icon in the browser tab.

The logo is scaled to 22 pixels tall and keeps its own proportions, so wide
institutional logos are fine. Upload it at 60 pixels tall or more so it stays
sharp on high-resolution screens. Leaving the field empty hides the logo and
keeps only the group name. If the file is ever missing, the logo is hidden
rather than shown broken.

**4. Invite colleagues**

In Pages CMS, invite people by email. They do **not** need a GitHub account.
They see only the forms - never code, JSON or git.

---

## Editing without the CMS

Everything is plain text, so the files can also be edited directly on GitHub
(click a file, then the pencil icon) or on your own computer.

- `data/content.json` — all page text
- `data/people.json` — the group members
- `data/publications.json` — the publication list
- `images/people/` — photographs

Photos: square images work best, around 600×600 pixels. Anything much larger
just makes the page slower to load. Point a person's `photo` field at the file,
for example `images/people/maria.jpg`. If a photo is missing or the path is
wrong, a neutral placeholder is shown instead of a broken image.

---

## Previewing on your own computer

Opening `index.html` by double-clicking will **not** work, because browsers
refuse to read local files from a script. Serve the folder instead:

```bash
cd path/to/this/folder
python3 -m http.server
```

Then open <http://localhost:8000>.

---

## What each file does

```
index.html              page structure (empty containers, filled at load)
css/site.css            all styling; colours and spacing live in :root at the top
js/site.js              reads /data, builds the page, never writes raw HTML
js/scene.js             the scroll-linked 3D neutrophil animation
data/content.json       page text, including which logo file to use
data/people.json        group members
data/publications.json  publication list
images/logo.svg         logo shown in the top bar (replaceable from the CMS)
images/favicon.svg      browser tab icon (replaceable from the CMS)
images/people/          photographs
.pages.yml              describes the editing forms for Pages CMS
.nojekyll               tells GitHub Pages to serve files as they are
```

### Tuning the animation

Two things are worth knowing, both one-line changes:

- **Scroll speed** — the `#zone` height in `css/site.css`. Lower value, faster
  scroll. It is currently `340vh`; below roughly `240vh` the captions go by too
  quickly to read.
- **Choreography** — the `KEYS` table near the top of `js/scene.js`. Each row is
  one keyframe between 0 and 1 of the scroll, holding rotation, tilt, cell size,
  membrane ruffling, pseudopod reach, pathogen distance, granule burst and NET
  length.

The animation library (anime.js) loads from a public CDN. If it is ever
unreachable the scene still runs - scroll position is then tracked directly.

### A note on safety

Content is inserted as text, never as HTML, and links are only followed when
they start with `https://` or `mailto:`. So nothing typed into the CMS can break
the page or inject anything into it.
