/* =========================================================
   词匣 · AUDIO
   复古合成音效 + 本地唱片播放器
   ========================================================= */

(function () {
  'use strict';

  const Lexicon = window.Lexicon = window.Lexicon || {};

  const SOUND_KEY = 'word-lexicon-sound-v1';
  const SFX_VOLUME_KEY = 'word-lexicon-sfx-volume-v1';
  const MUSIC_VOLUME_KEY = 'word-lexicon-music-volume-v1';
  const MUSIC_LOOP_KEY = 'word-lexicon-music-loop-v1';
  const MUSIC_SELECTED_KEY = 'word-lexicon-music-selected-v1';
  const MUSIC_DB_NAME = 'word-lexicon-music-library';
  const MUSIC_DB_VERSION = 1;
  const MUSIC_STORE_NAME = 'tracks';
  const FOLDER_TRACKS = [
    {
      id: 'folder-archive-waltz',
      title: '档案圆舞曲',
      fileName: 'archive-waltz.wav',
      src: 'music/archive-waltz.wav',
      source: 'folder'
    },
    {
      id: 'folder-night-rain',
      title: '夜航雨声',
      fileName: 'night-rain.wav',
      src: 'music/night-rain.wav',
      source: 'folder'
    }
  ];

  let els = null;
  let soundEnabled = true;
  let sfxVolume = 0.72;
  let musicVolume = 0.55;
  let musicLoopEnabled = true;
  let audioContext = null;
  let audioMaster = null;
  let noiseBuffer = null;
  let musicSeeking = false;
  let initialized = false;
  let musicTracks = [];
  let selectedTrackId = '';
  let currentTrack = null;
  let importedTrackUrls = new Map();
  let musicDb = null;
  let importedTracksLoaded = false;

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* 音频偏好不可用时静默降级。 */
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      /* 音频偏好不可用时静默降级。 */
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function stripExtension(fileName) {
    return String(fileName || '').replace(/\.[^.]+$/, '') || String(fileName || '');
  }

  function loadVolume(key, fallback) {
    const raw = safeGet(key);
    if (raw === null) return fallback;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
  }

  function loadPreferences() {
    soundEnabled = safeGet(SOUND_KEY) !== 'off';
    sfxVolume = loadVolume(SFX_VOLUME_KEY, 0.72);
    musicVolume = loadVolume(MUSIC_VOLUME_KEY, 0.55);
    musicLoopEnabled = safeGet(MUSIC_LOOP_KEY) !== 'off';
  }

  function saveSound() {
    safeSet(SOUND_KEY, soundEnabled ? 'on' : 'off');
  }

  function saveSfxVolume() {
    safeSet(SFX_VOLUME_KEY, String(sfxVolume));
  }

  function saveMusicVolume() {
    safeSet(MUSIC_VOLUME_KEY, String(musicVolume));
  }

  function saveLoop() {
    safeSet(MUSIC_LOOP_KEY, musicLoopEnabled ? 'on' : 'off');
  }

  function ensureAudioContext() {
    if (!soundEnabled) return null;

    if (audioContext) {
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(function () {});
      }
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      audioContext = new AudioContextClass();
      audioMaster = audioContext.createGain();
      audioMaster.gain.value = sfxVolume;
      audioMaster.connect(audioContext.destination);
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(function () {});
      }
      return audioContext;
    } catch (error) {
      audioContext = null;
      audioMaster = null;
      return null;
    }
  }

  function noise(ctx) {
    if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
    const length = Math.max(1, Math.floor(ctx.sampleRate * 1.2));
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      samples[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function chimeTone(ctx, start, frequency, level, duration) {
    if (!audioMaster) return;
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioMaster);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function playSlash() {
    const ctx = ensureAudioContext();
    if (!ctx || !audioMaster) return;

    const t = ctx.currentTime + 0.015;

    const air = ctx.createBufferSource();
    air.buffer = noise(ctx);
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.Q.value = 0.85;
    airFilter.frequency.setValueAtTime(780, t);
    airFilter.frequency.exponentialRampToValueAtTime(6400, t + 0.17);
    airFilter.frequency.exponentialRampToValueAtTime(760, t + 0.48);
    const airGain = ctx.createGain();
    airGain.gain.setValueAtTime(0.0001, t);
    airGain.gain.exponentialRampToValueAtTime(0.16, t + 0.055);
    airGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
    air.connect(airFilter);
    airFilter.connect(airGain);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(-0.55, t);
      panner.pan.linearRampToValueAtTime(0.58, t + 0.38);
      airGain.connect(panner);
      panner.connect(audioMaster);
    } else {
      airGain.connect(audioMaster);
    }

    air.start(t);
    air.stop(t + 0.56);

    const stampNoise = ctx.createBufferSource();
    stampNoise.buffer = noise(ctx);
    const stampFilter = ctx.createBiquadFilter();
    stampFilter.type = 'lowpass';
    stampFilter.Q.value = 0.9;
    stampFilter.frequency.setValueAtTime(300, t);
    stampFilter.frequency.exponentialRampToValueAtTime(160, t + 0.22);
    const stampGain = ctx.createGain();
    stampGain.gain.setValueAtTime(0.0001, t + 0.07);
    stampGain.gain.exponentialRampToValueAtTime(0.08, t + 0.085);
    stampGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.27);
    stampNoise.connect(stampFilter);
    stampFilter.connect(stampGain);
    stampGain.connect(audioMaster);
    stampNoise.start(t + 0.07);
    stampNoise.stop(t + 0.3);

    const lowHit = ctx.createOscillator();
    lowHit.type = 'sine';
    lowHit.frequency.setValueAtTime(112, t + 0.08);
    lowHit.frequency.exponentialRampToValueAtTime(48, t + 0.42);
    const lowGain = ctx.createGain();
    lowGain.gain.setValueAtTime(0.0001, t + 0.08);
    lowGain.gain.exponentialRampToValueAtTime(0.1, t + 0.1);
    lowGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    lowHit.connect(lowGain);
    lowGain.connect(audioMaster);
    lowHit.start(t + 0.08);
    lowHit.stop(t + 0.5);

    [
      { frequency: 1046.5, offset: 0.14, level: 0.038, duration: 1.15 },
      { frequency: 1568, offset: 0.17, level: 0.018, duration: 0.9 },
      { frequency: 2093, offset: 0.2, level: 0.009, duration: 0.62 },
      { frequency: 1046.5, offset: 0.54, level: 0.009, duration: 0.72 }
    ].forEach(function (note) {
      chimeTone(ctx, t + note.offset, note.frequency, note.level, note.duration);
    });
  }

  function playPage() {
    const ctx = ensureAudioContext();
    if (!ctx || !audioMaster) return;

    const t = ctx.currentTime + 0.012;
    const rustle = ctx.createBufferSource();
    rustle.buffer = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(1500, t);
    filter.frequency.exponentialRampToValueAtTime(900, t + 0.16);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.022, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    rustle.connect(filter);
    filter.connect(gain);
    gain.connect(audioMaster);
    rustle.start(t);
    rustle.stop(t + 0.2);

    const tick = ctx.createOscillator();
    tick.type = 'triangle';
    tick.frequency.setValueAtTime(1480, t);
    const tickGain = ctx.createGain();
    tickGain.gain.setValueAtTime(0.0001, t);
    tickGain.gain.exponentialRampToValueAtTime(0.008, t + 0.004);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    tick.connect(tickGain);
    tickGain.connect(audioMaster);
    tick.start(t);
    tick.stop(t + 0.06);
  }

  function playTick(result) {
    const ctx = ensureAudioContext();
    if (!ctx || !audioMaster) return;

    const t = ctx.currentTime + 0.01;
    const notes = result === 'fuzzy' ? [784, 1174] : [392];
    notes.forEach(function (frequency, index) {
      const start = t + index * 0.035;
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(result === 'fuzzy' ? 0.015 : 0.019, start + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      oscillator.connect(gain);
      gain.connect(audioMaster);
      oscillator.start(start);
      oscillator.stop(start + 0.22);
    });
  }

  function playSelect() {
    const ctx = ensureAudioContext();
    if (!ctx || !audioMaster) return;
    const t = ctx.currentTime + 0.008;
    chimeTone(ctx, t, 659.25, 0.012, 0.34);
    chimeTone(ctx, t + 0.06, 987.77, 0.008, 0.4);
  }

  function playOpen() {
    const ctx = ensureAudioContext();
    if (!ctx || !audioMaster) return;
    const t = ctx.currentTime + 0.008;
    chimeTone(ctx, t, 523.25, 0.013, 0.5);
    chimeTone(ctx, t + 0.09, 784, 0.008, 0.55);
  }

  function playToggleSound() {
    const ctx = ensureAudioContext();
    if (!ctx || !audioMaster) return;
    const t = ctx.currentTime + 0.01;
    chimeTone(ctx, t, 659.25, 0.018, 0.42);
    chimeTone(ctx, t + 0.08, 987.77, 0.014, 0.45);
  }

  function updateSoundToggle() {
    if (!els || !els.soundToggle) return;
    els.soundToggle.classList.toggle('is-muted', !soundEnabled);
    els.soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    els.soundToggle.setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
    els.soundToggle.title = soundEnabled ? '音效：开' : '音效：关';
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    saveSound();
    updateSoundToggle();

    if (audioContext && audioMaster) {
      const now = audioContext.currentTime;
      audioMaster.gain.cancelScheduledValues(now);
      audioMaster.gain.setTargetAtTime(soundEnabled ? sfxVolume : 0, now, 0.025);
    }

    if (soundEnabled) {
      playToggleSound();
    }
  }

  function setRangeProgress(input, percent) {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    input.style.setProperty('--range-progress', safePercent + '%');
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function getTrack(trackId) {
    return musicTracks.find(function (track) { return track.id === trackId; }) || null;
  }

  function folderTrackList() {
    return FOLDER_TRACKS.map(function (track) { return Object.assign({}, track); });
  }

  function updateMusicLibraryMeta() {
    if (!els || !els.musicLibraryCount) return;
    const folderCount = musicTracks.filter(function (track) { return track.source === 'folder'; }).length;
    const importedCount = musicTracks.length - folderCount;
    els.musicLibraryCount.textContent = musicTracks.length + ' 首';
    if (els.musicLibraryNote) {
      els.musicLibraryNote.textContent = 'music/ 目录 ' + folderCount + ' 首'
        + (importedCount ? ' · 已导入 ' + importedCount + ' 首' : '');
    }
  }

  function renderMusicLibrary() {
    if (!els || !els.musicLibrary) return;
    updateMusicLibraryMeta();

    if (!musicTracks.length) {
      els.musicLibrary.innerHTML = '<div class="music-choice-empty">唱片架还是空的，点击「导入音乐」放入第一首。</div>';
      return;
    }

    els.musicLibrary.innerHTML = musicTracks.map(function (track, index) {
      const selected = track.id === selectedTrackId;
      const isFolder = track.source === 'folder';
      const meta = isFolder
        ? 'music/' + track.fileName
        : '导入 · ' + formatFileSize(track.size);
      const badge = selected ? '当前' : (isFolder ? '目录' : '导入');
      return `
        <button type="button" class="music-choice${selected ? ' is-selected' : ''}" data-track-id="${escapeHtml(track.id)}" role="option" aria-selected="${selected}">
          <span class="music-choice-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="music-choice-main">
            <span class="music-choice-title">${escapeHtml(track.title)}</span>
            <span class="music-choice-meta">${escapeHtml(meta)}</span>
          </span>
          <span class="music-choice-badge">${badge}</span>
        </button>
      `;
    }).join('');
  }

  function openMusicDb() {
    if (musicDb) return Promise.resolve(musicDb);
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      let request;
      try {
        request = window.indexedDB.open(MUSIC_DB_NAME, MUSIC_DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(MUSIC_STORE_NAME)) {
          db.createObjectStore(MUSIC_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = function () {
        musicDb = request.result;
        resolve(musicDb);
      };
      request.onerror = function () {
        reject(request.error || new Error('IndexedDB open failed'));
      };
      request.onblocked = function () {
        reject(new Error('IndexedDB blocked'));
      };
    });
  }

  function readImportedRecords() {
    return new Promise(function (resolve, reject) {
      if (!musicDb) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      let transaction;
      try {
        transaction = musicDb.transaction(MUSIC_STORE_NAME, 'readonly');
      } catch (error) {
        reject(error);
        return;
      }
      const request = transaction.objectStore(MUSIC_STORE_NAME).getAll();
      request.onsuccess = function () {
        resolve(Array.isArray(request.result) ? request.result : []);
      };
      request.onerror = function () {
        reject(request.error || new Error('IndexedDB read failed'));
      };
    });
  }

  function writeImportedRecord(record) {
    return new Promise(function (resolve, reject) {
      if (!musicDb) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      let transaction;
      try {
        transaction = musicDb.transaction(MUSIC_STORE_NAME, 'readwrite');
      } catch (error) {
        reject(error);
        return;
      }
      transaction.objectStore(MUSIC_STORE_NAME).put(record);
      transaction.oncomplete = function () { resolve(); };
      transaction.onerror = function () { reject(transaction.error || new Error('IndexedDB write failed')); };
      transaction.onabort = function () { reject(transaction.error || new Error('IndexedDB write aborted')); };
    });
  }

  function loadImportedMusic() {
    openMusicDb().then(readImportedRecords).then(function (records) {
      records.sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }).forEach(function (record) {
        if (!record || !record.blob || getTrack(record.id)) return;
        const url = URL.createObjectURL(record.blob);
        importedTrackUrls.set(record.id, url);
        musicTracks.push({
          id: record.id,
          title: record.title || stripExtension(record.fileName),
          fileName: record.fileName || 'imported-audio',
          src: url,
          source: 'imported',
          size: record.size || record.blob.size,
          addedAt: record.addedAt || 0
        });
      });
      importedTracksLoaded = true;
      renderMusicLibrary();
      restoreSelectedTrack();
    }).catch(function () {
      importedTracksLoaded = true;
      renderMusicLibrary();
      restoreSelectedTrack();
    });
  }

  function restoreSelectedTrack() {
    if (!selectedTrackId) return;
    const track = getTrack(selectedTrackId);
    if (!track) {
      if (!importedTracksLoaded && selectedTrackId.indexOf('imported-') === 0) return;
      selectedTrackId = '';
      safeRemove(MUSIC_SELECTED_KEY);
      renderMusicLibrary();
      return;
    }
    if (currentTrack && currentTrack.id === track.id) return;
    selectMusicTrack(track.id, { play: false, silent: true });
  }

  function resetMusicTimeline() {
    if (!els) return;
    els.musicSeek.value = '0';
    setRangeProgress(els.musicSeek, 0);
    els.musicCurrent.textContent = '00:00';
    els.musicDuration.textContent = '--:--';
  }

  function updateMusicUi() {
    if (!els || !els.musicAudio) return;
    const hasTrack = Boolean(currentTrack);
    const playing = hasTrack && !els.musicAudio.paused && !els.musicAudio.ended;

    els.musicShell.classList.toggle('is-playing', playing);
    els.musicToggle.classList.toggle('is-playing', playing);
    els.musicPlayBtn.disabled = !hasTrack;
    els.musicSeek.disabled = !hasTrack;
    els.clearMusicBtn.disabled = !hasTrack;
    els.musicPlayBtn.setAttribute('aria-label', playing ? '暂停音乐' : '播放音乐');
    els.musicToggle.title = playing ? '本地音乐 · 播放中' : '本地音乐';

    if (!hasTrack) {
      els.trackLabel.textContent = 'LOCAL RECORD';
      els.trackName.textContent = '尚未放入唱片';
      els.trackName.removeAttribute('title');
      els.trackMeta.textContent = '从 music/ 选择或导入本地音频';
      resetMusicTimeline();
    }
  }

  function syncTrackMeta() {
    if (!els || !currentTrack) return;
    const audio = els.musicAudio;
    const sourceName = currentTrack.source === 'folder' ? '目录唱片' : '导入唱片';
    if (audio.error) {
      els.trackMeta.textContent = '无法播放这个音频';
    } else if (audio.readyState < 2) {
      els.trackMeta.textContent = sourceName + ' · 正在载入';
    } else if (!audio.paused && !audio.ended) {
      els.trackMeta.textContent = '正在播放 · ' + sourceName;
    } else if (audio.ended) {
      els.trackMeta.textContent = '播放结束 · ' + sourceName;
    } else if (audio.currentTime > 0.1) {
      els.trackMeta.textContent = '已暂停 · ' + sourceName;
    } else {
      els.trackMeta.textContent = '准备就绪 · ' + sourceName;
    }
  }

  function updateMusicTimes() {
    if (!els || !els.musicAudio || !currentTrack) return;
    const audio = els.musicAudio;
    const duration = Number.isFinite(audio.duration) ? audio.duration : NaN;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const percent = Number.isFinite(duration) && duration > 0
      ? Math.min(100, Math.max(0, (current / duration) * 100))
      : 0;

    els.musicCurrent.textContent = formatDuration(current);
    els.musicDuration.textContent = formatDuration(duration);
    setRangeProgress(els.musicSeek, percent);

    if (!musicSeeking) {
      els.musicSeek.value = String(Math.round(percent * 10));
    }
  }

  function setMusicPicker(open) {
    if (!els || !els.musicPicker) return;
    els.musicPicker.hidden = !open;
    els.chooseMusicBtn.setAttribute('aria-expanded', String(Boolean(open)));
    els.chooseMusicBtn.classList.toggle('is-open', Boolean(open));
    const label = els.chooseMusicBtn.querySelector('span');
    if (label) label.textContent = open ? '收起选择' : '选择音乐';
  }

  function openMusicDialog() {
    if (!els) return;
    syncTrackMeta();
    updateMusicUi();
    renderMusicLibrary();
    setMusicPicker(false);
    if (!els.musicDialog.open) els.musicDialog.showModal();
    playOpen();
  }

  function isAudioFile(file) {
    if (!file) return false;
    return Boolean((file.type && file.type.startsWith('audio/')) || /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus)$/i.test(file.name || ''));
  }

  function playSelectedMusic(options) {
    if (!currentTrack || !els) return;
    const opts = options || {};
    try {
      const attempt = els.musicAudio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function () {
          syncTrackMeta();
          if (!opts.silent) Lexicon.App && Lexicon.App.toast('唱片已就位，点击播放开始');
        });
      }
    } catch (error) {
      syncTrackMeta();
      if (!opts.silent) Lexicon.App && Lexicon.App.toast('唱片已就位，点击播放开始');
    }
  }

  function selectMusicTrack(trackId, options) {
    if (!els) return false;
    const opts = options || {};
    const track = getTrack(trackId);
    if (!track) return false;

    const sameTrack = currentTrack && currentTrack.id === track.id;
    selectedTrackId = track.id;
    safeSet(MUSIC_SELECTED_KEY, track.id);

    if (sameTrack) {
      renderMusicLibrary();
      if (opts.play !== false) playSelectedMusic(opts);
      return true;
    }

    const src = track.source === 'folder' ? track.src : importedTrackUrls.get(track.id);
    if (!src) {
      if (!opts.silent) Lexicon.App && Lexicon.App.toast('这首导入音乐的本地缓存不见了，请重新导入', 'error');
      return false;
    }

    els.musicAudio.pause();
    currentTrack = track;
    els.musicAudio.src = src;
    els.musicAudio.load();
    els.musicAudio.loop = musicLoopEnabled;
    els.musicAudio.volume = musicVolume;
    els.trackLabel.textContent = track.source === 'folder' ? 'FOLDER RECORD' : 'IMPORTED RECORD';
    els.trackName.textContent = track.title;
    els.trackName.title = track.fileName || track.title;
    els.trackMeta.textContent = track.source === 'folder' ? 'music/ · 正在载入' : '导入唱片 · 正在载入';
    resetMusicTimeline();
    updateMusicUi();
    renderMusicLibrary();
    if (opts.play !== false) playSelectedMusic(opts);
    return true;
  }

  async function importMusicFiles(files) {
    if (!els) return;
    const list = Array.from(files || []).filter(isAudioFile);
    if (!list.length) {
      Lexicon.App && Lexicon.App.toast('请选择 MP3 / WAV / OGG / M4A 等音频文件', 'error');
      return;
    }

    let canPersist = Boolean(musicDb);
    if (!canPersist) {
      try {
        await openMusicDb();
        canPersist = true;
      } catch (error) {
        canPersist = false;
      }
    }

    let firstTrackId = '';
    let addedCount = 0;
    let duplicateCount = 0;

    for (const file of list) {
      const existing = musicTracks.find(function (track) {
        return track.source === 'imported' && track.fileName === file.name && track.size === file.size;
      });
      if (existing) {
        if (!firstTrackId) firstTrackId = existing.id;
        duplicateCount += 1;
        continue;
      }

      const id = 'imported-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      const record = {
        id,
        title: stripExtension(file.name),
        fileName: file.name,
        size: file.size,
        type: file.type || '',
        addedAt: Date.now(),
        blob: file
      };

      if (canPersist) {
        try {
          await writeImportedRecord(record);
        } catch (error) {
          canPersist = false;
        }
      }

      const url = URL.createObjectURL(file);
      importedTrackUrls.set(id, url);
      musicTracks.push({
        id,
        title: record.title,
        fileName: record.fileName,
        src: url,
        source: 'imported',
        size: record.size,
        addedAt: record.addedAt
      });
      if (!firstTrackId) firstTrackId = id;
      addedCount += 1;
    }

    renderMusicLibrary();

    if (firstTrackId) {
      setMusicPicker(false);
      selectMusicTrack(firstTrackId, { play: true });
    }

    if (addedCount) {
      const suffix = canPersist ? '，已保存在本机' : '，本次会话有效';
      Lexicon.App && Lexicon.App.toast('已导入 ' + addedCount + ' 首唱片' + suffix, canPersist ? 'known' : 'error');
    } else if (duplicateCount) {
      Lexicon.App && Lexicon.App.toast('这些音乐已经在唱片架里了。');
    }
  }

  function toggleMusicPlayback() {
    if (!els || !currentTrack) return;
    if (els.musicAudio.paused) {
      playSelectedMusic({});
    } else {
      els.musicAudio.pause();
    }
  }

  function clearMusic() {
    if (!els || !currentTrack) return;
    els.musicAudio.pause();
    els.musicAudio.removeAttribute('src');
    els.musicAudio.load();
    currentTrack = null;
    selectedTrackId = '';
    safeRemove(MUSIC_SELECTED_KEY);
    updateMusicUi();
    renderMusicLibrary();
    Lexicon.App && Lexicon.App.toast('已清除当前选择，唱片仍保留在唱片架。');
  }

  function handleMusicError() {
    if (!els || !currentTrack) return;
    els.trackMeta.textContent = '无法播放这个音频';
    updateMusicUi();
    Lexicon.App && Lexicon.App.toast('这个音频无法播放，请换一首', 'error');
  }

  function applySfxVolume() {
    if (!audioMaster || !audioContext) return;
    const now = audioContext.currentTime;
    audioMaster.gain.cancelScheduledValues(now);
    audioMaster.gain.setTargetAtTime(soundEnabled ? sfxVolume : 0, now, 0.02);
  }

  function bindMusicEvents() {
    document.querySelectorAll('[data-open-music]').forEach(function (button) {
      button.addEventListener('click', openMusicDialog);
    });

    els.chooseMusicBtn.addEventListener('click', function () {
      setMusicPicker(els.musicPicker.hidden);
      if (!els.musicPicker.hidden) renderMusicLibrary();
    });

    els.musicPickerClose.addEventListener('click', function () {
      setMusicPicker(false);
      els.chooseMusicBtn.focus();
    });

    els.importMusicBtn.addEventListener('click', function () {
      els.musicInput.click();
    });

    els.musicInput.addEventListener('change', function () {
      const files = els.musicInput.files ? Array.from(els.musicInput.files) : [];
      if (files.length) {
        importMusicFiles(files).catch(function () {
          Lexicon.App && Lexicon.App.toast('导入音乐失败，请重试', 'error');
        });
      }
      els.musicInput.value = '';
    });

    els.musicLibrary.addEventListener('click', function (event) {
      const choice = event.target.closest('[data-track-id]');
      if (!choice) return;
      if (selectMusicTrack(choice.dataset.trackId, { play: true })) {
        setMusicPicker(false);
      }
    });

    ['dragenter', 'dragover'].forEach(function (type) {
      els.musicTrack.addEventListener(type, function (event) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        els.musicTrack.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach(function (type) {
      els.musicTrack.addEventListener(type, function (event) {
        event.preventDefault();
        els.musicTrack.classList.remove('is-dragover');
        if (type === 'drop') {
          const files = event.dataTransfer && event.dataTransfer.files ? Array.from(event.dataTransfer.files) : [];
          if (files.length) {
            importMusicFiles(files).catch(function () {
              Lexicon.App && Lexicon.App.toast('导入音乐失败，请重试', 'error');
            });
          }
        }
      });
    });

    els.musicDialog.addEventListener('close', function () {
      setMusicPicker(false);
    });

    els.musicPlayBtn.addEventListener('click', toggleMusicPlayback);
    els.clearMusicBtn.addEventListener('click', clearMusic);

    els.musicLoop.addEventListener('change', function () {
      musicLoopEnabled = els.musicLoop.checked;
      els.musicAudio.loop = musicLoopEnabled;
      saveLoop();
    });

    els.musicVolume.addEventListener('input', function () {
      musicVolume = Number(els.musicVolume.value) / 100;
      els.musicAudio.volume = musicVolume;
      const percent = Math.round(musicVolume * 100);
      els.musicVolumeValue.textContent = percent + '%';
      setRangeProgress(els.musicVolume, percent);
    });

    els.musicVolume.addEventListener('change', saveMusicVolume);

    els.sfxVolume.addEventListener('input', function () {
      sfxVolume = Number(els.sfxVolume.value) / 100;
      const percent = Math.round(sfxVolume * 100);
      els.sfxVolumeValue.textContent = percent + '%';
      setRangeProgress(els.sfxVolume, percent);
      applySfxVolume();
    });

    els.sfxVolume.addEventListener('change', function () {
      saveSfxVolume();
      if (soundEnabled) playTick('fuzzy');
    });

    els.musicSeek.addEventListener('pointerdown', function () {
      musicSeeking = true;
    });

    els.musicSeek.addEventListener('input', function () {
      const audio = els.musicAudio;
      const duration = Number.isFinite(audio.duration) ? audio.duration : NaN;
      const sliderValue = Number(els.musicSeek.value);
      const percent = sliderValue / 10;
      setRangeProgress(els.musicSeek, percent);

      if (Number.isFinite(duration) && duration > 0) {
        const targetTime = duration * (sliderValue / 1000);
        try {
          audio.currentTime = targetTime;
          els.musicCurrent.textContent = formatDuration(targetTime);
        } catch (error) {
          /* 忽略拖拽过快导致的单次 seek 失败。 */
        }
      }
    });

    els.musicSeek.addEventListener('change', function () {
      musicSeeking = false;
      updateMusicTimes();
    });

    window.addEventListener('pointerup', function () {
      if (!musicSeeking) return;
      musicSeeking = false;
      updateMusicTimes();
    });

    els.musicAudio.addEventListener('loadedmetadata', function () {
      updateMusicTimes();
      syncTrackMeta();
    });
    els.musicAudio.addEventListener('canplay', syncTrackMeta);
    els.musicAudio.addEventListener('playing', function () {
      updateMusicUi();
      syncTrackMeta();
    });
    els.musicAudio.addEventListener('durationchange', updateMusicTimes);
    els.musicAudio.addEventListener('seeked', updateMusicTimes);
    els.musicAudio.addEventListener('timeupdate', function () {
      if (!musicSeeking) updateMusicTimes();
    });
    els.musicAudio.addEventListener('play', function () {
      updateMusicUi();
      syncTrackMeta();
    });
    els.musicAudio.addEventListener('pause', function () {
      updateMusicUi();
      syncTrackMeta();
    });
    els.musicAudio.addEventListener('ended', function () {
      updateMusicUi();
      syncTrackMeta();
    });
    els.musicAudio.addEventListener('error', handleMusicError);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    els = {
      soundToggle: document.getElementById('soundToggle'),
      musicToggle: document.getElementById('musicToggle'),
      musicDialog: document.getElementById('musicDialog'),
      musicShell: document.getElementById('musicShell'),
      musicTrack: document.getElementById('musicTrack'),
      trackLabel: document.getElementById('trackLabel'),
      trackName: document.getElementById('trackName'),
      trackMeta: document.getElementById('trackMeta'),
      chooseMusicBtn: document.getElementById('chooseMusicBtn'),
      musicPicker: document.getElementById('musicPicker'),
      musicPickerClose: document.getElementById('musicPickerClose'),
      musicLibrary: document.getElementById('musicLibrary'),
      musicLibraryCount: document.getElementById('musicLibraryCount'),
      musicLibraryNote: document.getElementById('musicLibraryNote'),
      importMusicBtn: document.getElementById('importMusicBtn'),
      musicInput: document.getElementById('musicInput'),
      musicPlayBtn: document.getElementById('musicPlayBtn'),
      musicSeek: document.getElementById('musicSeek'),
      musicCurrent: document.getElementById('musicCurrent'),
      musicDuration: document.getElementById('musicDuration'),
      musicVolume: document.getElementById('musicVolume'),
      musicVolumeValue: document.getElementById('musicVolumeValue'),
      sfxVolume: document.getElementById('sfxVolume'),
      sfxVolumeValue: document.getElementById('sfxVolumeValue'),
      musicLoop: document.getElementById('musicLoop'),
      clearMusicBtn: document.getElementById('clearMusicBtn'),
      musicAudio: document.getElementById('musicAudio')
    };

    if (!els.musicAudio) return;

    loadPreferences();
    selectedTrackId = safeGet(MUSIC_SELECTED_KEY) || '';
    musicTracks = folderTrackList();
    els.musicAudio.volume = musicVolume;
    els.musicAudio.loop = musicLoopEnabled;
    els.musicLoop.checked = musicLoopEnabled;

    const musicPercent = Math.round(musicVolume * 100);
    const sfxPercent = Math.round(sfxVolume * 100);
    els.musicVolume.value = String(musicPercent);
    els.sfxVolume.value = String(sfxPercent);
    els.musicVolumeValue.textContent = musicPercent + '%';
    els.sfxVolumeValue.textContent = sfxPercent + '%';
    setRangeProgress(els.musicVolume, musicPercent);
    setRangeProgress(els.sfxVolume, sfxPercent);
    updateSoundToggle();
    setMusicPicker(false);
    renderMusicLibrary();
    updateMusicUi();
    bindMusicEvents();

    els.soundToggle.addEventListener('click', toggleSound);
    restoreSelectedTrack();
    loadImportedMusic();
  }

  Lexicon.Audio = {
    init,
    playSlash,
    playPage,
    playTick,
    playSelect,
    playOpen,
    openMusicDialog
  };
})();
