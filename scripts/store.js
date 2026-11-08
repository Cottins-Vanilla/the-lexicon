/* =========================================================
   词匣 · STORE
   词库数据、持久化、排队规则与增删改查
   ========================================================= */

(function () {
  'use strict';

  const Lexicon = window.Lexicon = window.Lexicon || {};

  const STORAGE_KEY = 'word-lexicon-v3';
  const LEGACY_KEY = 'word-lexicon-v1';
  const MAX_ACTIVITY = 800;
  const VALID_STATUS = ['new', 'fuzzy', 'unknown', 'known'];
  const QUEUE_RANK = { fuzzy: 0, unknown: 1, new: 2 };

  let state = null;
  let storageError = false;

  function text(value, maxLength, fallback) {
    const cleaned = String(value == null ? '' : value).trim();
    return (cleaned || fallback || '').slice(0, maxLength);
  }

  function iso(value) {
    if (typeof value !== 'string') return null;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
  }

  function newId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function readStorage(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageError = false;
      return true;
    } catch (error) {
      storageError = true;
      return false;
    }
  }

  function normalizeWord(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const word = text(raw.word, 64);
    if (!word) return null;
    const status = VALID_STATUS.includes(raw.status) ? raw.status : 'new';
    return {
      id: text(raw.id, 100, 'word-' + index + '-' + Math.random().toString(36).slice(2, 7)),
      word,
      phonetic: text(raw.phonetic, 80),
      pos: text(raw.pos, 16),
      meaning: text(raw.meaning, 120),
      sentence: text(raw.sentence, 600),
      translation: text(raw.translation, 400),
      source: text(raw.source, 160),
      sourceZh: text(raw.sourceZh, 160),
      status,
      lastReviewedAt: iso(raw.lastReviewedAt),
      createdAt: iso(raw.createdAt) || new Date().toISOString()
    };
  }

  function normalizeBook(raw, index, folderIds) {
    if (!raw || typeof raw !== 'object') return null;
    const folderId = folderIds.has(raw.folderId) ? raw.folderId : Array.from(folderIds)[0];
    if (!folderId) return null;
    return {
      id: text(raw.id, 100, 'book-' + index + '-' + Math.random().toString(36).slice(2, 7)),
      folderId,
      name: text(raw.name, 40, '未命名单词本'),
      subtitle: text(raw.subtitle, 80).toUpperCase(),
      description: text(raw.description, 160),
      createdAt: iso(raw.createdAt) || new Date().toISOString(),
      updatedAt: iso(raw.updatedAt) || new Date().toISOString(),
      lastOpenedAt: iso(raw.lastOpenedAt),
      words: Array.isArray(raw.words)
        ? raw.words.map(normalizeWord).filter(Boolean).slice(0, 1000)
        : []
    };
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const folders = Array.isArray(raw.folders)
      ? raw.folders.filter((folder) => folder && typeof folder === 'object').map((folder, index) => ({
          id: text(folder.id, 100, 'folder-' + index + '-' + Math.random().toString(36).slice(2, 7)),
          name: text(folder.name, 40, '未命名文件夹'),
          subtitle: text(folder.subtitle, 80).toUpperCase(),
          description: text(folder.description, 160),
          createdAt: iso(folder.createdAt) || new Date().toISOString()
        }))
      : [];

    const folderIds = new Set(folders.map((folder) => folder.id));
    const books = Array.isArray(raw.books)
      ? raw.books.map((book, index) => normalizeBook(book, index, folderIds)).filter(Boolean)
      : [];

    const activities = Array.isArray(raw.activity)
      ? raw.activity
          .filter((entry) => entry && typeof entry === 'object' && ['fuzzy', 'unknown'].includes(entry.result))
          .map((entry, index) => ({
            id: text(entry.id, 100, 'activity-' + index + '-' + Math.random().toString(36).slice(2, 7)),
            bookId: text(entry.bookId, 100),
            bookName: text(entry.bookName, 60),
            wordId: text(entry.wordId, 100),
            word: text(entry.word, 64),
            result: entry.result,
            at: iso(entry.at) || new Date().toISOString()
          }))
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, MAX_ACTIVITY)
      : [];

    const ui = raw.ui && typeof raw.ui === 'object' ? raw.ui : {};
    const activeFolderId = folderIds.has(ui.activeFolderId) ? ui.activeFolderId : (folders[0] ? folders[0].id : '');
    const bookIds = new Set(books.map((book) => book.id));
    const lastOpenedBookId = bookIds.has(ui.lastOpenedBookId) ? ui.lastOpenedBookId : '';

    return {
      version: 3,
      folders,
      books,
      activity: activities,
      ui: { activeFolderId, lastOpenedBookId }
    };
  }

  function migrateLegacy(legacy) {
    if (!legacy || typeof legacy !== 'object') return;

    const privateBook = state.books.find((book) => book.id === 'book-private');
    const allWords = state.books.flatMap((book) => book.words.map((word) => ({ book, word })));

    if (Array.isArray(legacy.customWords) && privateBook) {
      const existingWords = new Set(privateBook.words.map((word) => word.word.toLowerCase()));
      legacy.customWords.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        const wordText = text(item.word, 64);
        if (!wordText || existingWords.has(wordText.toLowerCase())) return;
        const status = VALID_STATUS.includes(legacy.mastery && legacy.mastery[item.id]) ? legacy.mastery[item.id] : 'new';
        const word = normalizeWord(Object.assign({}, item, {
          id: text(item.id, 100, 'legacy-' + index),
          status,
          createdAt: item.createdAt,
          lastReviewedAt: null
        }), index);
        if (!word) return;
        privateBook.words.push(word);
        existingWords.add(word.word.toLowerCase());
        allWords.push({ book: privateBook, word });
      });
    }

    state.books.forEach((book) => {
      book.words.forEach((word) => {
        const legacyStatus = legacy.mastery && legacy.mastery[word.id];
        if (['fuzzy', 'unknown', 'known'].includes(legacyStatus)) {
          word.status = legacyStatus;
        }
      });
    });

    if (Array.isArray(legacy.records)) {
      const migratedActivity = [];
      legacy.records.forEach((record) => {
        if (!record || !['fuzzy', 'unknown'].includes(record.result)) return;
        const match = allWords.find((item) => item.word.id === record.wordId || item.word.word === record.word);
        if (!match) return;
        migratedActivity.push({
          id: text(record.id, 100, newId('legacy-activity')),
          bookId: match.book.id,
          bookName: match.book.name,
          wordId: match.word.id,
          word: match.word.word,
          result: record.result,
          at: iso(record.at) || new Date().toISOString()
        });
      });
      migratedActivity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      state.activity = migratedActivity.slice(0, MAX_ACTIVITY);
    }
  }

  function ensureState() {
    if (state) return state;

    const stored = readStorage(STORAGE_KEY);
    if (stored) {
      state = normalize(stored) || Lexicon.Seed.create();
    } else {
      state = Lexicon.Seed.create();
      const legacy = readStorage(LEGACY_KEY);
      if (legacy) migrateLegacy(legacy);
      save();
    }

    return state;
  }

  function getState() {
    return ensureState();
  }

  function getFolders() {
    return ensureState().folders;
  }

  function getBooks() {
    return ensureState().books;
  }

  function getFolder(folderId) {
    return ensureState().folders.find((folder) => folder.id === folderId) || null;
  }

  function getBook(bookId) {
    return ensureState().books.find((book) => book.id === bookId) || null;
  }

  function getBooksInFolder(folderId) {
    return ensureState().books.filter((book) => book.folderId === folderId);
  }

  function getActiveFolderId() {
    return ensureState().ui.activeFolderId;
  }

  function setActiveFolder(folderId) {
    const s = ensureState();
    if (!s.folders.some((folder) => folder.id === folderId)) return false;
    s.ui.activeFolderId = folderId;
    save();
    return true;
  }

  function getLastOpenedBookId() {
    return ensureState().ui.lastOpenedBookId;
  }

  function rememberOpenedBook(bookId) {
    const s = ensureState();
    const book = getBook(bookId);
    if (!book) return;
    const now = new Date().toISOString();
    book.lastOpenedAt = now;
    book.updatedAt = now;
    s.ui.lastOpenedBookId = bookId;
    save();
  }

  function createFolder(data) {
    const s = ensureState();
    const name = text(data && data.name, 40);
    if (!name) return { ok: false, message: '请填写文件夹名称。' };

    const folder = {
      id: newId('folder'),
      name,
      subtitle: text(data.subtitle, 80).toUpperCase(),
      description: text(data.description, 160),
      createdAt: new Date().toISOString()
    };
    s.folders.push(folder);
    s.ui.activeFolderId = folder.id;
    save();
    return { ok: true, folder };
  }

  function deleteFolder(folderId) {
    const s = ensureState();
    const folder = getFolder(folderId);
    if (!folder) return { ok: false, message: '文件夹不存在。' };
    const count = s.books.filter((book) => book.folderId === folderId).length;
    if (count > 0) {
      return { ok: false, message: '这个文件夹里还有 ' + count + ' 本单词本，请先移走或删除单词本。' };
    }

    s.folders = s.folders.filter((item) => item.id !== folderId);
    if (s.ui.activeFolderId === folderId) {
      s.ui.activeFolderId = s.folders[0] ? s.folders[0].id : '';
    }
    save();
    return { ok: true };
  }

  function createBook(data) {
    const s = ensureState();
    const folderId = data && data.folderId;
    const folder = getFolder(folderId);
    if (!folder) return { ok: false, message: '请选择一个文件夹。' };

    const name = text(data.name, 40);
    if (!name) return { ok: false, message: '请填写单词本名称。' };

    const now = new Date().toISOString();
    const book = {
      id: newId('book'),
      folderId,
      name,
      subtitle: text(data.subtitle, 80).toUpperCase(),
      description: text(data.description, 160),
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      words: []
    };
    s.books.push(book);
    s.ui.activeFolderId = folderId;
    save();
    return { ok: true, book };
  }

  function deleteBook(bookId) {
    const s = ensureState();
    const book = getBook(bookId);
    if (!book) return { ok: false, message: '单词本不存在。' };
    s.books = s.books.filter((item) => item.id !== bookId);
    s.activity = s.activity.filter((entry) => entry.bookId !== bookId);
    if (s.ui.lastOpenedBookId === bookId) s.ui.lastOpenedBookId = '';
    save();
    return { ok: true, book };
  }

  function addWord(bookId, data) {
    const s = ensureState();
    const book = getBook(bookId);
    if (!book) return { ok: false, message: '单词本不存在。' };

    const wordText = text(data && data.word, 64);
    if (!wordText) return { ok: false, message: '请填写单词。' };
    const duplicate = book.words.some((word) => word.word.toLowerCase() === wordText.toLowerCase());
    if (duplicate) return { ok: false, message: '这本单词本里已经有这个词了。' };

    const word = normalizeWord({
      id: newId('word'),
      word: wordText,
      phonetic: data.phonetic,
      pos: data.pos,
      meaning: data.meaning,
      sentence: data.sentence,
      translation: data.translation,
      source: data.source,
      sourceZh: data.sourceZh,
      status: 'new',
      createdAt: new Date().toISOString()
    }, book.words.length);
    if (!word) return { ok: false, message: '词条内容不完整。' };

    book.words.push(word);
    book.updatedAt = new Date().toISOString();
    save();
    return { ok: true, word };
  }

  function updateWord(bookId, wordId, data) {
    const s = ensureState();
    const book = getBook(bookId);
    if (!book) return { ok: false, message: '单词本不存在。' };
    const index = book.words.findIndex((item) => item.id === wordId);
    if (index < 0) return { ok: false, message: '词条不存在。' };

    const wordText = text(data && data.word, 64);
    if (!wordText) return { ok: false, message: '请填写单词。' };
    const duplicate = book.words.some((item) => item.id !== wordId && item.word.toLowerCase() === wordText.toLowerCase());
    if (duplicate) return { ok: false, message: '这本单词本里已经有这个词了。' };

    const current = book.words[index];
    const updated = normalizeWord({
      ...current,
      word: wordText,
      phonetic: data.phonetic,
      pos: data.pos,
      meaning: data.meaning,
      sentence: data.sentence,
      translation: data.translation,
      source: data.source,
      sourceZh: data.sourceZh !== undefined ? data.sourceZh : current.sourceZh
    }, index);
    if (!updated) return { ok: false, message: '词条内容不完整。' };

    const now = new Date().toISOString();
    book.words[index] = updated;
    book.updatedAt = now;
    s.activity.forEach((entry) => {
      if (entry.bookId === book.id && entry.wordId === updated.id) entry.word = updated.word;
    });
    save();
    return { ok: true, word: updated };
  }

  function deleteWord(bookId, wordId) {
    const s = ensureState();
    const book = getBook(bookId);
    if (!book) return { ok: false, message: '单词本不存在。' };
    const word = book.words.find((item) => item.id === wordId);
    if (!word) return { ok: false, message: '词条不存在。' };

    book.words = book.words.filter((item) => item.id !== wordId);
    book.updatedAt = new Date().toISOString();
    s.activity = s.activity.filter((entry) => entry.wordId !== wordId);
    save();
    return { ok: true, word };
  }

  function setWordStatus(bookId, wordId, status) {
    const s = ensureState();
    if (!['fuzzy', 'unknown', 'known', 'new'].includes(status)) return null;
    const book = getBook(bookId);
    if (!book) return null;
    const word = book.words.find((item) => item.id === wordId);
    if (!word) return null;

    const now = new Date().toISOString();
    word.status = status;
    word.lastReviewedAt = status === 'new' ? null : now;
    book.updatedAt = now;

    // 规则：已斩词条移出复习队列，也不写入记诵记录。
    if (status === 'fuzzy' || status === 'unknown') {
      s.activity.unshift({
        id: newId('activity'),
        bookId: book.id,
        bookName: book.name,
        wordId: word.id,
        word: word.word,
        result: status,
        at: now
      });
      if (s.activity.length > MAX_ACTIVITY) s.activity.length = MAX_ACTIVITY;
    }

    save();
    return word;
  }

  function resetWord(bookId, wordId) {
    const book = getBook(bookId);
    if (!book) return false;
    const word = book.words.find((item) => item.id === wordId);
    if (!word) return false;
    const now = new Date().toISOString();
    word.status = 'new';
    word.lastReviewedAt = null;
    book.updatedAt = now;
    save();
    return true;
  }

  function getQueue(bookId) {
    const book = getBook(bookId);
    if (!book) return [];

    return book.words
      .filter((word) => word.status !== 'known')
      .map((word, index) => ({ word, index }))
      .sort((left, right) => {
        const rankDelta = QUEUE_RANK[left.word.status] - QUEUE_RANK[right.word.status];
        if (rankDelta !== 0) return rankDelta;

        const leftReviewed = left.word.lastReviewedAt ? new Date(left.word.lastReviewedAt).getTime() : 0;
        const rightReviewed = right.word.lastReviewedAt ? new Date(right.word.lastReviewedAt).getTime() : 0;
        if (leftReviewed !== rightReviewed) return leftReviewed - rightReviewed;
        return left.index - right.index;
      })
      .map((item) => item.word);
  }

  function getCounts(book) {
    const current = book || {};
    const words = Array.isArray(current.words) ? current.words : [];
    return {
      total: words.length,
      known: words.filter((word) => word.status === 'known').length,
      fuzzy: words.filter((word) => word.status === 'fuzzy').length,
      unknown: words.filter((word) => word.status === 'unknown').length,
      fresh: words.filter((word) => word.status === 'new').length,
      remaining: words.filter((word) => word.status !== 'known').length
    };
  }

  function searchBooks(query) {
    const search = text(query, 80).toLowerCase();
    const s = ensureState();
    if (!search) return s.books.slice();

    return s.books.filter((book) => {
      const folder = getFolder(book.folderId);
      const haystack = [
        book.name,
        book.subtitle,
        book.description,
        folder ? folder.name : '',
        folder ? folder.subtitle : ''
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }

  function getActivity() {
    return ensureState().activity.slice();
  }

  function getLibraryStats() {
    const s = ensureState();
    const allWords = s.books.reduce((total, book) => total + book.words.length, 0);
    const knownWords = s.books.reduce((total, book) => (
      total + book.words.filter((word) => word.status === 'known').length
    ), 0);
    return {
      folders: s.folders.length,
      books: s.books.length,
      words: allWords,
      known: knownWords,
      activity: s.activity.length
    };
  }

  function exportData() {
    return {
      app: '词匣 · The Lexicon',
      version: 3,
      exportedAt: new Date().toISOString(),
      folders: ensureState().folders,
      books: ensureState().books,
      activity: ensureState().activity
    };
  }

  function getStorageError() {
    return storageError;
  }

  Lexicon.Store = {
    getState,
    getFolders,
    getBooks,
    getFolder,
    getBook,
    getBooksInFolder,
    getActiveFolderId,
    setActiveFolder,
    getLastOpenedBookId,
    rememberOpenedBook,
    createFolder,
    deleteFolder,
    createBook,
    deleteBook,
    addWord,
    updateWord,
    deleteWord,
    setWordStatus,
    resetWord,
    getQueue,
    getCounts,
    searchBooks,
    getActivity,
    getLibraryStats,
    exportData,
    getStorageError
  };
})();
