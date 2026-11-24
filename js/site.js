/* ==========================================================
   site.js — reads the JSON files in /data and builds the page
   ==========================================================
   Content is never written as HTML, only as text, so anything
   typed into the CMS is safe to publish.
   ========================================================== */

import { initScene } from './scene.js';

const $  = s => document.querySelector(s);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
};
const setText = (sel, value) => {
  const n = $(sel);
  if (n && value !== undefined && value !== null) n.textContent = value;
};

/* images may be written as "/images/x.jpg" by the CMS; project sites
   are served from a subfolder, so keep every path relative */
const asset = p => {
  if (!p) return 'images/people/placeholder.svg';
  if (/^https?:\/\//i.test(p)) return p;
  return String(p).replace(/^\/+/, '');
};
/* only ever follow links we recognise */
const safeUrl = u => {
  const s = String(u || '').trim();
  return /^(https?:\/\/|mailto:)/i.test(s) ? s : '';
};

async function load(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(path + ' -> ' + r.status);
  return r.json();
}

/* ---------------- sections ---------------- */

function renderShell(c) {
  const s = c.site || {};
  if (s.pageTitle) document.title = s.pageTitle;
  setText('#brandText', s.brand);
  setText('#navResearch', s.navResearch);
  setText('#navPeople', s.navPeople);
  setText('#navPublications', s.navPublications);
  setText('#navContact', s.navContact);

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
    box.appendChild(el('span', 'idx', st.label || ''));
    box.appendChild(el('h2', null, st.heading || ''));
    box.appendChild(el('p', null, st.text || ''));
    if (st.markers) box.appendChild(el('span', 'tag', st.markers));
    host.appendChild(box);
  });
}

function renderResearch(r) {
  if (!r) return;
  setText('#resLabel', r.label);
  setText('#resHeading', r.heading);
  setText('#resIntro', r.intro);
  const host = $('#axes');
  if (!host) return;
  host.textContent = '';
  (r.axes || []).forEach(a => {
    const card = el('div', 'axis reveal');
    const dot = el('div', 'dot');
    const named = ['violet', 'amber', 'teal', 'rose'].includes(a.colour) ? a.colour : 'violet';
    dot.style.background = 'var(--' + named + ')';
    card.appendChild(dot);
    card.appendChild(el('h4', null, a.title || ''));
    card.appendChild(el('p', null, a.text || ''));
    host.appendChild(card);
  });
}

function renderMethods(m) {
  if (!m) return;
  setText('#metLabel', m.label);
  setText('#metHeading', m.heading);
  setText('#metIntro', m.intro);
  const host = $('#methodList');
  if (!host) return;
  host.textContent = '';
  (m.items || []).forEach(i => {
    const li = el('li');
    li.appendChild(el('b', null, i.name || ''));
    li.appendChild(el('span', null, i.note || ''));
    host.appendChild(li);
  });
}

function renderQuote(q) {
  if (!q) return;
  setText('#quoteText', q.text);
  setText('#quoteCite', q.attribution);
  if (!q.text) { const s = $('#quoteSection'); if (s) s.style.display = 'none'; }
}

function renderPeople(section, people) {
  if (section) {
    setText('#peopleLabel', section.label);
    setText('#peopleHeading', section.heading);
    setText('#peopleIntro', section.intro);
  }
  const host = $('#peopleHost');
  if (!host) return;
  host.textContent = '';
  const list = (people || []).filter(p => p && p.name);
  if (!list.length) { host.appendChild(el('p', 'intro', 'No entries yet.')); return; }

  /* keep the order given in content.json, then anything unlisted */
  const order = (section && section.groupOrder) || [];
  const seen = new Set();
  const groups = [];
  order.forEach(g => { if (list.some(p => p.group === g)) { groups.push(g); seen.add(g); } });
  list.forEach(p => {
    const g = p.group || 'Group members';
    if (!seen.has(g)) { groups.push(g); seen.add(g); }
  });

  groups.forEach(g => {
    const members = list.filter(p => (p.group || 'Group members') === g);
    if (!members.length) return;
    const wrapper = el('div', 'peopleGroup reveal');
    wrapper.appendChild(el('h4', null, g));
    const cards = el('div', 'cards');
    members.forEach(p => {
      /* a group of one (typically the PI) gets a wider card */
      const card = el('article', 'person' + (members.length === 1 ? ' lead' : ''));
      const shot = el('div', 'shot');
      const img = el('img');
      img.src = asset(p.photo);
      img.alt = p.name;
      img.loading = 'lazy';
      img.addEventListener('error', () => { img.src = 'images/people/placeholder.svg'; });
      shot.appendChild(img);
      card.appendChild(shot);
      card.appendChild(el('h5', null, p.name));
      if (p.role) card.appendChild(el('p', 'role', p.role));
      if (p.bio)  card.appendChild(el('p', 'bio', p.bio));

      const meta = el('div', 'meta');
      const mail = safeUrl(p.email ? ('mailto:' + p.email) : '');
      if (mail) {
        const a = el('a', null, p.email);
        a.href = mail; meta.appendChild(a);
      }
      const link = safeUrl(p.link);
      if (link) {
        const a = el('a', null, p.linkLabel || 'Profile');
        a.href = link; a.target = '_blank'; a.rel = 'noopener';
        meta.appendChild(a);
      }
      if (meta.children.length) card.appendChild(meta);
      cards.appendChild(card);
    });
    wrapper.appendChild(cards);
    host.appendChild(wrapper);
  });
}

function renderPublications(section, pubs) {
  if (section) {
    setText('#pubLabel', section.label);
    setText('#pubHeading', section.heading);
    setText('#pubIntro', section.intro);
    const btn = $('#pubFullList');
    const url = safeUrl(section.fullListUrl);
    if (btn) {
      if (url && section.fullListLabel) {
        btn.href = url; btn.textContent = section.fullListLabel;
        btn.target = '_blank'; btn.rel = 'noopener';
      } else btn.remove();
    }
  }
  const host = $('#pubList');
  if (!host) return;
  host.textContent = '';
  const list = (pubs || []).filter(p => p && p.title);
  if (!list.length) { host.appendChild(el('li', null, 'No entries yet.')); return; }

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
    if (p.authors) body.appendChild(el('p', 'who', p.authors));
    const src = [p.journal, p.detail].filter(Boolean).join(' · ');
    if (src) body.appendChild(el('p', 'src', src));
    li.appendChild(body);
    host.appendChild(li);
  });
}

function renderContact(c) {
  if (!c) return;
  const host = $('#footerCols');
  if (!host) return;
  host.textContent = '';
  (c.columns || []).forEach(col => {
    const d = el('div');
    d.appendChild(el('b', null, col.title || ''));
    d.appendChild(el('div', 'txt', col.text || ''));
    host.appendChild(d);
  });
}

/* ---------------- reveal on scroll ---------------- */
function watchReveals() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('shown');
      io.unobserve(e.target);
    });
  }, { threshold: .15 });
  document.querySelectorAll('.reveal:not(.shown)').forEach(n => io.observe(n));
}

/* ---------------- boot ---------------- */
(async function boot() {
  try {
    const [content, people, pubs] = await Promise.all([
      load('data/content.json'),
      load('data/people.json').catch(() => ({ people: [] })),
      load('data/publications.json').catch(() => ({ publications: [] }))
    ]);

    renderShell(content);
    renderStages(content.stages);
    renderResearch(content.research);
    renderMethods(content.methods);
    renderQuote(content.quote);
    renderPeople(content.peopleSection, people.people);
    renderPublications(content.publicationsSection, pubs.publications);
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
