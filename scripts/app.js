/* =========================================================
   词匣 · APP
   词库主页、词条管理、记诵会话与页面转场
   ========================================================= */

(function () {
  'use strict';

  const Lexicon = window.Lexicon = window.Lexicon || {};
  const Store = Lexicon.Store;
  const Art = Lexicon.Art;

  const STATUS_META = {
    new: { label: '新词', tag: 'NEW · 新词', className: 'is-new' },
    fuzzy: { label: '依稀', tag: 'FUZZY · 依稀', className: 'is-fuzzy' },
    unknown: { label: '未识', tag: 'AGAIN · 未识', className: 'is-unknown' },
    known: { label: '已斩', tag: 'KNOWN · 已斩', className: 'is-known' }
  };

  const ICONS = {
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M7 7l.8 12h8.4L17 7"/><path d="M10 10.5v5M14 10.5v5"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 11a7.5 7.5 0 111.9 5.1M4.5 5.5V11H10"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };

  let els = null;
  let toastTimer = 0;
  let searchTimer = 0;
  let fitTimer = 0;
  let enterTimer = 0;
  let reduceMotion = false;

  const ui = {
    activeFolderId: '',
    search: '',
    searchResultCount: 0,
    currentBookId: '',
    session: null,
    manageBookId: '',
    manageSearch: '',
    entryBookId: '',
    libScrollTop: 0,
    busy: false,
    emptyPrimaryMode: 'add',
    confirmAction: null,
    lastFocusElement: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    els = {
      app: $('app'),
      brandHome: $('brandHome'),
      backBtn: $('backBtn'),
      topbarKicker: $('topbarKicker'),
      topbarTitle: $('topbarTitle'),
      libraryView: $('libraryView'),
      libraryScroll: document.querySelector('.library-scroll'),
      heroArt: $('heroArt'),
      bookSearch: $('bookSearch'),
      searchClear: $('searchClear'),
      searchStatus: $('searchStatus'),
      folderRail: $('folderRail'),
      bookRail: $('bookRail'),
      bookShelf: document.querySelector('.shelf-books'),
      folderShelf: document.querySelector('.shelf-folders'),
      bookSectionTitle: $('bookSectionTitle'),
      bookSectionKicker: $('bookSectionKicker'),
      newFolderBtn: $('newFolderBtn'),
      newBookBtn: $('newBookBtn'),
      statFolders: $('statFolders'),
      statBooks: $('statBooks'),
      statWords: $('statWords'),
      statKnown: $('statKnown'),
      viewCurtain: $('viewCurtain'),

      studyView: $('studyView'),
      studyStage: $('studyStage'),
      studyKicker: $('studyKicker'),
      studyBookTitle: $('studyBookTitle'),
      studyBookDesc: $('studyBookDesc'),
      manageBookBtn: $('manageBookBtn'),
      addWordBtn: $('addWordBtn'),
      studyContent: $('studyContent'),
      studyEmpty: $('studyEmpty'),
      emptyTitle: $('emptyTitle'),
      emptyText: $('emptyText'),
      emptyPrimary: $('emptyPrimary'),
      emptySecondary: $('emptySecondary'),
      studyPosition: $('studyPosition'),
      priorityTag: $('priorityTag'),
      wordFrame: $('wordFrame'),
      wordEl: $('wordEl'),
      pos: $('pos'),
      phonetic: $('phonetic'),
      speakBtn: $('speakBtn'),
      meaning: $('meaning'),
      sentence: $('sentence'),
      translation: $('translation'),
      source: $('source'),
      sourceNote: $('sourceNote'),
      queueProgress: $('queueProgress'),
      queueBarFill: $('queueBarFill'),
      studyFuzzy: $('studyFuzzy'),
      studyUnknown: $('studyUnknown'),
      studyFresh: $('studyFresh'),
      studyKnown: $('studyKnown'),
      prevBtn: $('prevBtn'),
      nextBtn: $('nextBtn'),
      studyConsole: $('studyConsole'),
      studyActions: $('studyActions'),

      folderDialog: $('folderDialog'),
      folderForm: $('folderForm'),
      folderName: $('folderName'),
      folderSubtitle: $('folderSubtitle'),
      folderDescription: $('folderDescription'),
      folderError: $('folderError'),

      bookDialog: $('bookDialog'),
      bookForm: $('bookForm'),
      bookName: $('bookName'),
      bookSubtitle: $('bookSubtitle'),
      bookFolder: $('bookFolder'),
      bookDescription: $('bookDescription'),
      bookError: $('bookError'),

      entryDialog: $('entryDialog'),
      entryForm: $('entryForm'),
      entryBookLabel: $('entryBookLabel'),
      entryWord: $('entryWord'),

      manageDialog: $('manageDialog'),
      manageTitle: $('manageTitle'),
      manageMeta: $('manageMeta'),
      manageSearch: $('manageSearch'),
      manageList: $('manageList'),
      manageCount: $('manageCount'),
      manageAddBtn: $('manageAddBtn'),
      manageExportBtn: $('manageExportBtn'),

      ledgerOpen: $('ledgerOpen'),
      ledgerDialog: $('ledgerDialog'),
      ledgerTotal: $('ledgerTotal'),
      ledgerFuzzy: $('ledgerFuzzy'),
      ledgerUnknown: $('ledgerUnknown'),
      ledgerBooks: $('ledgerBooks'),
      activityList: $('activityList'),
      exportBtn: $('exportBtn'),

      confirmDialog: $('confirmDialog'),
      confirmTitle: $('confirmTitle'),
      confirmMessage: $('confirmMessage'),
      confirmOk: $('confirmOk'),
      confirmCancel: $('confirmCancel'),

      toast: $('toast')
    };
  }

  function init() {
    cacheElements();
    Store.getState();

    const folders = Store.getFolders();
    ui.activeFolderId = Store.getActiveFolderId();
    if (!ui.activeFolderId && folders[0]) ui.activeFolderId = folders[0].id;
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    renderHeroArt();
    updateTopbar('library');
    renderLibrary({ animate: true });
    bindEvents();

    Lexicon.App = {
      toast: showToast,
      openLibrary: function () { showLibrary(); },
      getCurrentBook: function () { return Store.getBook(ui.currentBookId); }
    };

    if (Lexicon.Audio) Lexicon.Audio.init();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fitStudyWord(); }).catch(function () {});
    }

    if (Store.getStorageError()) {
      showToast('浏览器限制了本地存储，变更可能无法在刷新后保留。', 'error');
    }
  }

  /* =====================================================
     工具函数
     ===================================================== */

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function highlight(value, query) {
    const text = String(value == null ? '' : value);
    const needle = String(query || '').trim();
    if (!needle) return escapeHtml(text);
    const index = text.toLowerCase().indexOf(needle.toLowerCase());
    if (index < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, index))
      + '<mark>' + escapeHtml(text.slice(index, index + needle.length)) + '</mark>'
      + escapeHtml(text.slice(index + needle.length));
  }

  function localDateKey(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function formatDay(date) {
    const today = new Date();
    const key = localDateKey(date);
    const yesterday = new Date(today.getTime() - 86400000);
    const base = date.getMonth() + 1 + '月' + pad2(date.getDate()) + '日';
    if (key === localDateKey(today)) return '今天 · ' + base;
    if (key === localDateKey(yesterday)) return '昨天 · ' + base;
    return date.getFullYear() + '年' + base;
  }

  function formatTime(iso) {
    const date = new Date(iso);
    return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  }

  function isEditableTarget(target) {
    return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function showToast(message, tone) {
    window.clearTimeout(toastTimer);
    els.toast.classList.remove('is-visible');
    void els.toast.offsetWidth;
    els.toast.textContent = message;
    els.toast.dataset.tone = tone || '';
    els.toast.classList.add('is-visible');
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2500);
  }

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    ui.lastFocusElement = document.activeElement;
    dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function playViewCurtain() {
    if (reduceMotion) return;
    els.viewCurtain.classList.remove('is-active');
    void els.viewCurtain.offsetWidth;
    els.viewCurtain.classList.add('is-active');
    window.setTimeout(function () {
      els.viewCurtain.classList.remove('is-active');
    }, 760);
  }

  function addViewEntrance(view) {
    if (!view || reduceMotion) return;
    view.classList.remove('is-view-entering');
    void view.offsetWidth;
    view.classList.add('is-view-entering');
    window.setTimeout(function () {
      view.classList.remove('is-view-entering');
    }, 700);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  /* =====================================================
     顶栏与视图
     ===================================================== */

  function updateTopbar(view, book) {
    const isStudy = view === 'study';
    els.brandHome.hidden = isStudy;
    els.backBtn.hidden = !isStudy;
    els.app.classList.toggle('is-study', isStudy);

    if (!isStudy) {
      els.topbarKicker.textContent = 'THE ARCHIVE';
      els.topbarTitle.textContent = '词库';
      return;
    }

    const folder = book ? Store.getFolder(book.folderId) : null;
    els.topbarKicker.textContent = folder ? (folder.subtitle || folder.name) : 'WORD BOOK';
    els.topbarTitle.textContent = book ? book.name : '记诵';
  }

  function setView(view) {
    const showingStudy = view === 'study';
    const changing = els.libraryView.hidden !== showingStudy;

    if (showingStudy) {
      els.libraryView.hidden = true;
      els.studyView.hidden = false;
    } else {
      els.studyView.hidden = true;
      els.libraryView.hidden = false;
    }

    const nextView = showingStudy ? els.studyView : els.libraryView;
    addViewEntrance(nextView);
    if (changing) playViewCurtain();
  }

  function showLibrary(options) {
    if (ui.busy) return;
    const opts = options || {};
    closeDialog(els.manageDialog);
    closeDialog(els.ledgerDialog);
    setView('library');
    updateTopbar('library');
    renderLibrary({ animate: true });
    const targetTop = opts.toTop ? 0 : ui.libScrollTop;
    window.requestAnimationFrame(function () {
      els.libraryScroll.scrollTop = targetTop;
    });
    if (opts.toTop) ui.libScrollTop = 0;
    if (opts.user !== false) Lexicon.Audio && Lexicon.Audio.playPage();
  }

  function openBook(bookId) {
    if (ui.busy) return;
    const book = Store.getBook(bookId);
    if (!book) {
      showToast('这本单词本不存在了。', 'error');
      return;
    }

    ui.libScrollTop = els.libraryScroll.scrollTop;
    Store.rememberOpenedBook(bookId);
    ui.currentBookId = bookId;
    ui.session = createSession(bookId);
    setView('study');
    updateTopbar('study', book);
    renderStudy({ animate: true, entering: true });
    els.studyStage.scrollTop = 0;
    window.requestAnimationFrame(fitStudyWord);
    Lexicon.Audio && Lexicon.Audio.playOpen();
  }

  function createSession(bookId) {
    const queue = Store.getQueue(bookId);
    return {
      bookId,
      ids: queue.map(function (word) { return word.id; }),
      index: 0,
      round: 1
    };
  }

  /* =====================================================
     词库主页
     ===================================================== */

  function renderHeroArt() {
    if (!els.heroArt) return;
    els.heroArt.innerHTML = Art.cover('library-hero-plate-nine', 'folder', 3);
  }

  function renderLibrary(options) {
    const opts = options || {};
    const folders = Store.getFolders();
    if (!folders.some(function (folder) { return folder.id === ui.activeFolderId; })) {
      ui.activeFolderId = folders[0] ? folders[0].id : '';
      if (ui.activeFolderId) Store.setActiveFolder(ui.activeFolderId);
    }

    renderFolderRail({ animate: opts.animate !== false });
    renderBookRail({ animate: opts.animate !== false });
    updateLibraryStats();
    updateSearchUi();
  }

  function renderFolderRail(options) {
    const folders = Store.getFolders();
    const animate = options && options.animate;

    if (!folders.length) {
      els.folderRail.innerHTML = railEmptyHtml({
        title: '还没有文件夹',
        text: '先给藏书留一个位置，再把单词本收进去。',
        action: 'create-folder',
        actionLabel: '新建文件夹'
      });
      return;
    }

    els.folderRail.innerHTML = folders.map(function (folder, index) {
      const books = Store.getBooksInFolder(folder.id);
      const wordCount = books.reduce(function (total, book) { return total + book.words.length; }, 0);
      const active = folder.id === ui.activeFolderId;
      return `
        <article class="folder-card${active ? ' is-active' : ''}" data-folder-id="${escapeAttr(folder.id)}" role="button" tabindex="0" aria-pressed="${active}" aria-expanded="${active}" aria-controls="bookRail" aria-label="文件夹 ${escapeAttr(folder.name)}，${books.length} 本单词本" style="--i:${animate ? index : 0}">
          <div class="folder-art" aria-hidden="true">${Art.cover(folder.id, 'folder', index)}</div>
          <div class="folder-card-scrim"></div>
          <div class="folder-body">
            <span class="folder-overline"><i></i>${active ? 'OPEN · 已展开' : 'FOLDER · ' + pad2(index + 1)}</span>
            <h3 class="folder-name">${highlight(folder.name, ui.search)}</h3>
            <p class="folder-subtitle">${escapeHtml(folder.subtitle || 'PRIVATE FOLDER')}</p>
            <div class="folder-meta"><span>${books.length} 本单词本</span><span>${wordCount} 个词条</span></div>
          </div>
          <button type="button" class="card-menu" data-delete-folder="${escapeAttr(folder.id)}" aria-label="删除文件夹 ${escapeAttr(folder.name)}" title="删除文件夹">${ICONS.trash}</button>
        </article>
      `;
    }).join('');
  }

  function renderBookRail(options) {
    const opts = options || {};
    const folders = Store.getFolders();
    const query = ui.search.trim();
    const activeFolder = Store.getFolder(ui.activeFolderId);
    let books = query ? Store.searchBooks(query) : (activeFolder ? Store.getBooksInFolder(activeFolder.id) : []);
    const an = opts.animate !== false;
    const lastOpened = Store.getLastOpenedBookId();

    ui.searchResultCount = books.length;
    els.libraryView.classList.toggle('is-searching', Boolean(query));
    els.searchClear.hidden = !query;
    els.newBookBtn.disabled = folders.length === 0;
    els.newBookBtn.title = folders.length ? '新建单词本' : '请先创建文件夹';

    if (query) {
      els.bookSectionTitle.textContent = '搜索结果';
      els.bookSectionKicker.textContent = books.length
        ? books.length + ' 本匹配 · “' + query + '”'
        : 'SEARCH RESULTS · 没有找到匹配的单词本';
    } else if (activeFolder) {
      els.bookSectionTitle.textContent = activeFolder.name;
      els.bookSectionKicker.textContent = books.length + ' 本单词本 · ' + (activeFolder.subtitle || 'WORD BOOKS');
    } else {
      els.bookSectionTitle.textContent = '单词本';
      els.bookSectionKicker.textContent = 'WORD BOOKS · 先创建一个文件夹';
    }

    els.searchStatus.textContent = query
      ? (books.length ? '找到 ' + books.length + ' 本单词本' : '没有匹配的单词本')
      : '共 ' + Store.getBooks().length + ' 本单词本';

    if (!books.length) {
      if (query) {
        els.bookRail.innerHTML = railEmptyHtml({
          title: '没有找到相关单词本',
          text: '换一个书名、主题或文件夹名称试试。',
          action: 'clear-search',
          actionLabel: '清除搜索'
        });
      } else if (!folders.length) {
        els.bookRail.innerHTML = railEmptyHtml({
          title: '先建一个文件夹',
          text: '文件夹可以容纳不同主题的单词本。',
          action: 'create-folder',
          actionLabel: '新建文件夹'
        });
      } else {
        els.bookRail.innerHTML = railEmptyHtml({
          title: '这个文件夹还没有单词本',
          text: '为它新建一本单词本，把想记住的词收进来。',
          action: 'create-book',
          actionLabel: '新建单词本'
        });
      }
      return;
    }

    els.bookRail.innerHTML = books.map(function (book, index) {
      const folder = Store.getFolder(book.folderId);
      const counts = Store.getCounts(book);
      const isLast = book.id === lastOpened;
      const folderTag = query && folder
        ? '<span class="book-folder-tag">' + highlight(folder.name, query) + '</span>'
        : '';
      const dots = [
        counts.fuzzy ? '<span class="status-dot is-fuzzy" title="依稀 ' + counts.fuzzy + '"></span>' : '',
        counts.unknown ? '<span class="status-dot is-unknown" title="未识 ' + counts.unknown + '"></span>' : '',
        counts.known ? '<span class="status-dot is-known" title="已斩 ' + counts.known + '"></span>' : ''
      ].join('');

      return `
        <article class="book-card${isLast ? ' is-last-opened' : ''}" data-book-id="${escapeAttr(book.id)}" role="button" tabindex="0" aria-label="单词本 ${escapeAttr(book.name)}，${counts.total} 个词条" style="--i:${an ? index : 0}">
          <div class="book-cover">
            <div class="book-art" aria-hidden="true">${Art.cover(book.id, 'book', index)}</div>
            <div class="book-veil"></div>
            <div class="book-cover-top">
              <span>${isLast ? 'LAST READ' : 'WORD BOOK'}</span>
              <span>VOL. ${pad2(index + 1)}</span>
            </div>
            ${folderTag}
            <div class="book-cover-title">
              <h3>${highlight(book.name, query)}</h3>
              <p>${highlight(book.subtitle || 'A COLLECTION OF WORDS', query)}</p>
            </div>
            <button type="button" class="card-menu" data-delete-book="${escapeAttr(book.id)}" aria-label="删除单词本 ${escapeAttr(book.name)}" title="删除单词本">${ICONS.trash}</button>
          </div>
          <div class="book-caption">
            <span class="book-caption-count">${counts.total} WORDS</span>
            <span class="book-caption-status" aria-label="依稀 ${counts.fuzzy}，未识 ${counts.unknown}，已斩 ${counts.known}">${dots || '<span class="status-dot"></span>'}</span>
          </div>
        </article>
      `;
    }).join('');

    if (opts.focusFirst) {
      window.requestAnimationFrame(function () {
        focusFirstInRail(els.bookRail);
        scrollShelfIntoView();
      });
    }
  }

  function railEmptyHtml(config) {
    return `
      <div class="rail-empty">
        <h3>${escapeHtml(config.title)}</h3>
        <p>${escapeHtml(config.text)}</p>
        <button type="button" class="line-btn" data-action="${escapeAttr(config.action)}">${ICONS.plus}${escapeHtml(config.actionLabel)}</button>
      </div>
    `;
  }

  function updateLibraryStats() {
    const stats = Store.getLibraryStats();
    els.statFolders.textContent = stats.folders;
    els.statBooks.textContent = stats.books;
    els.statWords.textContent = stats.words;
    els.statKnown.textContent = stats.known;
  }

  function updateSearchUi() {
    if (document.activeElement !== els.bookSearch && els.bookSearch.value !== ui.search) {
      els.bookSearch.value = ui.search;
    }
    els.searchClear.hidden = !ui.search;
    els.libraryView.classList.toggle('is-searching', Boolean(ui.search.trim()));
  }

  function updateFolderActiveState() {
    els.folderRail.querySelectorAll('.folder-card').forEach(function (card) {
      const active = card.dataset.folderId === ui.activeFolderId;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', String(active));
    });
  }

  function selectFolder(folderId, options) {
    const opts = options || {};
    if (!folderId) return;
    const folder = Store.getFolder(folderId);
    if (!folder) return;

    if (ui.search) {
      ui.search = '';
      els.bookSearch.value = '';
      els.libraryView.classList.remove('is-searching');
    }

    Store.setActiveFolder(folderId);
    ui.activeFolderId = folderId;
    updateFolderActiveState();
    renderBookRail({ animate: true, focusFirst: true });
    window.requestAnimationFrame(function () {
      const activeCard = els.folderRail.querySelector('.folder-card.is-active');
      if (activeCard) centerRailCard(els.folderRail, activeCard);
      scrollShelfIntoView();
    });

    if (opts.user !== false) {
      Lexicon.Audio && Lexicon.Audio.playSelect();
    }
  }

  function centerRailCard(rail, card) {
    if (!rail || !card) return;
    const railRect = rail.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const top = rail.scrollLeft + (cardRect.left - railRect.left) - (rail.clientWidth - cardRect.width) / 2;
    rail.scrollTo({ left: Math.max(0, top), behavior: 'smooth' });
  }

  function focusFirstInRail(rail) {
    const first = rail.querySelector('.folder-card, .book-card');
    if (first) centerRailCard(rail, first);
  }

  function scrollShelfIntoView() {
    if (!els.bookShelf) return;
    const rect = els.bookShelf.getBoundingClientRect();
    const topbar = document.querySelector('.topbar').getBoundingClientRect().height;
    const isMobile = window.innerWidth <= 760;
    if (isMobile || rect.top < topbar + 4 || rect.bottom > window.innerHeight - 18) {
      els.bookShelf.scrollIntoView({ behavior: 'smooth', block: isMobile ? 'start' : 'nearest' });
    }
  }

  function handleSearchInput() {
    const value = els.bookSearch.value;
    ui.search = value;
    ui.searchResultCount = 0;
    els.searchClear.hidden = !value;
    els.libraryView.classList.toggle('is-searching', Boolean(value.trim()));

    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      renderBookRail({ animate: true, focusFirst: Boolean(ui.search.trim()) });
      updateSearchUi();
    }, value ? 90 : 0);
  }

  function clearSearch(options) {
    const opts = options || {};
    ui.search = '';
    els.bookSearch.value = '';
    els.searchClear.hidden = true;
    els.libraryView.classList.remove('is-searching');
    renderBookRail({ animate: true, focusFirst: false });
    if (opts.focus !== false) els.bookSearch.focus();
  }

  /* =====================================================
     新建文件夹 / 单词本
     ===================================================== */

  function resetFieldErrors(form) {
    form.querySelectorAll('.field.has-error').forEach(function (field) {
      field.classList.remove('has-error');
    });
    form.querySelectorAll('.field-error').forEach(function (error) {
      error.textContent = '';
    });
  }

  function setFieldError(input, message) {
    if (!input) return;
    const field = input.closest('.field');
    if (!field) return;
    field.classList.add('has-error');
    const error = field.querySelector('.field-error');
    if (error) error.textContent = message;
    input.focus();
  }

  function openFolderDialog() {
    els.folderForm.reset();
    resetFieldErrors(els.folderForm);
    openDialog(els.folderDialog);
    window.setTimeout(function () { els.folderName.focus(); }, 80);
    Lexicon.Audio && Lexicon.Audio.playSelect();
  }

  function openBookDialog() {
    const folders = Store.getFolders();
    if (!folders.length) {
      showToast('请先创建一个文件夹。');
      openFolderDialog();
      return;
    }

    els.bookForm.reset();
    resetFieldErrors(els.bookForm);
    els.bookFolder.innerHTML = folders.map(function (folder) {
      return '<option value="' + escapeAttr(folder.id) + '">' + escapeHtml(folder.name) + '</option>';
    }).join('');
    els.bookFolder.value = ui.activeFolderId || folders[0].id;
    openDialog(els.bookDialog);
    window.setTimeout(function () { els.bookName.focus(); }, 80);
    Lexicon.Audio && Lexicon.Audio.playSelect();
  }

  function handleFolderSubmit(event) {
    event.preventDefault();
    resetFieldErrors(els.folderForm);
    const name = els.folderName.value.trim();
    if (!name) {
      setFieldError(els.folderName, '请填写文件夹名称。');
      return;
    }

    const result = Store.createFolder({
      name,
      subtitle: els.folderSubtitle.value.trim(),
      description: els.folderDescription.value.trim()
    });
    if (!result.ok) {
      setFieldError(els.folderName, result.message);
      return;
    }

    closeDialog(els.folderDialog);
    ui.search = '';
    els.bookSearch.value = '';
    ui.activeFolderId = result.folder.id;
    renderLibrary({ animate: true });
    window.requestAnimationFrame(function () {
      const card = els.folderRail.querySelector('[data-folder-id="' + cssEscape(result.folder.id) + '"]');
      if (card) centerRailCard(els.folderRail, card);
    });
    showToast('文件夹已创建 · ' + result.folder.name);
    Lexicon.Audio && Lexicon.Audio.playOpen();
  }

  function handleBookSubmit(event) {
    event.preventDefault();
    resetFieldErrors(els.bookForm);
    const name = els.bookName.value.trim();
    const folderId = els.bookFolder.value;
    if (!name) {
      setFieldError(els.bookName, '请填写单词本名称。');
      return;
    }
    if (!folderId) {
      showToast('请选择要放入的文件夹。', 'error');
      return;
    }

    const result = Store.createBook({
      name,
      folderId,
      subtitle: els.bookSubtitle.value.trim(),
      description: els.bookDescription.value.trim()
    });
    if (!result.ok) {
      setFieldError(els.bookName, result.message);
      return;
    }

    closeDialog(els.bookDialog);
    ui.search = '';
    els.bookSearch.value = '';
    ui.activeFolderId = folderId;
    renderLibrary({ animate: true });
    showToast('单词本已创建 · ' + result.book.name);
    Lexicon.Audio && Lexicon.Audio.playOpen();
    window.setTimeout(function () { openBook(result.book.id); }, 260);
  }

  /* =====================================================
     词条新增
     ===================================================== */

  function openEntryDialog(bookId) {
    const book = Store.getBook(bookId);
    if (!book) {
      showToast('单词本不存在了。', 'error');
      return;
    }
    ui.entryBookId = bookId;
    els.entryForm.reset();
    resetFieldErrors(els.entryForm);
    els.entryBookLabel.textContent = '收入《' + book.name + '》';
    openDialog(els.entryDialog);
    window.setTimeout(function () { els.entryWord.focus(); }, 80);
    Lexicon.Audio && Lexicon.Audio.playSelect();
  }

  function handleEntrySubmit(event) {
    event.preventDefault();
    const book = Store.getBook(ui.entryBookId);
    if (!book) {
      closeDialog(els.entryDialog);
      showToast('单词本不存在了。', 'error');
      return;
    }

    resetFieldErrors(els.entryForm);
    const data = new FormData(els.entryForm);
    const values = {
      word: String(data.get('word') || '').trim().replace(/\s+/g, ' '),
      phonetic: String(data.get('phonetic') || '').trim(),
      pos: String(data.get('pos') || '').trim(),
      meaning: String(data.get('meaning') || '').trim(),
      sentence: String(data.get('sentence') || '').trim(),
      translation: String(data.get('translation') || '').trim(),
      source: String(data.get('source') || '').trim() || 'PRIVATE NOTEBOOK · 自建词条'
    };

    if (!values.word) {
      setFieldError(els.entryForm.elements.namedItem('word'), '请填写单词。');
      return;
    }
    if (!values.meaning) {
      setFieldError(els.entryForm.elements.namedItem('meaning'), '请补上这个单词的释义。');
      return;
    }
    if (!values.sentence) {
      setFieldError(els.entryForm.elements.namedItem('sentence'), '写一句帮助记忆的例句吧。');
      return;
    }

    const result = Store.addWord(book.id, values);
    if (!result.ok) {
      if (result.message && result.message.indexOf('已经有') >= 0) {
        setFieldError(els.entryForm.elements.namedItem('word'), result.message);
      } else {
        showToast(result.message, 'error');
      }
      return;
    }

    closeDialog(els.entryDialog);
    showToast('已收入《' + book.name + '》 · ' + result.word.word, 'known');
    Lexicon.Audio && Lexicon.Audio.playOpen();

    if (els.manageDialog.open && ui.manageBookId === book.id) {
      renderManage();
    }
    refreshStudyAfterWordMutation(book.id, result.word.id);
    updateLibraryStats();
  }

  /* =====================================================
     记诵页
     ===================================================== */

  function ensureSession(book) {
    if (!ui.session || ui.session.bookId !== book.id) {
      ui.session = createSession(book.id);
      return;
    }

    const validIds = new Set(book.words.filter(function (word) {
      return word.status !== 'known';
    }).map(function (word) { return word.id; }));

    const filtered = ui.session.ids.filter(function (id) { return validIds.has(id); });
    if (filtered.length !== ui.session.ids.length) {
      const previousId = ui.session.ids[ui.session.index];
      ui.session.ids = filtered;
      const previousIndex = filtered.indexOf(previousId);
      if (previousIndex >= 0) ui.session.index = previousIndex;
      else ui.session.index = Math.min(ui.session.index, Math.max(0, filtered.length - 1));
    }

    if (!ui.session.ids.length && book.words.some(function (word) { return word.status !== 'known'; })) {
      ui.session = createSession(book.id);
    }
  }

  function updateStudyHeader(book) {
    const folder = Store.getFolder(book.folderId);
    els.studyKicker.textContent = folder
      ? (folder.name + '  /  ' + (folder.subtitle || 'FOLDER'))
      : 'WORD BOOK';
    els.studyBookTitle.textContent = book.name;
    els.studyBookDesc.textContent = book.description || '';
    updateTopbar('study', book);
  }

  function updateStudyCounts(book) {
    const counts = Store.getCounts(book);
    els.studyFuzzy.textContent = counts.fuzzy;
    els.studyUnknown.textContent = counts.unknown;
    els.studyFresh.textContent = counts.fresh;
    els.studyKnown.textContent = counts.known;
    return counts;
  }

  function showStudyEmpty(book) {
    const emptyBook = book.words.length === 0;
    ui.emptyPrimaryMode = emptyBook ? 'add' : 'manage';
    els.studyContent.hidden = true;
    els.studyConsole.hidden = true;
    els.studyEmpty.hidden = false;

    if (emptyBook) {
      els.emptyTitle.textContent = '这本单词本还没有词条';
      els.emptyText.textContent = '把想记住的词写进这一页，然后开始第一轮记诵。已斩词条不会出现在队列中。';
      els.emptyPrimary.textContent = '添加第一个词条';
    } else {
      els.emptyTitle.textContent = '本册已斩完';
      els.emptyText.textContent = '所有词条都已被斩，不再进入复习队列。你可以打开词条册，把某个词重新放回复习，或继续添加新词。';
      els.emptyPrimary.textContent = '打开词条册';
    }

    els.emptyPrimary.blur();
    window.requestAnimationFrame(function () {
      addViewEntrance(els.studyEmpty);
    });
  }

  function renderStudy(options) {
    const opts = options || {};
    const book = Store.getBook(ui.currentBookId);
    if (!book) {
      showLibrary();
      return;
    }

    updateStudyHeader(book);
    updateStudyCounts(book);
    ensureSession(book);

    if (!ui.session || !ui.session.ids.length) {
      showStudyEmpty(book);
      return;
    }

    if (ui.session.index >= ui.session.ids.length) ui.session.index = 0;

    let current = book.words.find(function (word) {
      return word.id === ui.session.ids[ui.session.index];
    });

    if (!current) {
      ensureSession(book);
      current = book.words.find(function (word) {
        return ui.session && word.id === ui.session.ids[ui.session.index];
      });
      if (!current) {
        showStudyEmpty(book);
        return;
      }
    }

    els.studyContent.hidden = false;
    els.studyConsole.hidden = false;
    els.studyEmpty.hidden = true;
    els.studyStage.classList.remove('is-empty');

    fillStudyWord(current, opts);
    updateQueueDisplay(book, current);
  }

  function fillStudyWord(word, options) {
    els.wordEl.textContent = word.word;
    els.pos.textContent = word.pos || '';
    els.pos.hidden = !word.pos;
    els.phonetic.textContent = word.phonetic || '';
    els.phonetic.hidden = !word.phonetic;
    els.meaning.textContent = word.meaning || '';
    els.sentence.textContent = word.sentence || '';
    els.translation.textContent = word.translation || '';
    els.translation.hidden = !word.translation;
    els.source.textContent = word.source || 'PRIVATE NOTEBOOK';
    els.sourceNote.textContent = word.sourceZh || '';
    els.sourceNote.hidden = !els.sourceNote.textContent;

    const meta = STATUS_META[word.status] || STATUS_META.new;
    els.priorityTag.textContent = meta.tag;
    els.priorityTag.dataset.status = word.status;

    window.requestAnimationFrame(fitStudyWord);

    if (options && options.animate) {
      els.studyContent.classList.remove('is-entering');
      void els.studyContent.offsetWidth;
      els.studyContent.classList.add('is-entering');
      window.clearTimeout(enterTimer);
      enterTimer = window.setTimeout(function () {
        els.studyContent.classList.remove('is-entering');
      }, 900);
    } else {
      els.studyContent.classList.remove('is-entering');
    }
  }

  function updateQueueDisplay(book, currentWord) {
    const ids = ui.session.ids;
    const position = ui.session.index + 1;
    const total = ids.length;
    const percent = total ? (position / total) * 100 : 0;
    const counts = updateStudyCounts(book);

    els.studyPosition.textContent = pad2(position) + ' / ' + pad2(total);
    els.queueProgress.textContent = pad2(position) + ' / ' + pad2(total);
    els.queueBarFill.style.width = percent.toFixed(2) + '%';

    if (currentWord && currentWord.status === 'known') {
      els.priorityTag.dataset.status = 'new';
    }
  }

  function fitStudyWord() {
    if (!els || els.studyView.hidden || els.studyContent.hidden) return;
    els.wordEl.style.fontSize = '100px';
    const available = Math.min(els.studyContent.clientWidth * 0.95, 1180);
    const measured = Math.max(els.wordEl.scrollWidth, 1);
    const heightCap = window.innerHeight * (window.innerWidth <= 760 ? 0.22 : 0.235);
    let size = (available / measured) * 100;
    size = Math.min(size, heightCap, 228);
    size = Math.max(size, 14);
    els.wordEl.style.fontSize = size.toFixed(2) + 'px';
  }

  function playSlashAnimation() {
    els.wordFrame.classList.remove('is-slashed');
    void els.wordFrame.offsetWidth;
    els.wordFrame.classList.add('is-slashed');
    window.setTimeout(function () {
      els.wordFrame.classList.remove('is-slashed');
    }, 1200);
  }

  function rateCurrentWord(result) {
    if (ui.busy) return;
    if (!ui.session || els.studyContent.hidden) return;

    const book = Store.getBook(ui.currentBookId);
    const word = getCurrentStudyWord();
    if (!book || !word) return;

    ui.busy = true;
    document.body.classList.add('is-busy');

    const wasKnown = result === 'known';
    Store.setWordStatus(book.id, word.id, result);

    if (wasKnown) {
      playSlashAnimation();
      Lexicon.Audio && Lexicon.Audio.playSlash();
      showToast('已斩 · 移出复习队列', 'known');
    } else if (result === 'fuzzy') {
      Lexicon.Audio && Lexicon.Audio.playTick('fuzzy');
      showToast('已记为依稀 · 下一轮优先', 'fuzzy');
    } else {
      Lexicon.Audio && Lexicon.Audio.playTick('unknown');
      showToast('已记为未识 · 下一轮复习');
    }

    const delay = wasKnown ? 920 : 380;
    window.setTimeout(function () {
      ui.busy = false;
      document.body.classList.remove('is-busy');
      if (ui.currentBookId !== book.id || els.studyView.hidden) return;
      advanceAfterRating(book, wasKnown);
    }, delay);
  }

  function advanceAfterRating(book, wasKnown) {
    if (wasKnown) {
      const removedIndex = ui.session.index;
      ui.session.ids = ui.session.ids.filter(function (id, index) { return index !== removedIndex; });

      if (!ui.session.ids.length) {
        renderStudy({ animate: false });
        return;
      }

      if (removedIndex >= ui.session.ids.length) {
        startNewRound(book, true);
      } else {
        renderStudy({ animate: true });
      }
      return;
    }

    ui.session.index += 1;
    if (ui.session.index >= ui.session.ids.length) {
      startNewRound(book, true);
    } else {
      renderStudy({ animate: true });
    }
  }

  function startNewRound(book, notify) {
    const queue = Store.getQueue(book.id);
    ui.session = {
      bookId: book.id,
      ids: queue.map(function (word) { return word.id; }),
      index: 0,
      round: (ui.session ? ui.session.round : 0) + 1
    };

    if (notify) {
      if (ui.session.ids.length) showToast('新一轮 · 依稀优先');
      else showToast('本册已斩完');
    }

    renderStudy({ animate: true });
  }

  function getCurrentStudyWord() {
    if (!ui.session || !ui.session.ids.length) return null;
    const book = Store.getBook(ui.currentBookId);
    if (!book) return null;
    const id = ui.session.ids[ui.session.index];
    return book.words.find(function (word) { return word.id === id; }) || null;
  }

  function goToNextWord() {
    if (ui.busy || !ui.session || !ui.session.ids.length) return;
    const book = Store.getBook(ui.currentBookId);
    if (!book) return;
    ui.session.index += 1;
    if (ui.session.index >= ui.session.ids.length) {
      startNewRound(book, true);
    } else {
      renderStudy({ animate: true });
      Lexicon.Audio && Lexicon.Audio.playPage();
    }
  }

  function goToPreviousWord() {
    if (ui.busy || !ui.session || !ui.session.ids.length) return;
    ui.session.index = ui.session.index > 0 ? ui.session.index - 1 : ui.session.ids.length - 1;
    renderStudy({ animate: true });
    Lexicon.Audio && Lexicon.Audio.playPage();
  }

  function speakCurrentWord() {
    const word = getCurrentStudyWord();
    if (!word) return;
    if (!('speechSynthesis' in window)) {
      showToast('当前浏览器不支持朗读。', 'error');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = /[\u3400-\u9fff]/.test(word.word) ? 'zh-CN' : 'en-US';
      utterance.rate = 0.88;
      els.speakBtn.classList.add('is-speaking');
      utterance.onend = function () { els.speakBtn.classList.remove('is-speaking'); };
      utterance.onerror = function () { els.speakBtn.classList.remove('is-speaking'); };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      els.speakBtn.classList.remove('is-speaking');
      showToast('无法朗读这个词。', 'error');
    }
  }

  function refreshStudyAfterWordMutation(bookId, newWordId) {
    if (els.studyView.hidden || ui.currentBookId !== bookId) return;
    const book = Store.getBook(bookId);
    if (!book) return;

    if (!ui.session || ui.session.bookId !== bookId) {
      ui.session = createSession(bookId);
    } else {
      const validIds = new Set(book.words.filter(function (word) { return word.status !== 'known'; }).map(function (word) { return word.id; }));
      ui.session.ids = ui.session.ids.filter(function (id) { return validIds.has(id); });
      if (newWordId && validIds.has(newWordId) && ui.session.ids.indexOf(newWordId) < 0) {
        ui.session.ids.push(newWordId);
      }
      if (!ui.session.ids.length && book.words.some(function (word) { return word.status !== 'known'; })) {
        ui.session = createSession(bookId);
      }
      ui.session.index = Math.min(ui.session.index, Math.max(0, ui.session.ids.length - 1));
    }

    renderStudy({ animate: true });
    window.requestAnimationFrame(fitStudyWord);
  }

  /* =====================================================
     词条册
     ===================================================== */

  function openManage(bookId) {
    const book = Store.getBook(bookId);
    if (!book) {
      showToast('单词本不存在了。', 'error');
      return;
    }
    ui.manageBookId = bookId;
    ui.manageSearch = '';
    els.manageSearch.value = '';
    renderManage();
    openDialog(els.manageDialog);
    Lexicon.Audio && Lexicon.Audio.playSelect();
  }

  function renderManage() {
    const book = Store.getBook(ui.manageBookId);
    if (!book) {
      closeDialog(els.manageDialog);
      return;
    }

    const folder = Store.getFolder(book.folderId);
    const counts = Store.getCounts(book);
    const query = ui.manageSearch.trim().toLowerCase();
    const words = book.words.filter(function (word) {
      if (!query) return true;
      return [word.word, word.meaning, word.sentence].join(' ').toLowerCase().includes(query);
    });

    els.manageTitle.textContent = book.name;
    els.manageMeta.textContent = (folder ? folder.name + ' · ' : '')
      + counts.total + ' 个词条 · 依稀 ' + counts.fuzzy + ' · 未识 ' + counts.unknown + ' · 已斩 ' + counts.known;
    els.manageCount.textContent = (query ? words.length + ' / ' + counts.total : counts.total) + ' 个词条';
    els.manageAddBtn.disabled = false;

    if (!words.length) {
      els.manageList.innerHTML = `
        <div class="manage-empty">
          <span>✦</span>
          <p>${query ? '没有匹配的词条' : '这本单词本还是空的'}</p>
          <small>${query ? '试试搜索单词、释义或例句。' : '点击上方「新增词条」，写下第一个词。'}</small>
        </div>
      `;
      return;
    }

    els.manageList.innerHTML = words.map(function (word) {
      const meta = STATUS_META[word.status] || STATUS_META.new;
      const reset = word.status === 'known'
        ? '<button type="button" class="mini-action" data-action="reset-word" data-word-id="' + escapeAttr(word.id) + '" title="重新加入复习" aria-label="重新加入复习">' + ICONS.reset + '</button>'
        : '';
      return `
        <article class="manage-row">
          <div class="manage-main">
            <div class="manage-title-line">
              <span class="manage-word">${escapeHtml(word.word)}</span>
              ${word.phonetic ? '<span class="manage-phonetic">' + escapeHtml(word.phonetic) + '</span>' : ''}
              ${word.pos ? '<span class="manage-pos">' + escapeHtml(word.pos) + '</span>' : ''}
            </div>
            <p class="manage-meaning">${escapeHtml(word.meaning || '')}</p>
            ${word.sentence ? '<p class="manage-sentence">' + escapeHtml(word.sentence) + '</p>' : ''}
          </div>
          <div class="manage-side">
            <span class="status-chip ${meta.className}">${meta.label}</span>
            ${reset}
            <button type="button" class="mini-action is-delete" data-action="delete-word" data-word-id="${escapeAttr(word.id)}" title="删除词条" aria-label="删除词条 ${escapeAttr(word.word)}">${ICONS.trash}</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function handleManageAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const bookId = ui.manageBookId;
    const wordId = button.dataset.wordId;
    if (!bookId || !wordId) return;

    if (button.dataset.action === 'reset-word') {
      Store.resetWord(bookId, wordId);
      renderManage();
      refreshStudyAfterWordMutation(bookId);
      updateLibraryStats();
      showToast('词条已重新加入复习队列。');
      Lexicon.Audio && Lexicon.Audio.playSelect();
      return;
    }

    if (button.dataset.action === 'delete-word') {
      const book = Store.getBook(bookId);
      const word = book && book.words.find(function (item) { return item.id === wordId; });
      if (!book || !word) return;
      askConfirm({
        title: '删除词条',
        message: '确定从《' + book.name + '》中删除「' + word.word + '」吗？这条词条的记诵记录也会一并移除。',
        confirmLabel: '删除词条',
        onConfirm: function () {
          Store.deleteWord(bookId, wordId);
          renderManage();
          refreshAfterWordDeletion(bookId, wordId);
          updateLibraryStats();
          showToast('词条已删除 · ' + word.word);
          Lexicon.Audio && Lexicon.Audio.playPage();
        }
      });
    }
  }

  function refreshAfterWordDeletion(bookId, wordId) {
    if (ui.currentBookId !== bookId) return;
    const book = Store.getBook(bookId);
    if (!book) return;

    if (!ui.session || ui.session.bookId !== bookId) {
      ui.session = createSession(bookId);
    } else {
      const previousId = ui.session.ids[ui.session.index];
      const validIds = new Set(book.words.filter(function (word) { return word.status !== 'known'; }).map(function (word) { return word.id; }));
      ui.session.ids = ui.session.ids.filter(function (id) { return validIds.has(id); });
      if (!ui.session.ids.length && book.words.some(function (word) { return word.status !== 'known'; })) {
        ui.session = createSession(bookId);
      } else {
        const previousIndex = ui.session.ids.indexOf(previousId);
        if (previousIndex >= 0) ui.session.index = previousIndex;
        else ui.session.index = Math.min(ui.session.index, Math.max(0, ui.session.ids.length - 1));
      }
    }

    if (!els.studyView.hidden) {
      renderStudy({ animate: true });
      window.requestAnimationFrame(fitStudyWord);
    }
  }

  /* =====================================================
     记诵档案
     ===================================================== */

  function openLedger() {
    renderLedger();
    openDialog(els.ledgerDialog);
    Lexicon.Audio && Lexicon.Audio.playSelect();
  }

  function renderLedger() {
    const activity = Store.getActivity();
    const fuzzy = activity.filter(function (entry) { return entry.result === 'fuzzy'; }).length;
    const unknown = activity.filter(function (entry) { return entry.result === 'unknown'; }).length;
    const books = new Set(activity.map(function (entry) { return entry.bookId; })).size;

    els.ledgerTotal.textContent = activity.length;
    els.ledgerFuzzy.textContent = fuzzy;
    els.ledgerUnknown.textContent = unknown;
    els.ledgerBooks.textContent = books;

    if (!activity.length) {
      els.activityList.innerHTML = `
        <div class="activity-empty">
          <span>✦</span>
          <p>还没有温习记录</p>
          <small>选择「依稀」或「未识」会留下记录；「斩」会直接移出复习队列，不计入档案。</small>
        </div>
      `;
      return;
    }

    let html = '';
    let lastDay = '';
    activity.slice(0, 100).forEach(function (entry) {
      const date = new Date(entry.at);
      const day = localDateKey(date);
      if (day !== lastDay) {
        lastDay = day;
        html += '<div class="ledger-date">' + escapeHtml(formatDay(date)) + '</div>';
      }
      html += `
        <div class="activity-row">
          <time class="activity-time" datetime="${escapeAttr(entry.at)}">${escapeHtml(formatTime(entry.at))}</time>
          <div class="activity-main">
            <span class="activity-word">${escapeHtml(entry.word)}</span>
            <span class="activity-book">${escapeHtml(entry.bookName)}</span>
          </div>
          <span class="activity-pill ${entry.result === 'fuzzy' ? 'is-fuzzy' : 'is-unknown'}">${entry.result === 'fuzzy' ? '依稀' : '未识'}</span>
        </div>
      `;
    });

    els.activityList.innerHTML = html;
  }

  /* =====================================================
     删除、确认与导出
     ===================================================== */

  function askConfirm(config) {
    ui.confirmAction = config.onConfirm || null;
    els.confirmTitle.textContent = config.title || '确认操作';
    els.confirmMessage.textContent = config.message || '';
    els.confirmOk.textContent = config.confirmLabel || '确认删除';
    openDialog(els.confirmDialog);
  }

  function handleConfirmOk() {
    const action = ui.confirmAction;
    ui.confirmAction = null;
    closeDialog(els.confirmDialog);
    if (typeof action === 'function') action();
    Lexicon.Audio && Lexicon.Audio.playPage();
  }

  function deleteFolder(folderId) {
    const folder = Store.getFolder(folderId);
    if (!folder) return;
    const books = Store.getBooksInFolder(folderId);
    if (books.length) {
      showToast('这个文件夹里还有 ' + books.length + ' 本单词本，请先移走或删除单词本。', 'error');
      return;
    }

    askConfirm({
      title: '删除文件夹',
      message: '确定删除空文件夹「' + folder.name + '」吗？',
      confirmLabel: '删除文件夹',
      onConfirm: function () {
        Store.deleteFolder(folderId);
        renderLibrary({ animate: true });
        updateLibraryStats();
        showToast('文件夹已删除 · ' + folder.name);
      }
    });
  }

  function deleteBook(bookId) {
    const book = Store.getBook(bookId);
    if (!book) return;
    askConfirm({
      title: '删除单词本',
      message: '确定删除《' + book.name + '》吗？其中的 ' + book.words.length + ' 个词条和对应温习记录会一并移除。',
      confirmLabel: '删除单词本',
      onConfirm: function () {
        Store.deleteBook(bookId);
        if (ui.currentBookId === bookId) ui.currentBookId = '';
        ui.manageBookId = ui.manageBookId === bookId ? '' : ui.manageBookId;
        renderLibrary({ animate: true });
        updateLibraryStats();
        showToast('单词本已删除 · ' + book.name);
      }
    });
  }

  function exportAllData() {
    downloadJson('word-lexicon-' + localDateKey(new Date()) + '.json', Store.exportData());
    showToast('全部词库数据已导出。');
  }

  function exportManageBook() {
    const book = Store.getBook(ui.manageBookId);
    if (!book) return;
    downloadJson('word-book-' + localDateKey(new Date()) + '.json', {
      app: '词匣 · The Lexicon',
      exportedAt: new Date().toISOString(),
      folder: Store.getFolder(book.folderId),
      book
    });
    showToast('单词本已导出。');
  }

  /* =====================================================
     事件
     ===================================================== */

  function bindEvents() {
    els.brandHome.addEventListener('click', function () {
      if (els.studyView.hidden) {
        els.libraryScroll.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showLibrary({ toTop: true });
      }
    });

    els.backBtn.addEventListener('click', function () { showLibrary(); });
    els.ledgerOpen.addEventListener('click', openLedger);
    els.newFolderBtn.addEventListener('click', openFolderDialog);
    els.newBookBtn.addEventListener('click', openBookDialog);

    els.bookSearch.addEventListener('input', handleSearchInput);
    els.bookSearch.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        clearSearch();
      }
    });
    els.searchClear.addEventListener('click', function () { clearSearch(); });

    els.folderRail.addEventListener('click', handleRailClick);
    els.bookRail.addEventListener('click', handleRailClick);
    els.folderRail.addEventListener('keydown', handleRailKeydown);
    els.bookRail.addEventListener('keydown', handleRailKeydown);
    bindRailDrag(els.folderRail);
    bindRailDrag(els.bookRail);

    document.querySelectorAll('.rail-arrow').forEach(function (button) {
      button.addEventListener('click', function () {
        const rail = button.dataset.rail === 'folders' ? els.folderRail : els.bookRail;
        const direction = Number(button.dataset.direction) || 1;
        const card = rail.firstElementChild;
        const step = card ? card.getBoundingClientRect().width + 18 : 280;
        rail.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
        Lexicon.Audio && Lexicon.Audio.playSelect();
      });
    });

    els.prevBtn.addEventListener('click', goToPreviousWord);
    els.nextBtn.addEventListener('click', goToNextWord);
    els.speakBtn.addEventListener('click', speakCurrentWord);
    els.manageBookBtn.addEventListener('click', function () { openManage(ui.currentBookId); });
    els.addWordBtn.addEventListener('click', function () { openEntryDialog(ui.currentBookId); });
    els.emptyPrimary.addEventListener('click', function () {
      if (ui.emptyPrimaryMode === 'manage') openManage(ui.currentBookId);
      else openEntryDialog(ui.currentBookId);
    });
    els.emptySecondary.addEventListener('click', function () { showLibrary(); });

    document.querySelectorAll('[data-rate]').forEach(function (button) {
      button.addEventListener('click', function () { rateCurrentWord(button.dataset.rate); });
    });

    els.folderForm.addEventListener('submit', handleFolderSubmit);
    els.bookForm.addEventListener('submit', handleBookSubmit);
    els.entryForm.addEventListener('submit', handleEntrySubmit);
    [els.folderForm, els.bookForm, els.entryForm].forEach(function (form) {
      form.addEventListener('input', function (event) {
        const field = event.target.closest('.field');
        if (field) field.classList.remove('has-error');
      });
    });

    els.manageSearch.addEventListener('input', function () {
      ui.manageSearch = els.manageSearch.value;
      renderManage();
    });
    els.manageAddBtn.addEventListener('click', function () { openEntryDialog(ui.manageBookId); });
    els.manageList.addEventListener('click', handleManageAction);
    els.manageExportBtn.addEventListener('click', exportManageBook);
    els.exportBtn.addEventListener('click', exportAllData);

    els.confirmOk.addEventListener('click', handleConfirmOk);
    els.confirmCancel.addEventListener('click', function () { closeDialog(els.confirmDialog); });
    els.confirmDialog.addEventListener('close', function () { ui.confirmAction = null; });

    document.querySelectorAll('[data-close]').forEach(function (button) {
      button.addEventListener('click', function () {
        const dialog = button.closest('dialog');
        closeDialog(dialog);
      });
    });

    document.querySelectorAll('dialog').forEach(function (dialog) {
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) dialog.close();
      });
    });

    document.addEventListener('keydown', handleGlobalKeydown);
    window.addEventListener('resize', function () {
      window.clearTimeout(fitTimer);
      fitTimer = window.setTimeout(fitStudyWord, 100);
    });
  }

  function handleRailClick(event) {
    const deleteFolderButton = event.target.closest('[data-delete-folder]');
    if (deleteFolderButton) {
      event.preventDefault();
      event.stopPropagation();
      deleteFolder(deleteFolderButton.dataset.deleteFolder);
      return;
    }

    const deleteBookButton = event.target.closest('[data-delete-book]');
    if (deleteBookButton) {
      event.preventDefault();
      event.stopPropagation();
      deleteBook(deleteBookButton.dataset.deleteBook);
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      event.preventDefault();
      if (actionButton.dataset.action === 'create-folder') openFolderDialog();
      else if (actionButton.dataset.action === 'create-book') openBookDialog();
      else if (actionButton.dataset.action === 'clear-search') clearSearch();
      return;
    }

    const folderCard = event.target.closest('.folder-card');
    if (folderCard) {
      selectFolder(folderCard.dataset.folderId);
      return;
    }

    const bookCard = event.target.closest('.book-card');
    if (bookCard) {
      openBook(bookCard.dataset.bookId);
    }
  }

  function handleRailKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (target.matches('[data-delete-folder], [data-delete-book], .card-menu')) return;
    if (target.matches('.folder-card')) {
      event.preventDefault();
      selectFolder(target.dataset.folderId);
    } else if (target.matches('.book-card')) {
      event.preventDefault();
      openBook(target.dataset.bookId);
    }
  }

  function bindRailDrag(rail) {
    let down = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;
    let pointerId = null;

    rail.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if (event.target.closest('button, [data-action]')) return;
      down = true;
      moved = false;
      startX = event.clientX;
      startScroll = rail.scrollLeft;
      pointerId = event.pointerId;
    });

    rail.addEventListener('pointermove', function (event) {
      if (!down) return;
      const delta = event.clientX - startX;
      if (!moved && Math.abs(delta) > 5) {
        moved = true;
        rail.classList.add('is-dragging');
        try { rail.setPointerCapture(pointerId); } catch (error) { /* noop */ }
      }
      if (!moved) return;
      event.preventDefault();
      rail.scrollLeft = startScroll - delta;
    });

    function endDrag(event) {
      if (!down) return;
      down = false;
      rail.classList.remove('is-dragging');
      try { rail.releasePointerCapture(pointerId); } catch (error) { /* noop */ }
      pointerId = null;
      if (moved) {
        rail.dataset.suppressClick = '1';
        window.setTimeout(function () { delete rail.dataset.suppressClick; }, 30);
      }
      moved = false;
    }

    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);
    rail.addEventListener('click', function (event) {
      if (rail.dataset.suppressClick === '1') {
        event.preventDefault();
        event.stopPropagation();
        delete rail.dataset.suppressClick;
      }
    }, true);
  }

  function handleGlobalKeydown(event) {
    if (document.querySelector('dialog[open]')) return;
    if (isEditableTarget(event.target)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const libraryVisible = !els.libraryView.hidden;
    const studyVisible = !els.studyView.hidden;

    if (libraryVisible && event.key === '/') {
      event.preventDefault();
      els.bookSearch.focus();
      return;
    }

    if (!studyVisible) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNextWord();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPreviousWord();
    } else if (event.key.toLowerCase() === 'k') {
      event.preventDefault();
      rateCurrentWord('known');
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      rateCurrentWord('fuzzy');
    } else if (event.key.toLowerCase() === 'a') {
      event.preventDefault();
      rateCurrentWord('unknown');
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }

  init();
})();
