/* Som da Família — player web PWA (pt-BR) */
(() => {
  'use strict';

  const STORAGE = {
    profiles: 'sdf_profiles',
    current: 'sdf_current_profile',
    playlists: (pid) => `sdf_playlists_${pid}`,
    favorites: (pid) => `sdf_favorites_${pid}`,
  };

  const COLORS = ['#1db98c', '#7c5cff', '#ff8a5c', '#5cc8ff', '#ff5c7a', '#f0c040', '#40e0d0', '#c084fc'];

  /** Faixas livres — SoundHelix examples (demos gratuitos). Verificados HTTP 200. */
  const TRACKS = [
    { id: 'sh1', title: 'Aurora Matinal', artist: 'SoundHelix', mood: 'calmo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', color: '#1db98c', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh2', title: 'Ritmo da Cozinha', artist: 'SoundHelix', mood: 'alegre', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', color: '#7c5cff', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh3', title: 'Estrada Aberta', artist: 'SoundHelix', mood: 'viagem', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', color: '#ff8a5c', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh4', title: 'Foco Suave', artist: 'SoundHelix', mood: 'trabalho', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', color: '#5cc8ff', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh5', title: 'Festa em Casa', artist: 'SoundHelix', mood: 'festa', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', color: '#ff5c7a', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh6', title: 'Nuvem Lenta', artist: 'SoundHelix', mood: 'calmo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', color: '#40e0d0', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh7', title: 'Passos Leves', artist: 'SoundHelix', mood: 'treino', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', color: '#f0c040', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh8', title: 'Noite Estrelada', artist: 'SoundHelix', mood: 'noite', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', color: '#c084fc', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh9', title: 'Brisa do Parque', artist: 'SoundHelix', mood: 'alegre', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', color: '#1db98c', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh10', title: 'Pulse Eletrônico', artist: 'SoundHelix', mood: 'festa', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', color: '#7c5cff', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh11', title: 'Café e Código', artist: 'SoundHelix', mood: 'trabalho', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', color: '#ff8a5c', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
    { id: 'sh12', title: 'Horizonte Azul', artist: 'SoundHelix', mood: 'viagem', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', color: '#5cc8ff', license: 'Exemplo gratuito SoundHelix', source: 'https://www.soundhelix.com/examples/mp3/' },
  ];


  function sertanejoTracks() {
    const data = window.SDF_TOP50_SERTANEJO;
    return (data && data.tracks) ? data.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      mood: 'sertanejo',
      url: null,
      youtubeId: t.youtubeId,
      alternateIds: Array.isArray(t.alternateIds) ? t.alternateIds.slice() : [],
      thumbnail: t.thumbnail,
      thumbnailHigh: t.thumbnailHigh || (t.youtubeId ? ('https://i.ytimg.com/vi/' + t.youtubeId + '/maxresdefault.jpg') : t.thumbnail),
      watchUrl: t.watchUrl,
      pos: t.pos,
      color: '#1db98c',
      source: 'youtube',
    })) : [];
  }

  const trackById = Object.fromEntries(
    [...TRACKS, ...sertanejoTracks()].map((t) => [t.id, t])
  );

  // refresh catalog when ranking script loaded
  function refreshCatalog() {
    sertanejoTracks().forEach((t) => { trackById[t.id] = t; });
  }


  const state = {
    profileId: null,
    queue: [...TRACKS],
    index: -1,
    playing: false,
    openPlaylistId: null,
    seeking: false,
    engine: 'audio', // 'audio' | 'youtube'
    shuffle: false,
    repeat: 'off', // 'off' | 'all' | 'one'
  };

  let importedTracks = []; // from IndexedDB
  let offlineIds = new Set();
  let objectUrls = [];


  let ytPlayer = null;
  let ytReady = false;
  let ytPoll = null;
  let ytInitPromise = null;


  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const audio = $('#audio');
  const els = {
    viewProfiles: $('#view-profiles'),
    viewMain: $('#view-main'),
    profileGrid: $('#profile-grid'),
    btnAddProfile: $('#btn-add-profile'),
    btnSwitchProfile: $('#btn-switch-profile'),
    currentProfileName: $('#current-profile-name'),
    btnCredits: $('#btn-credits'),
    btnBackCredits: $('#btn-back-credits'),
    trackList: $('#track-list'),
    searchInput: $('#search-input'),
    searchResults: $('#search-results'),
    playlistList: $('#playlist-list'),
    playlistDetail: $('#playlist-detail'),
    playlistDetailTitle: $('#playlist-detail-title'),
    playlistTracks: $('#playlist-tracks'),
    btnNewPlaylist: $('#btn-new-playlist'),
    btnBackPlaylists: $('#btn-back-playlists'),
    btnDeletePlaylist: $('#btn-delete-playlist'),
    favoritesList: $('#favorites-list'),
    favoritesEmpty: $('#favorites-empty'),
    creditsList: $('#credits-list'),
    sertanejoList: $('#sertanejo-list'),
    sertanejoSource: $('#sertanejo-source'),

    creditsChartNote: $('#credits-chart-note'),
    ytDock: $('#yt-player-dock'),
    nowStage: $('#now-stage'),
    nowStageArt: $('#now-stage-art'),
    nowStageTitle: $('#now-stage-title'),
    nowStageArtist: $('#now-stage-artist'),
    nowTitle: $('#now-title'),
    nowArtist: $('#now-artist'),
    nowArt: $('#now-art'),
    btnPlay: $('#btn-play'),
    btnPrev: $('#btn-prev'),
    btnNext: $('#btn-next'),
    btnFavNow: $('#btn-fav-now'),
    btnShuffle: $('#btn-shuffle'),
    btnRepeat: $('#btn-repeat'),
    btnOffline: $('#btn-offline'),
    importsList: $('#imports-list'),
    importsHeading: $('#imports-heading'),
    importAudio: $('#import-audio'),
    seek: $('#seek'),
    timeCur: $('#time-cur'),
    timeDur: $('#time-dur'),
    modal: $('#modal'),
    modalForm: $('#modal-form'),
    modalTitle: $('#modal-title'),
    modalInput: $('#modal-input'),
    modalAdd: $('#modal-add'),
    addForm: $('#add-form'),
    addChoices: $('#add-playlist-choices'),
  };

  let modalMode = null; // 'profile' | 'playlist'
  let pendingAddTrackId = null;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getProfiles() {
    return loadJSON(STORAGE.profiles, []);
  }
  function saveProfiles(list) {
    saveJSON(STORAGE.profiles, list);
  }
  function getPlaylists() {
    if (!state.profileId) return [];
    return loadJSON(STORAGE.playlists(state.profileId), []);
  }
  function savePlaylists(list) {
    saveJSON(STORAGE.playlists(state.profileId), list);
  }
  function getFavorites() {
    if (!state.profileId) return [];
    return loadJSON(STORAGE.favorites(state.profileId), []);
  }
  function saveFavorites(ids) {
    saveJSON(STORAGE.favorites(state.profileId), ids);
  }

  function uid() {
    return 'p_' + Math.random().toString(36).slice(2, 10);
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function ensureDefaultProfiles() {
    let profiles = getProfiles();
    if (profiles.length === 0) {
      profiles = [
        { id: uid(), name: 'Airi', color: COLORS[0] },
        { id: uid(), name: 'Família', color: COLORS[1] },
      ];
      saveProfiles(profiles);
    }
    return profiles;
  }

  function renderProfiles() {
    const profiles = ensureDefaultProfiles();
    els.profileGrid.innerHTML = profiles
      .map(
        (p) => `
      <button type="button" class="profile-card" data-id="${p.id}">
        <div class="avatar" style="background:${p.color}">${escapeHtml(p.name).charAt(0).toUpperCase()}</div>
        <span>${escapeHtml(p.name)}</span>
      </button>`
      )
      .join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function enterProfile(id) {
    const profiles = getProfiles();
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    state.profileId = id;
    localStorage.setItem(STORAGE.current, id);
    els.currentProfileName.textContent = p.name;
    els.btnSwitchProfile.textContent = p.name.charAt(0).toUpperCase();
    els.btnSwitchProfile.style.background = p.color;
    els.viewProfiles.hidden = true;
    els.viewProfiles.classList.remove('active');
    els.viewMain.hidden = false;
    renderAllLists();
    updateFavButton();
  }

  function showProfiles() {
    pause();
    state.profileId = null;
    localStorage.removeItem(STORAGE.current);
    els.viewMain.hidden = true;
    els.viewProfiles.hidden = false;
    els.viewProfiles.classList.add('active');
    renderProfiles();
  }

  function trackRow(track, opts = {}) {
    const fav = getFavorites().includes(track.id);
    const playing = state.index >= 0 && state.queue[state.index]?.id === track.id;
    return `
      <li class="track${playing ? ' playing' : ''}" data-id="${track.id}">
        <button type="button" class="track-art" style="background:${track.color}" data-action="play" aria-label="Tocar ${escapeHtml(track.title)}">♪</button>
        <button type="button" class="track-meta" data-action="play">
          <strong>${escapeHtml(track.title)}${offlineIds.has(track.id) || track.source === 'import' ? ' <span class="offline-badge">offline</span>' : ''}</strong>
          <span>${escapeHtml(track.artist)} · ${escapeHtml(track.mood)}</span>
        </button>
        <div class="track-actions">
          <button type="button" data-action="add" title="Adicionar à playlist" aria-label="Adicionar à playlist">＋</button>
          <button type="button" data-action="fav" class="${fav ? 'on' : ''}" title="Favoritar" aria-label="Favoritar">${fav ? '♥' : '♡'}</button>
        </div>
      </li>`;
  }

  function bindTrackList(ul, tracks) {
    ul.innerHTML = tracks.map((t) => trackRow(t)).join('') || '<li class="muted empty-hint">Nenhuma música encontrada.</li>';
  }

  function renderHome() {
    bindTrackList(els.trackList, TRACKS);
  }

  function renderSearch(q) {
    const query = (q || '').trim().toLowerCase();
    const list = !query
      ? TRACKS
      : TRACKS.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.artist.toLowerCase().includes(query) ||
            t.mood.toLowerCase().includes(query)
        );
    bindTrackList(els.searchResults, list);
  }

  function renderPlaylists() {
    const list = getPlaylists();
    if (state.openPlaylistId) {
      const pl = list.find((p) => p.id === state.openPlaylistId);
      if (!pl) {
        state.openPlaylistId = null;
      } else {
        els.playlistList.hidden = true;
        els.btnNewPlaylist.hidden = true;
        els.playlistDetail.hidden = false;
        els.playlistDetailTitle.textContent = pl.name;
        const tracks = pl.trackIds.map((id) => trackById[id]).filter(Boolean);
        bindTrackList(els.playlistTracks, tracks);
        state.queue = tracks.length ? tracks : TRACKS;
        return;
      }
    }
    els.playlistDetail.hidden = true;
    els.playlistList.hidden = false;
    els.btnNewPlaylist.hidden = false;
    els.playlistList.innerHTML =
      list
        .map(
          (p) => `
      <li>
        <button type="button" class="playlist-item" data-pl="${p.id}">
          <div class="pl-art">♫</div>
          <div class="pl-meta">
            <strong>${escapeHtml(p.name)}</strong>
            <span>${p.trackIds.length} música${p.trackIds.length === 1 ? '' : 's'}</span>
          </div>
        </button>
      </li>`
        )
        .join('') || '<li class="muted empty-hint">Crie sua primeira playlist.</li>';
  }

  function renderFavorites() {
    const ids = getFavorites();
    const tracks = ids.map((id) => trackById[id]).filter(Boolean);
    bindTrackList(els.favoritesList, tracks);
    els.favoritesEmpty.hidden = tracks.length > 0;
  }



  function renderSertanejo() {
    refreshCatalog();
    const data = window.SDF_TOP50_SERTANEJO;
    if (!data || !els.sertanejoList) return;
    els.sertanejoSource.innerHTML =
      'Fonte: <a href="' + escapeHtml(data.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(data.sourceName) + '</a> — ' + escapeHtml(data.sourceDateLabel) +
      '. ' + (data.verifiedCount || data.tracks.length) + ' vídeos oficiais verificados.';
    if (els.creditsChartNote) {
      els.creditsChartNote.innerHTML =
        'Top 50 Sertanejo: ' + escapeHtml(data.sourceName) + ' (' + escapeHtml(data.sourceDateLabel) + '). ' +
        escapeHtml(data.disclaimer);
    }
    const cur = currentTrack();
    els.sertanejoList.innerHTML = data.tracks.map((t) => {
      const fav = getFavorites().includes(t.id);
      const playing = cur && cur.id === t.id;
      return `
      <li class="chart-row${playing ? ' playing' : ''}" data-id="${t.id}">
        <span class="chart-pos">${t.pos}</span>
        <button type="button" class="chart-meta" data-action="play">
          <strong>${escapeHtml(t.title)}</strong>
          <span>${escapeHtml(t.artist)}</span>
        </button>
        <div class="track-actions">
          <button type="button" data-action="add" title="Adicionar à playlist" aria-label="Adicionar">＋</button>
          <button type="button" data-action="fav" class="${fav ? 'on' : ''}" title="Favoritar" aria-label="Favoritar">${fav ? '♥' : '♡'}</button>
        </div>
      </li>`;
    }).join('');
  }

  function ensureYtApi() {
    if (ytReady && window.YT && window.YT.Player) return Promise.resolve();
    if (ytInitPromise) return ytInitPromise;
    ytInitPromise = new Promise((resolve) => {
      const done = () => { ytReady = true; resolve(); };
      if (window.YT && window.YT.Player) { done(); return; }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') prev();
        done();
      };
      // API script may already be loading; if somehow missing, inject
      if (!document.querySelector('script[src*="iframe_api"]')) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
      // fallback poll
      let n = 0;
      const iv = setInterval(() => {
        if (window.YT && window.YT.Player) { clearInterval(iv); done(); }
        if (++n > 100) { clearInterval(iv); resolve(); }
      }, 100);
    });
    return ytInitPromise;
  }

  function stopYtPoll() {
    if (ytPoll) { clearInterval(ytPoll); ytPoll = null; }
  }

  function startYtPoll() {
    stopYtPoll();
    ytPoll = setInterval(() => {
      if (state.seeking || !ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
      try {
        const cur = ytPlayer.getCurrentTime() || 0;
        const dur = ytPlayer.getDuration() || 0;
        els.timeCur.textContent = formatTime(cur);
        els.timeDur.textContent = formatTime(dur);
        if (dur > 0) els.seek.value = Math.round((cur / dur) * 1000);
      } catch (e) {}
    }, 400);
  }

  function destroyYtPlayer() {
    stopYtPoll();
    try { if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy(); } catch (e) {}
    ytPlayer = null;
    document.body.classList.remove('yt-playing');
    if (els.nowStage) els.nowStage.hidden = true;
    const wrap = document.querySelector('.now-stage-art-wrap');
    if (wrap) {
      let dock = document.getElementById('yt-player-dock');
      if (!dock) {
        dock = document.createElement('div');
        dock.id = 'yt-player-dock';
        dock.className = 'yt-dock-mini';
        dock.setAttribute('aria-hidden', 'true');
        wrap.appendChild(dock);
      }
      dock.innerHTML = '<div id="yt-player-host"></div>';
    }
  }

  function showNowStage(track) {
    if (!els.nowStage) return;
    els.nowStage.hidden = false;
    document.body.classList.add('yt-playing');
    if (els.nowStageArt) {
      els.nowStageArt.src = track.thumbnailHigh || track.thumbnail || ('https://i.ytimg.com/vi/' + track.youtubeId + '/hqdefault.jpg');
      els.nowStageArt.onerror = function () { this.onerror = null; this.src = 'https://i.ytimg.com/vi/' + track.youtubeId + '/hqdefault.jpg'; };
      els.nowStageArt.alt = track.title || '';
    }
    if (els.nowStageTitle) els.nowStageTitle.textContent = track.title || '—';
    if (els.nowStageArtist) els.nowStageArtist.textContent = track.artist || '—';
    const ext = document.getElementById('yt-open-external');
    if (ext) ext.href = track.watchUrl || ('https://www.youtube.com/watch?v=' + track.youtubeId);
  }


  function createYtPlayer(videoId) {
    return ensureYtApi().then(() => new Promise((resolve, reject) => {
      destroyYtPlayer();
      if (!window.YT || !window.YT.Player) {
        reject(new Error('YT API unavailable'));
        return;
      }
      const track = currentTrack() || { youtubeId: videoId, title: '', artist: '', thumbnail: '' };
      showNowStage(Object.assign({}, track, { youtubeId: videoId }));
      // host precisa existir DEPOIS do destroy (que recria o div)
      if (!document.getElementById('yt-player-host')) {
        const wrap = document.querySelector('.now-stage-art-wrap');
        if (!wrap) { reject(new Error('now-stage missing')); return; }
        let dock = document.getElementById('yt-player-dock');
        if (!dock) {
          dock = document.createElement('div');
          dock.id = 'yt-player-dock';
          dock.className = 'yt-dock-mini';
          dock.setAttribute('aria-hidden', 'true');
          wrap.appendChild(dock);
        }
        dock.innerHTML = '<div id="yt-player-host"></div>';
      }
      const origin = location.origin;
      ytPlayer = new YT.Player('yt-player-host', {
        width: 48,
        height: 48,
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: origin,
          widget_referrer: origin,
          fs: 0,
        },
        events: {
          onReady: (ev) => {
            try { ev.target.playVideo(); } catch (e) {}
            try { ev.target.mute && ev.target.unMute(); } catch (e) {}
            startYtPoll();
            resolve(ev.target);
            window.__SDF_YT_LAST__ = { ready: true, videoId, error: null, state: ev.target.getPlayerState && ev.target.getPlayerState() };
          },
          onStateChange: (ev) => {
            const st = ev.data;
            window.__SDF_YT_LAST__ = Object.assign({}, window.__SDF_YT_LAST__ || {}, { state: st, videoId });
            if (st === YT.PlayerState.PLAYING) {
              state.playing = true;
              state.engine = 'youtube';
              els.btnPlay.textContent = '⏸';
              els.btnPlay.setAttribute('aria-label', 'Pausar');
            } else if (st === YT.PlayerState.PAUSED) {
              state.playing = false;
              els.btnPlay.textContent = '▶';
              els.btnPlay.setAttribute('aria-label', 'Play');
            } else if (st === YT.PlayerState.ENDED) {
              onTrackEnded();
            }
          },
          onError: (ev) => {
            const code = ev.data;
            console.warn('YT error', code);
            window.__SDF_YT_LAST__ = Object.assign({}, window.__SDF_YT_LAST__ || {}, { error: code, videoId });
            const t = currentTrack();
            if ((code === 101 || code === 150) && t && Array.isArray(t.alternateIds) && t.alternateIds.length) {
              const nextId = t.alternateIds.shift();
              t.youtubeId = nextId;
              setTimeout(() => playYoutubeTrack(t), 200);
              return;
            }
            setTimeout(() => next(), 700);
          },
        },
      });
    }));
  }

  function playYoutubeTrack(track) {
    state.engine = 'youtube';
    try { audio.pause(); } catch (e) {}
    setNowPlaying(track);
    highlightPlaying();
    showNowStage(track);
    return createYtPlayer(track.youtubeId).catch((err) => {
      console.warn(err);
      if (track.watchUrl) window.open(track.watchUrl, '_blank', 'noopener');
    });
  }

  function renderCredits() {
    els.creditsList.innerHTML = TRACKS.map(
      (t) => `
      <li class="credit-card">
        <strong>${escapeHtml(t.title)}</strong>
        <span>Artista / gerador: ${escapeHtml(t.artist)}</span><br/>
        <span>Licença: ${escapeHtml(t.license)} — faixas de demonstração disponibilizadas em soundhelix.com</span><br/>
        <a href="${t.url}" target="_blank" rel="noopener noreferrer">Arquivo MP3</a>
        · <a href="${t.source}" target="_blank" rel="noopener noreferrer">Fonte</a>
      </li>`
    ).join('');
  }

  function renderAllLists() {
    renderHome();
    renderSearch(els.searchInput.value);
    renderPlaylists();
    renderFavorites();
    renderCredits();
    renderSertanejo();
    highlightPlaying();
  }

  function switchTab(name) {
    $$('.tab').forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.tab-panel').forEach((p) => {
      p.hidden = p.id !== 'tab-' + name;
      p.classList.toggle('active', !p.hidden);
    });
    if (name === 'playlists') {
      state.openPlaylistId = null;
      renderPlaylists();
    }
    if (name === 'favorites') renderFavorites();
    if (name === 'search') renderSearch(els.searchInput.value);
    if (name === 'sertanejo') renderSertanejo();
  }

  function showCredits() {
    $$('.tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    $$('.tab-panel').forEach((p) => {
      p.hidden = p.id !== 'tab-credits';
      p.classList.toggle('active', p.id === 'tab-credits');
    });
  }

  function currentTrack() {
    if (state.index < 0 || state.index >= state.queue.length) return null;
    return state.queue[state.index];
  }

  function setNowPlaying(track) {
    if (!track) {
      els.nowTitle.textContent = 'Nenhuma faixa';
      els.nowArtist.textContent = 'Escolha uma música';
      els.nowArt.style.background = '';
      return;
    }
    els.nowTitle.textContent = track.title;
    els.nowArtist.textContent = track.artist + (track.mood ? ' · ' + track.mood : '');
    if (track.thumbnail) {
      els.nowArt.style.backgroundImage = 'url(' + track.thumbnail + ')';
      els.nowArt.classList.add('has-thumb');
      els.nowArt.textContent = '';
    } else {
      els.nowArt.style.backgroundImage = '';
      els.nowArt.classList.remove('has-thumb');
      els.nowArt.style.background = track.color || '';
      els.nowArt.textContent = '♪';
    }
    updateFavButton();
    updateOfflineButton();
    updateMediaSession(track);
  }

  function updateFavButton() {
    const t = currentTrack();
    const on = t && getFavorites().includes(t.id);
    els.btnFavNow.classList.toggle('on', !!on);
    els.btnFavNow.textContent = on ? '♥' : '♡';
  }

  function highlightPlaying() {
    const t = currentTrack();
    $$('.track').forEach((el) => {
      el.classList.toggle('playing', !!(t && el.dataset.id === t.id));
    });
    $$('.chart-row').forEach((el) => {
      el.classList.toggle('playing', !!(t && el.dataset.id === t.id));
    });
  }



  function revokeObjectUrls() {
    objectUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} });
    objectUrls = [];
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function applyShuffleToQueue(keepCurrent) {
    const cur = currentTrack();
    if (!state.shuffle) return;
    const rest = state.queue.filter((t) => !cur || t.id !== cur.id);
    const shuffled = shuffleArray(rest);
    state.queue = cur ? [cur, ...shuffled] : shuffled;
    state.index = cur ? 0 : (state.index >= 0 ? state.index : 0);
  }

  function updateTransportUI() {
    if (els.btnShuffle) {
      els.btnShuffle.classList.toggle('on', !!state.shuffle);
      els.btnShuffle.setAttribute('aria-pressed', state.shuffle ? 'true' : 'false');
    }
    if (els.btnRepeat) {
      const on = state.repeat !== 'off';
      els.btnRepeat.classList.toggle('on', on);
      els.btnRepeat.setAttribute('aria-pressed', on ? 'true' : 'false');
      els.btnRepeat.textContent = state.repeat === 'one' ? '🔂' : '🔁';
      els.btnRepeat.title = state.repeat === 'off' ? 'Repetir' : (state.repeat === 'all' ? 'Repetir fila' : 'Repetir faixa');
    }
    updateOfflineButton();
  }

  async function refreshImportsAndOffline() {
    if (!window.SDFOffline) return;
    try {
      const rows = await SDFOffline.listImports();
      importedTracks = rows.map((r) => ({
        id: r.id,
        title: r.title,
        artist: r.artist || 'Importado',
        mood: 'importado',
        url: null,
        source: 'import',
        color: '#7c5cff',
      }));
      importedTracks.forEach((t) => { trackById[t.id] = t; });
      offlineIds = new Set(await SDFOffline.listOfflineIds());
      renderImports();
      renderHome();
      updateOfflineButton();
    } catch (e) {
      console.warn('offline/imports', e);
    }
  }

  function renderImports() {
    if (!els.importsList) return;
    if (!importedTracks.length) {
      els.importsList.innerHTML = '';
      if (els.importsHeading) els.importsHeading.hidden = true;
      return;
    }
    if (els.importsHeading) els.importsHeading.hidden = false;
    els.importsList.innerHTML = importedTracks.map((t) => trackRow(t)).join('');
  }

  function updateOfflineButton() {
    if (!els.btnOffline) return;
    const t = currentTrack();
    const can = t && t.source !== 'youtube' && !t.youtubeId;
    els.btnOffline.hidden = !can;
    if (!can) return;
    if (t.source === 'import' || String(t.id).startsWith('imp_')) {
      els.btnOffline.textContent = 'Já disponível offline (importado)';
      els.btnOffline.disabled = true;
      return;
    }
    const has = offlineIds.has(t.id);
    els.btnOffline.disabled = false;
    els.btnOffline.textContent = has ? '✓ Salva offline' : 'Baixar para ouvir offline';
  }

  function updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !track) return;
    if (track.youtubeId || track.source === 'youtube') {
      // Media Session limitada no embed YT; ainda assim define metadados
    }
    const artwork = [];
    if (track.thumbnail || track.thumbnailHigh) {
      const src = track.thumbnailHigh || track.thumbnail;
      artwork.push({ src, sizes: '512x512', type: 'image/jpeg' });
    } else {
      artwork.push({ src: (window.__SDF_BASE__ || './') + 'icons/icon-192.png', sizes: '192x192', type: 'image/png' });
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Som da Família',
        artist: track.artist || '',
        album: track.source === 'youtube' ? 'Top 50 (só com app aberto)' : 'Som da Família',
        artwork,
      });
      navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';
    } catch (e) {}
  }

  function playIndex(i, queue) {
    if (queue) {
      state.queue = queue.slice();
      if (state.shuffle) {
        const want = state.queue[i] || state.queue[0];
        const rest = state.queue.filter((t) => t.id !== want.id);
        state.queue = [want, ...shuffleArray(rest)];
        i = 0;
      }
    }
    if (!state.queue.length) return;
    state.index = ((i % state.queue.length) + state.queue.length) % state.queue.length;
    const track = state.queue[state.index];
    setNowPlaying(track);
    highlightPlaying();
    if (track.youtubeId || track.source === 'youtube') {
      playYoutubeTrack(track);
      return;
    }
    // HTML audio (livres / importados) — Media Session + offline
    destroyYtPlayer();
    state.engine = 'audio';
    updateOfflineButton();
    updateMediaSession(track);
    (async () => {
      try {
        revokeObjectUrls();
        let src = track.url;
        if (window.SDFOffline) {
          const resolved = await SDFOffline.resolvePlayableUrl(track);
          if (resolved) {
            src = resolved;
            if (String(resolved).startsWith('blob:')) objectUrls.push(resolved);
          }
        }
        if (!src) throw new Error('Sem URL de áudio');
        audio.src = src;
        await audio.play();
        state.playing = true;
        els.btnPlay.textContent = '⏸';
        els.btnPlay.setAttribute('aria-label', 'Pausar');
        updateMediaSession(track);
      } catch (err) {
        console.warn('Falha ao tocar:', err);
        state.playing = false;
        els.btnPlay.textContent = '▶';
      }
    })();
  }

  function playTrackId(id, queue) {
    const q = queue || state.queue;
    const i = q.findIndex((t) => t.id === id);
    if (i >= 0) playIndex(i, q);
    else {
      const t = trackById[id];
      if (t) playIndex(0, [t]);
    }
  }


  function togglePlay() {
    if (!currentTrack()) {
      // se estiver na aba Top 50, toca a fila sertaneja
      const s = sertanejoTracks();
      if (s.length && document.getElementById('tab-sertanejo') && !document.getElementById('tab-sertanejo').hidden) {
        playIndex(0, s);
      } else {
        playIndex(0, TRACKS);
      }
      return;
    }
    if (state.engine === 'youtube' && ytPlayer) {
      const st = ytPlayer.getPlayerState && ytPlayer.getPlayerState();
      if (st === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
      return;
    }
    if (audio.paused) {
      audio.play().then(() => {
        state.playing = true;
        els.btnPlay.textContent = '⏸';
        els.btnPlay.setAttribute('aria-label', 'Pausar');
      });
    } else {
      pause();
    }
  }


  function pause() {
    if (state.engine === 'youtube' && ytPlayer && ytPlayer.pauseVideo) {
      try { ytPlayer.pauseVideo(); } catch (e) {}
    }
    audio.pause();
    state.playing = false;
    els.btnPlay.textContent = '▶';
    els.btnPlay.setAttribute('aria-label', 'Play');
    try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; } catch (e) {}
  }

  function next() {
    if (!state.queue.length) return;
    if (state.repeat === 'one') {
      playIndex(state.index);
      return;
    }
    const last = state.index >= state.queue.length - 1;
    if (last) {
      if (state.repeat === 'all') playIndex(0);
      else if (state.shuffle) {
        // reembaralha e toca a primeira
        const cur = currentTrack();
        const rest = state.queue.filter((t) => !cur || t.id !== cur.id);
        state.queue = shuffleArray(state.queue);
        playIndex(0);
      } else {
        // fim da fila
        pause();
      }
      return;
    }
    playIndex(state.index + 1);
  }
  function prev() {
    if (state.engine === 'youtube' && ytPlayer && ytPlayer.getCurrentTime) {
      try {
        if (ytPlayer.getCurrentTime() > 3) { ytPlayer.seekTo(0, true); return; }
      } catch (e) {}
    } else if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (!state.queue.length) return;
    if (state.index <= 0) {
      if (state.repeat === 'all') playIndex(state.queue.length - 1);
      else playIndex(0);
      return;
    }
    playIndex(state.index - 1);
  }

  function onTrackEnded() {
    if (state.repeat === 'one') {
      playIndex(state.index);
      return;
    }
    next();
  }

  function toggleFavorite(trackId) {
    const favs = getFavorites();
    const i = favs.indexOf(trackId);
    if (i >= 0) favs.splice(i, 1);
    else favs.push(trackId);
    saveFavorites(favs);
    renderFavorites();
    renderHome();
    renderSearch(els.searchInput.value);
    if (state.openPlaylistId) renderPlaylists();
    updateFavButton();
  }

  function openModal(mode, title, placeholder) {
    modalMode = mode;
    els.modalTitle.textContent = title;
    els.modalInput.value = '';
    els.modalInput.placeholder = placeholder;
    els.modal.showModal();
    setTimeout(() => els.modalInput.focus(), 50);
  }

  function openAddToPlaylist(trackId) {
    pendingAddTrackId = trackId;
    const list = getPlaylists();
    if (!list.length) {
      openModal('playlist', 'Nova playlist', 'Nome da playlist');
      // after creating, we'll add — stash flag
      modalMode = 'playlist-and-add';
      return;
    }
    els.addChoices.innerHTML = list
      .map((p) => `<li><button type="button" data-pl="${p.id}">${escapeHtml(p.name)}</button></li>`)
      .join('');
    els.modalAdd.showModal();
  }

  function addTrackToPlaylist(plId, trackId) {
    const list = getPlaylists();
    const pl = list.find((p) => p.id === plId);
    if (!pl) return;
    if (!pl.trackIds.includes(trackId)) pl.trackIds.push(trackId);
    savePlaylists(list);
    renderPlaylists();
  }

  // Events
  els.profileGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.profile-card');
    if (card) enterProfile(card.dataset.id);
  });

  els.btnAddProfile.addEventListener('click', () => openModal('profile', 'Novo perfil', 'Nome do perfil'));
  els.btnSwitchProfile.addEventListener('click', showProfiles);
  els.btnCredits.addEventListener('click', showCredits);
  els.btnBackCredits.addEventListener('click', () => switchTab('home'));

  $$('.tab').forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

  els.searchInput.addEventListener('input', () => renderSearch(els.searchInput.value));

  function onTrackListClick(e) {
    const btn = e.target.closest('[data-action]');
    const row = e.target.closest('.track');
    if (!row) return;
    const id = row.dataset.id;
    const action = btn?.dataset.action || 'play';
    if (action === 'fav') {
      toggleFavorite(id);
      return;
    }
    if (action === 'add') {
      openAddToPlaylist(id);
      return;
    }
    // play — use visible list as queue when possible
    let queue = TRACKS;
    if (row.closest('#imports-list')) {
      queue = importedTracks.slice();
    } else if (row.closest('#favorites-list')) {
      queue = getFavorites().map((x) => trackById[x]).filter(Boolean);
    } else if (row.closest('#playlist-tracks')) {
      const pl = getPlaylists().find((p) => p.id === state.openPlaylistId);
      queue = (pl?.trackIds || []).map((x) => trackById[x]).filter(Boolean);
    } else if (row.closest('#search-results')) {
      const q = els.searchInput.value.trim().toLowerCase();
      queue = !q
        ? TRACKS
        : TRACKS.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.artist.toLowerCase().includes(q) ||
              t.mood.toLowerCase().includes(q)
          );
    }
    playTrackId(id, queue);
  }

  [els.trackList, els.searchResults, els.favoritesList, els.playlistTracks].forEach((ul) =>
    ul.addEventListener('click', onTrackListClick)
  );

  els.playlistList.addEventListener('click', (e) => {
    const item = e.target.closest('[data-pl]');
    if (!item) return;
    state.openPlaylistId = item.dataset.pl;
    renderPlaylists();
  });

  els.btnBackPlaylists.addEventListener('click', () => {
    state.openPlaylistId = null;
    renderPlaylists();
  });

  els.btnNewPlaylist.addEventListener('click', () => openModal('playlist', 'Nova playlist', 'Nome da playlist'));

  els.btnDeletePlaylist.addEventListener('click', () => {
    if (!state.openPlaylistId) return;
    if (!confirm('Excluir esta playlist?')) return;
    const list = getPlaylists().filter((p) => p.id !== state.openPlaylistId);
    savePlaylists(list);
    state.openPlaylistId = null;
    renderPlaylists();
  });

  els.modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = els.modalInput.value.trim();
    if (!name) return;
    if (modalMode === 'profile') {
      const profiles = getProfiles();
      const p = { id: uid(), name, color: COLORS[profiles.length % COLORS.length] };
      profiles.push(p);
      saveProfiles(profiles);
      els.modal.close();
      renderProfiles();
      enterProfile(p.id);
    } else if (modalMode === 'playlist' || modalMode === 'playlist-and-add') {
      const list = getPlaylists();
      const pl = { id: uid(), name, trackIds: [] };
      if (modalMode === 'playlist-and-add' && pendingAddTrackId) {
        pl.trackIds.push(pendingAddTrackId);
        pendingAddTrackId = null;
      }
      list.push(pl);
      savePlaylists(list);
      els.modal.close();
      switchTab('playlists');
      renderPlaylists();
    }
    modalMode = null;
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    modalMode = null;
    pendingAddTrackId = null;
    els.modal.close();
  });

  els.addChoices.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pl]');
    if (!btn || !pendingAddTrackId) return;
    addTrackToPlaylist(btn.dataset.pl, pendingAddTrackId);
    pendingAddTrackId = null;
    els.modalAdd.close();
  });
  if (els.sertanejoList) {
    els.sertanejoList.addEventListener('click', (e) => {
      const row = e.target.closest('.chart-row');
      if (!row) return;
      const id = row.dataset.id;
      const btn = e.target.closest('[data-action]');
      const action = (btn && btn.dataset.action) || 'play';
      if (action === 'fav') { toggleFavorite(id); renderSertanejo(); updateFavButton(); return; }
      if (action === 'add') { openAddToPlaylist(id); return; }
      playTrackId(id, sertanejoTracks());
    });
  }

  els.btnPlay.addEventListener('click', togglePlay);
  els.btnNext.addEventListener('click', next);
  els.btnPrev.addEventListener('click', prev);
  els.btnFavNow.addEventListener('click', () => {
    const t = currentTrack();
    if (t) toggleFavorite(t.id);
  });

  if (els.btnShuffle) {
    els.btnShuffle.addEventListener('click', () => {
      state.shuffle = !state.shuffle;
      if (state.shuffle && state.queue.length) applyShuffleToQueue(true);
      updateTransportUI();
    });
  }
  if (els.btnRepeat) {
    els.btnRepeat.addEventListener('click', () => {
      state.repeat = state.repeat === 'off' ? 'all' : (state.repeat === 'all' ? 'one' : 'off');
      updateTransportUI();
    });
  }
  if (els.btnOffline) {
    els.btnOffline.addEventListener('click', async () => {
      const t = currentTrack();
      if (!t || t.youtubeId || t.source === 'youtube') {
        alert('Não baixamos áudio do YouTube. Use a biblioteca livre ou importe um MP3.');
        return;
      }
      if (t.source === 'import') return;
      if (!window.SDFOffline) return;
      if (SDFOffline.isYouTubeUrl(t.url)) {
        alert('URL de YouTube bloqueada para download.');
        return;
      }
      els.btnOffline.disabled = true;
      els.btnOffline.textContent = 'Baixando…';
      try {
        await Promise.race([
          SDFOffline.markOffline(t.id, t.url),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000)),
        ]);
        offlineIds.add(t.id);
        els.btnOffline.textContent = '✓ Salva offline';
        renderHome();
      } catch (e) {
        console.warn(e);
        alert('Não foi possível baixar. Verifique a conexão.');
        els.btnOffline.textContent = 'Baixar para ouvir offline';
        els.btnOffline.disabled = false;
      }
    });
  }
  if (els.importAudio) {
    els.importAudio.addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])];
      if (!files.length || !window.SDFOffline) return;
      for (const f of files) {
        try {
          const rec = await SDFOffline.saveImportFile(f);
          trackById[rec.id] = {
            id: rec.id, title: rec.title, artist: 'Importado', mood: 'importado',
            url: null, source: 'import', color: '#7c5cff',
          };
        } catch (err) { console.warn(err); }
      }
      e.target.value = '';
      await refreshImportsAndOffline();
    });
  }
  if (els.importsList) {
    els.importsList.addEventListener('click', onTrackListClick);
  }


  audio.addEventListener('timeupdate', () => {
    if (state.seeking) return;
    const dur = audio.duration || 0;
    const cur = audio.currentTime || 0;
    els.timeCur.textContent = formatTime(cur);
    els.timeDur.textContent = formatTime(dur);
    if (dur > 0) els.seek.value = Math.round((cur / dur) * 1000);
  });
  audio.addEventListener('ended', onTrackEnded);
  audio.addEventListener('loadedmetadata', () => {
    els.timeDur.textContent = formatTime(audio.duration);
  });

  els.seek.addEventListener('pointerdown', () => { state.seeking = true; });
  function seekToFraction(frac) {
    if (state.engine === 'youtube' && ytPlayer && ytPlayer.getDuration) {
      const dur = ytPlayer.getDuration() || 0;
      if (dur) ytPlayer.seekTo(frac * dur, true);
      return;
    }
    const dur = audio.duration || 0;
    if (dur) audio.currentTime = frac * dur;
  }
  els.seek.addEventListener('pointerup', () => {
    seekToFraction(Number(els.seek.value) / 1000);
    state.seeking = false;
  });
  els.seek.addEventListener('change', () => {
    seekToFraction(Number(els.seek.value) / 1000);
    state.seeking = false;
  });

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => { togglePlay(); });
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
      navigator.mediaSession.setActionHandler('nexttrack', next);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime == null) return;
        if (state.engine === 'youtube' && ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(details.seekTime, true);
        else audio.currentTime = details.seekTime;
      });
    } catch (e) {}
  }

  // PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register((window.__SDF_BASE__ || './') + 'sw.js').catch((err) => console.warn('SW:', err));
    });
  }

  // Boot
  refreshCatalog();
  renderProfiles();
  renderCredits();
  renderSertanejo();
  updateTransportUI();
  refreshImportsAndOffline();
  const saved = localStorage.getItem(STORAGE.current);
  if (saved && getProfiles().some((p) => p.id === saved)) {
    enterProfile(saved);
  }

  // Expose for tests
  window.SomDaFamilia = { TRACKS, sertanejoTracks, playTrackId, playIndex, next, prev, state, audio, getYt: () => ytPlayer, getYtLast: () => window.__SDF_YT_LAST__, refreshImportsAndOffline };
})();
