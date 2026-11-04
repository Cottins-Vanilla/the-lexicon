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

  let els = null;
  let soundEnabled = true;
  let sfxVolume = 0.72;
  let musicVolume = 0.55;
  let musicLoopEnabled = true;
  let audioContext = null;
  let audioMaster = null;
  let noiseBuffer = null;
  let musicObjectUrl = '';
  let musicSeeking = false;
  let initialized = false;

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

  function musicHasTrack() {
    return Boolean(musicObjectUrl);
  }

  function updateMusicUi() {
    if (!els || !els.musicAudio) return;
    const hasTrack = musicHasTrack();
    const playing = hasTrack && !els.musicAudio.paused && !els.musicAudio.ended;

    els.musicShell.classList.toggle('is-playing', playing);
    els.musicToggle.classList.toggle('is-playing', playing);
    els.musicPlayBtn.disabled = !hasTrack;
    els.musicSeek.disabled = !hasTrack;
    els.clearMusicBtn.disabled = !hasTrack;
    els.musicPlayBtn.setAttribute('aria-label', playing ? '暂停音乐' : '播放音乐');
    els.musicToggle.title = playing ? '本地音乐 · 播放中' : '本地音乐';

    if (!hasTrack) {
      els.trackName.textContent = '尚未放入唱片';
      els.trackName.removeAttribute('title');
      els.trackMeta.textContent = '选择或拖入本地音频';
      els.musicSeek.value = '0';
      setRangeProgress(els.musicSeek, 0);
      els.musicCurrent.textContent = '00:00';
      els.musicDuration.textContent = '--:--';
    }
  }

  function syncTrackMeta() {
    if (!els || !musicObjectUrl) return;
    const audio = els.musicAudio;
    if (audio.error) {
      els.trackMeta.textContent = '无法播放这个音频';
    } else if (audio.readyState < 2) {
      els.trackMeta.textContent = '本地唱片 · 正在载入';
    } else if (!audio.paused && !audio.ended) {
      els.trackMeta.textContent = '正在播放 · 本地唱片';
    } else if (audio.ended) {
      els.trackMeta.textContent = '播放结束 · 本地唱片';
    } else if (audio.currentTime > 0.1) {
      els.trackMeta.textContent = '已暂停 · 本地唱片';
    } else {
      els.trackMeta.textContent = '准备就绪 · 本地唱片';
    }
  }

  function updateMusicTimes() {
    if (!els || !els.musicAudio || !musicObjectUrl) return;
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

  function openMusicDialog() {
    if (!els) return;
    syncTrackMeta();
    updateMusicUi();
    if (!els.musicDialog.open) els.musicDialog.showModal();
    playOpen();
  }

  function isAudioFile(file) {
    if (!file) return false;
    return Boolean((file.type && file.type.startsWith('audio/')) || /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus)$/i.test(file.name || ''));
  }

  function loadMusicFile(file) {
    if (!els) return;
    if (!isAudioFile(file)) {
      Lexicon.App && Lexicon.App.toast('请选择 MP3 / WAV / OGG / M4A 等音频文件', 'error');
      return;
    }

    if (musicObjectUrl) {
      els.musicAudio.pause();
      URL.revokeObjectURL(musicObjectUrl);
    }

    musicObjectUrl = URL.createObjectURL(file);
    els.musicAudio.src = musicObjectUrl;
    els.musicAudio.load();
    els.musicAudio.loop = musicLoopEnabled;
    els.musicAudio.volume = musicVolume;

    const displayName = file.name.replace(/\.[^.]+$/, '') || file.name;
    els.trackName.textContent = displayName;
    els.trackName.title = file.name;
    els.trackMeta.textContent = '本地唱片 · 正在载入';
    els.musicSeek.value = '0';
    setRangeProgress(els.musicSeek, 0);
    els.musicCurrent.textContent = '00:00';
    els.musicDuration.textContent = '--:--';
    updateMusicUi();
    Lexicon.App && Lexicon.App.toast('已放入唱片 · ' + displayName);

    try {
      const playAttempt = els.musicAudio.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(function () {
          syncTrackMeta();
          if (musicObjectUrl) Lexicon.App && Lexicon.App.toast('唱片已就位，点击播放开始');
        });
      }
    } catch (error) {
      syncTrackMeta();
      Lexicon.App && Lexicon.App.toast('唱片已就位，点击播放开始');
    }
  }

  function toggleMusicPlayback() {
    if (!els || !musicObjectUrl) return;
    if (els.musicAudio.paused) {
      const playAttempt = els.musicAudio.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(function () {
          Lexicon.App && Lexicon.App.toast('当前浏览器无法播放这个音频', 'error');
        });
      }
    } else {
      els.musicAudio.pause();
    }
  }

  function clearMusic() {
    if (!els || !musicObjectUrl) return;
    els.musicAudio.pause();
    els.musicAudio.removeAttribute('src');
    els.musicAudio.load();
    URL.revokeObjectURL(musicObjectUrl);
    musicObjectUrl = '';
    updateMusicUi();
    Lexicon.App && Lexicon.App.toast('已移除唱片');
  }

  function handleMusicError() {
    if (!els || !musicObjectUrl) return;
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
      els.musicInput.click();
    });

    els.musicInput.addEventListener('change', function () {
      const file = els.musicInput.files && els.musicInput.files[0];
      if (file) loadMusicFile(file);
      els.musicInput.value = '';
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
          const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
          if (file) loadMusicFile(file);
        }
      });
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
      trackName: document.getElementById('trackName'),
      trackMeta: document.getElementById('trackMeta'),
      chooseMusicBtn: document.getElementById('chooseMusicBtn'),
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
    updateMusicUi();
    bindMusicEvents();

    els.soundToggle.addEventListener('click', toggleSound);
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
