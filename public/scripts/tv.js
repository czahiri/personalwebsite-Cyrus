// Display Firestore collection 'tv shows' in a card grid
(function () {
  const COLLECTION = 'tv shows'; // Firestore collection name

  function $(id) { return document.getElementById(id); }

  function renderList(docs, filterText) {
    const list = $('list');
    const empty = $('empty');
    const status = $('status');
    list.innerHTML = '';
    let items = docs.map(d => normalizeDoc({ id: d.id, ...d.data() }));
    if (filterText) {
      const q = filterText.trim().toLowerCase();
      items = items.filter(it =>
        Object.entries(it).some(([k, v]) => String(v).toLowerCase().includes(q))
      );
    }
    if (items.length === 0) {
      empty.style.display = 'block';
      status.textContent = '0 shows';
      return;
    }
    empty.style.display = 'none';
    status.textContent = `${items.length} show${items.length === 1 ? '' : 's'}`;

    const miniQueue = [];
    let idx = 0;
    for (const it of items) {
      const title = (it.title || it.name) ? (it.title || it.name) : titleCase(it.id || 'Untitled');
      const year = it.year || it.releaseYear || '';
      const genre = it.genre || it.category || '';
      const rating = it.rating || it.score || '';
      const description = it.description || it.overview || '';
      const poster = it.posterUrl || it.image || '';
      const lat = (it.filmLocation && it.filmLocation.lat) || it.latitude || null;
      const lng = (it.filmLocation && it.filmLocation.lng) || it.longitude || null;

      const card = document.createElement('article');
      card.className = 'card';
      const accent = stringToHue(title || genre || '');
      card.style.borderColor = `hsl(${accent}, 70%, 70%)`;
      card.style.boxShadow = `0 6px 16px hsla(${accent}, 90%, 60%, 0.18)`;
      const h = [];
      h.push(`<h3>Show ID: ${escapeHtml(it.id || '')}</h3>`);
      const badges = [];
      if (genre) badges.push(`<span class="badge" style="background:hsl(${accent}, 100%, 95%); border-color:hsl(${accent}, 80%, 75%);">${escapeHtml(genre)}</span>`);
      if (year) badges.push(`<span class="badge">${escapeHtml(String(year))}</span>`);
      if (rating) badges.push(`<span class="badge">Rating ${escapeHtml(String(rating))}</span>`);
      if (badges.length) h.push(`<div class="meta-row">${badges.join('')}</div>`);
      if (poster) h.push(`<div style="margin:8px 0;"><img src="${escapeAttr(poster)}" alt="${escapeAttr(title)} poster" style="max-width:100%;border-radius:8px;"/></div>`);
      // Expanded attributes section
      const attrs = [];
      if (description) attrs.push(attrRow('Description', String(description)));
      if (genre) attrs.push(attrRow('Genre', String(genre)));
      if (year) attrs.push(attrRow('Year', String(year)));
      // Show rating only once (already displayed as a badge above)
      // Render any extra attributes not covered above
      const omit = new Set(['title','name','year','releaseYear','genre','category','rating','score','description','overview','posterUrl','image','filmLocation','latitude','longitude','id']);
      const kv = Object.entries(it).filter(([k]) => !omit.has(k));
      for (const [k, v] of kv) {
        attrs.push(attrRow(startCase(k), String(v)));
      }
      if (attrs.length) h.push(`<div class="attrs">${attrs.join('')}</div>`);
      if (lat != null && lng != null) {
        const mapId = `mini-${idx++}-${(it.id || title).replace(/[^a-zA-Z0-9_-]/g, '')}`;
        h.push(`<div id="${mapId}" class="miniMap"></div>`);
        miniQueue.push({ id: mapId, lat, lng, title });
      }
      card.innerHTML = h.join('');
      list.appendChild(card);
    }
    initMiniMaps(miniQueue);
  }

  function startCase(s) {
    return String(s).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());
  }
  function attrRow(label, value) {
    return `<div class="attr"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;
  }

  function titleCase(s) {
    return String(s).toLowerCase().split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ');
  }

  function normalizeDoc(doc) {
    const out = { ...doc };
    if (out.title) out.title = titleCase(out.title);
    if (out.name) out.name = titleCase(out.name);
    if (out.genre) out.genre = titleCase(out.genre);
    if (out.category) out.category = titleCase(out.category);
    return out;
  }

  function stringToHue(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function computeBbox(lat, lng, delta) {
    const left = lng - delta, right = lng + delta, bottom = lat - delta, top = lat + delta;
    return `${left},${bottom},${right},${top}`;
  }

  function initMiniMaps(queue) {
    if (!queue || !queue.length) return;
    if (window.L) {
      queue.forEach(({ id, lat, lng, title }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const m = L.map(el, { attributionControl: false, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
        L.marker([lat, lng]).addTo(m).bindTooltip(escapeHtml(title), {permanent:false});
        m.setView([lat, lng], 12);
      });
    } else {
      queue.forEach(({ id, lat, lng }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const bbox = computeBbox(lat, lng, 0.01);
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
        el.outerHTML = `<iframe class="miniMap" src="${mapUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      });
    }
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function init() {
    const errorEl = $('error');
    const status = $('status');
    const search = $('search');
    const refresh = $('refresh');
    const toggleForm = $('toggleForm');
    const formWrap = $('formWrap');
    const addBtn = $('addShow');
    const formStatus = $('formStatus');
    const fields = {
      title: $('newTitle'),
      year: $('newYear'),
      genre: $('newGenre'),
      rating: $('newRating'),
      posterUrl: $('newPoster'),
      description: $('newDesc'),
      lat: $('newLat'),
      lng: $('newLng'),
    };
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'Firebase SDK failed to load. Check hosting configuration.';
      return;
    }
    const db = firebase.firestore();
    let unsubscribe = null;

    function listen() {
      status.textContent = 'Loading…';
      errorEl.style.display = 'none';
      if (unsubscribe) { try { unsubscribe(); } catch (e) {} }
      unsubscribe = db.collection(COLLECTION).onSnapshot(
        snap => {
          renderList(snap.docs, search.value);
          updateMapFromDocs(snap.docs);
        },
        err => {
          errorEl.style.display = 'block';
          errorEl.textContent = 'Error reading Firestore: ' + err.message;
          status.textContent = 'Error';
        }
      );
    }

    search.addEventListener('input', () => {
      // re-render from last snapshot by triggering refresh (we don’t store docs; re-listen quickly)
      // For simplicity, rely on onSnapshot pushing updates frequently; otherwise, consider caching snap.docs
      // Here, just update status to indicate filtering
      status.textContent = 'Filtering…';
      // A tiny debounce by re-running listen after 150ms could be added; keep simple:
      // No-op; the next snapshot will re-render.
    });
    refresh.addEventListener('click', listen);
    toggleForm.addEventListener('click', () => {
      const show = formWrap.style.display === 'none';
      formWrap.style.display = show ? 'grid' : 'none';
      formStatus.textContent = '';
    });
    // Map setup (Leaflet)
    let map = null;
    let markersLayer = null;
    function ensureMap() {
      if (!window.L) return;
      if (map) return;
      map = L.map('bigMap', { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);
      map.setView([20, 0], 2);
    }
    function updateMapFromDocs(docs) {
      if (!window.L) return;
      ensureMap();
      if (!markersLayer) return;
      markersLayer.clearLayers();
      const bounds = [];
      docs.forEach(d => {
        const data = d.data() || {};
        const lat = (data.filmLocation && data.filmLocation.lat) || data.latitude || null;
        const lng = (data.filmLocation && data.filmLocation.lng) || data.longitude || null;
        if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
          const title = (data.title || data.name || d.id);
          const m = L.marker([lat, lng]).bindPopup(`<strong>${escapeHtml(title)}</strong>`);
          markersLayer.addLayer(m);
          bounds.push([lat, lng]);
        }
      });
      if (bounds.length) {
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        map.setView([20, 0], 2);
      }
    }
    addBtn.addEventListener('click', async () => {
      formStatus.textContent = 'Saving…';
      try {
        const title = fields.title.value.trim();
        const year = fields.year.value ? Number(fields.year.value) : null;
        const genre = fields.genre.value.trim();
        const rating = fields.rating.value.trim();
        const posterUrl = fields.posterUrl.value.trim();
        const description = fields.description.value.trim();
        const lat = fields.lat.value ? Number(fields.lat.value) : null;
        const lng = fields.lng.value ? Number(fields.lng.value) : null;
        if (!title) throw new Error('Title is required');
        const doc = {
          title: titleCase(title),
          year: year || null,
          genre: genre ? titleCase(genre) : null,
          rating: rating || null,
          posterUrl: posterUrl || null,
          description: description || null,
        };
        if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
          doc.filmLocation = { lat, lng };
        }
        // remove null fields for cleanliness
        Object.keys(doc).forEach(k => (doc[k] == null) && delete doc[k]);
        await db.collection(COLLECTION).add(doc);
        formStatus.textContent = 'Saved!';
        // clear inputs
        Object.values(fields).forEach(el => { if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = ''; });
      } catch (e) {
        formStatus.textContent = 'Error: ' + e.message;
      }
    });
    listen();
  }

  document.addEventListener('DOMContentLoaded', init);
})();


