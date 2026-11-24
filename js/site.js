/* ==========================================================
   site.js — reads /data and builds the page
   ==========================================================
   The page has no fixed sections. data/content.json holds a
   "sections" list; each entry decides its own anchor, menu
   label, order, visibility and type. Adding or removing a
   section therefore needs no change to this file.

   Content is inserted as text, never as HTML, so nothing
   typed into the CMS can alter the page structure.
   ========================================================== */

import { initScene } from './scene.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
};
const setText = (sel, v) => { const n = $(sel); if (n && v != null) n.textContent = v; };
const has = v => typeof v === 'string' && v.trim() !== '';

/* images may be saved as "/images/x.jpg"; project sites live in a
   subfolder, so every path is kept relative */
const asset = p => {
  if (!has(p)) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return String(p).replace(/^\/+/, '');
};
const safeUrl = u => {
  const s = String(u || '').trim();
  return /^(https?:\/\/|mailto:)/i.test(s) ? s : '';
};
/* anchors must be usable in a URL */
const safeId = (v, fallback) => {
  const s = String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return s || fallback;
};

async function load(path, fallback) {
  try {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) throw new Error(path + ' -> ' + r.status);
    return await r.json();
  } catch (e) {
    if (fallback !== undefined) return fallback;
    throw e;
  }
}

/* ---------------- header, hero, captions ---------------- */

function renderShell(c) {
  const s = c.site || {};
  if (has(s.pageTitle)) document.title = s.pageTitle;
  setText('#brandText', s.brand);

  const logo = $('#brandLogo');
  if (logo) {
    const src = asset(s.logo);
    if (src) {
      logo.src = src;
      logo.alt = s.brand || '';
      logo.hidden = false;
      logo.addEventListener('error', () => { logo.hidden = true; }, { once: true });
    } else logo.hidden = true;
  }
  const fav = $('#favicon');
  if (fav && has(s.favicon)) fav.href = asset(s.favicon);

  const h = c.hero || {};
  setText('#heroKicker', h.kicker);
  setText('#heroTitleStart', h.titleStart);
  setText('#heroTitleEm', h.titleEmphasis);
  setText('#heroTitleEnd', h.titleEnd);
  setText('#heroLede', h.lede);
}

function renderStages(list) {
  const host = $('#captions');
  if (!host) return;
  host.textContent = '';
  (list || []).forEach(st => {
    const box = el('div', 'caption');
    if (has(st.label)) box.appendChild(el('span', 'idx', st.label));
    if (has(st.heading)) box.appendChild(el('h2', null, st.heading));
    if (has(st.text)) box.appendChild(el('p', null, st.text));
    if (has(st.markers)) box.appendChild(el('span', 'tag', st.markers));
    host.appendChild(box);
  });
}

function renderMenu(sections, site) {
  const host = $('#navLinks');
  if (!host) return;
  host.textContent = '';
  sections.forEach(sec => {
    if (!has(sec.menuLabel)) return;
    const a = el('a', null, sec.menuLabel);
    a.href = '#' + sec.id;
    host.appendChild(a);
  });
  const contactLabel = (site && site.contactMenuLabel) || '';
  if (has(contactLabel)) {
    const a = el('a', null, contactLabel);
    a.href = '#contact';
    host.appendChild(a);
  }
}

/* ---------------- section body renderers ----------------
   Each receives (section, data) and returns a node or null.
   -------------------------------------------------------- */

const colourOf = c => (['violet', 'amber', 'teal', 'rose'].includes(c) ? c : 'violet');

const renderers = {

  /* free text: each item becomes an optional subheading plus a paragraph */
  text(sec) {
    const items = (sec.items || []).filter(i => has(i.title) || has(i.text));
    if (!items.length) return null;
    const box = el('div', 'prose reveal');
    items.forEach(i => {
      if (has(i.title)) box.appendChild(el('h4', null, i.title));
      if (has(i.text)) box.appendChild(el('p', null, i.text));
    });
    return box;
  },

  /* grid of cards with a coloured dot */
  cards(sec) {
    const items = (sec.items || []).filter(i => has(i.title) || has(i.text));
    if (!items.length) return null;
    const grid = el('div', 'axes');
    items.forEach(i => {
      const card = el('div', 'axis reveal');
      const dot = el('div', 'dot');
      dot.style.background = 'var(--' + colourOf(i.colour) + ')';
      card.appendChild(dot);
      if (has(i.title)) card.appendChild(el('h4', null, i.title));
      if (has(i.text)) card.appendChild(el('p', null, i.text));
      grid.appendChild(card);
    });
    return grid;
  },

  /* two-column list: name on the left, note on the right */
  list(sec) {
    const items = (sec.items || []).filter(i => has(i.title));
    if (!items.length) return null;
    const ul = el('ul', 'methods reveal');
    items.forEach(i => {
      const li = el('li');
      li.appendChild(el('b', null, i.title));
      li.appendChild(el('span', null, i.note || ''));
      ul.appendChild(li);
    });
    return ul;
  },

  quote(sec) {
    if (!has(sec.quote)) return null;
    const bq = el('blockquote', 'reveal');
    bq.appendChild(el('span', null, sec.quote));
    if (has(sec.attribution)) bq.appendChild(el('cite', null, sec.attribution));
    return bq;
  },

  people(sec, data) {
    const list = (data.people || []).filter(p => p && has(p.name));
    if (!list.length) return null;
    const host = el('div');

    const order = data.peopleGroupOrder || [];
    const seen = new Set(), groups = [];
    order.forEach(g => { if (list.some(p => p.group === g)) { groups.push(g); seen.add(g); } });
    list.forEach(p => {
      const g = has(p.group) ? p.group : 'Group members';
      if (!seen.has(g)) { groups.push(g); seen.add(g); }
    });

    groups.forEach(g => {
      const members = list.filter(p => (has(p.group) ? p.group : 'Group members') === g);
      if (!members.length) return;
      const wrap = el('div', 'peopleGroup reveal');
      wrap.appendChild(el('h4', null, g));
      const cards = el('div', 'cards');
      members.forEach(p => {
        const card = el('article', 'person' + (members.length === 1 ? ' lead' : ''));
        const shot = el('div', 'shot');
        const img = el('img');
        img.src = asset(p.photo) || 'images/people/placeholder.svg';
        img.alt = p.name;
        img.loading = 'lazy';
        img.addEventListener('error', () => { img.src = 'images/people/placeholder.svg'; }, { once: true });
        shot.appendChild(img);
        card.appendChild(shot);
        card.appendChild(el('h5', null, p.name));
        if (has(p.role)) card.appendChild(el('p', 'role', p.role));
        if (has(p.bio)) card.appendChild(el('p', 'bio', p.bio));

        const meta = el('div', 'meta');
        const mail = safeUrl(has(p.email) ? 'mailto:' + p.email : '');
        if (mail) { const a = el('a', null, p.email); a.href = mail; meta.appendChild(a); }
        const link = safeUrl(p.link);
        if (link) {
          const a = el('a', null, has(p.linkLabel) ? p.linkLabel : 'Profile');
          a.href = link; a.target = '_blank'; a.rel = 'noopener';
          meta.appendChild(a);
        }
        if (meta.children.length) card.appendChild(meta);
        cards.appendChild(card);
      });
      wrap.appendChild(cards);
      host.appendChild(wrap);
    });
    return host;
  },

  publications(sec, data) {
    const list = (data.publications || []).filter(p => p && has(p.title));
    if (!list.length) return null;
    const host = el('div');
    const ul = el('ul', 'pubs reveal');
    list.forEach(p => {
      const li = el('li', p.highlight ? 'hl' : null);
      li.appendChild(el('div', 'yr', p.year || ''));
      const body = el('div');
      const ttl = el('p', 'ttl');
      const doi = safeUrl(p.doi);
      if (doi) {
        const a = el('a', null, p.title);
        a.href = doi; a.target = '_blank'; a.rel = 'noopener';
        ttl.appendChild(a);
      } else ttl.textContent = p.title;
      body.appendChild(ttl);
      if (has(p.authors)) body.appendChild(el('p', 'who', p.authors));
      const src = [p.journal, p.detail].filter(has).join(' · ');
      if (src) body.appendChild(el('p', 'src', src));
      li.appendChild(body);
      ul.appendChild(li);
    });
    host.appendChild(ul);

    const btn = data.publicationsButton || {};
    const url = safeUrl(btn.url);
    if (url && has(btn.label)) {
      const a = el('a', 'fullList reveal', btn.label);
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      host.appendChild(a);
    }
    return host;
  },

  news(sec, data) {
    const list = (data.news || []).filter(n => n && has(n.title));
    if (!list.length) return null;
    /* newest first when dates are written as YYYY-MM-DD */
    list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const host = el('div', 'newsList');
    list.forEach(n => {
      const item = el('article', 'newsItem reveal');
      item.appendChild(el('div', 'date', formatDate(n.date)));
      const body = el('div');
      const img = asset(n.image);
      if (img) {
        const fig = el('div', 'newsShot');
        const im = el('img');
        im.src = img; im.alt = ''; im.loading = 'lazy';
        im.addEventListener('error', () => { fig.remove(); }, { once: true });
        fig.appendChild(im);
        body.appendChild(fig);
      }
      body.appendChild(el('h4', null, n.title));
      if (has(n.text)) body.appendChild(el('p', null, n.text));
      const link = safeUrl(n.link);
      if (link) {
        const a = el('a', 'more', has(n.linkLabel) ? n.linkLabel : 'Read more');
        a.href = link; a.target = '_blank'; a.rel = 'noopener';
        body.appendChild(a);
      }
      item.appendChild(body);
      host.appendChild(item);
    });
    return host;
  },

  logos(sec, data) {
    const list = (data.collaborations || []).filter(c => c && has(c.name));
    if (!list.length) return null;
    const grid = el('div', 'logoGrid reveal');
    list.forEach(c => {
      const tile = el('div', 'logoTile');
      const src = asset(c.logo);
      if (src) {
        const im = el('img');
        im.src = src; im.alt = c.name; im.loading = 'lazy';
        im.addEventListener('error', () => {
          im.replaceWith(el('span', 'logoName', c.name));
        }, { once: true });
        tile.appendChild(im);
      } else tile.appendChild(el('span', 'logoName', c.name));

      if (has(c.note)) tile.appendChild(el('span', 'logoNote', c.note));

      const link = safeUrl(c.link);
      if (link) {
        const a = el('a', 'logoLink');
        a.href = link; a.target = '_blank'; a.rel = 'noopener';
        a.setAttribute('aria-label', c.name);
        tile.appendChild(a);
      }
      grid.appendChild(tile);
    });
    return grid;
  }
};

function formatDate(v) {
  const s = String(v || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mi = parseInt(m[2], 10) - 1;
  return (months[mi] || m[2]) + ' ' + parseInt(m[3], 10) + ', ' + m[1];
}

/* ---------------- sections ---------------- */

function renderSections(sections, data) {
  const host = $('#main');
  if (!host) return [];
  const notice = $('#notice');
  host.textContent = '';
  if (notice) host.appendChild(notice);

  const used = new Set();
  const placed = [];

  sections.forEach((sec, idx) => {
    if (sec.enabled === false) return;
    const build = renderers[sec.type];
    if (!build) return;                       // unknown type: skipped silently

    let id = safeId(sec.id, 'section-' + (idx + 1));
    while (used.has(id)) id += '-2';          // ids must stay unique
    used.add(id);

    const body = build(sec, data);
    const hasHeader = has(sec.label) || has(sec.heading) || has(sec.intro);
    if (!body && !hasHeader) return;          // nothing to show: no empty block

    const node = el('section', placed.length === 0 ? 'wrap' : 'wrap tight');
    node.id = id;
    if (has(sec.label))   node.appendChild(el('p', 'sect-label reveal', sec.label));
    if (has(sec.heading)) node.appendChild(el('h3', 'big reveal', sec.heading));
    if (has(sec.intro))   node.appendChild(el('p', 'intro reveal', sec.intro));
    if (body) node.appendChild(body);
    host.appendChild(node);

    placed.push({ id, menuLabel: sec.menuLabel });
  });

  return placed;
}

function renderContact(c) {
  const host = $('#footerCols');
  if (!host) return;
  host.textContent = '';
  ((c && c.columns) || []).forEach(col => {
    const d = el('div');
    if (has(col.title)) d.appendChild(el('b', null, col.title));
    if (has(col.text)) d.appendChild(el('div', 'txt', col.text));
    host.appendChild(d);
  });
}

/* ---------------- reveal on scroll ---------------- */
function watchReveals() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('shown');
    io.unobserve(e.target);
  }), { threshold: .15 });
  document.querySelectorAll('.reveal:not(.shown)').forEach(n => io.observe(n));
}

/* ---------------- boot ---------------- */
(async function boot() {
  try {
    const [content, people, pubs, news, collabs] = await Promise.all([
      load('data/content.json'),
      load('data/people.json', { people: [] }),
      load('data/publications.json', { publications: [] }),
      load('data/news.json', { news: [] }),
      load('data/collaborations.json', { collaborations: [] })
    ]);

    const data = {
      people: people.people,
      publications: pubs.publications,
      news: news.news,
      collaborations: collabs.collaborations,
      peopleGroupOrder: content.peopleGroupOrder,
      publicationsButton: content.publicationsButton
    };

    renderShell(content);
    renderStages(content.stages);
    const placed = renderSections(content.sections || [], data);
    renderMenu(placed, content.site);
    renderContact(content.contact);
  } catch (err) {
    const n = $('#notice');
    if (n) {
      n.className = 'on';
      n.textContent = 'Content could not be loaded (' + err.message +
        '). When previewing on your own computer, serve the folder instead of ' +
        'opening the file directly: python3 -m http.server';
    }
  }
  watchReveals();
  initScene();
})();
