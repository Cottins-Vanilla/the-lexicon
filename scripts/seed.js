/* =========================================================
   词匣 · SEED
   内置文件夹、单词本与词条数据
   ========================================================= */

(function () {
  'use strict';

  const Lexicon = window.Lexicon = window.Lexicon || {};

  const WORDS = {
    'classic-solitude': {
      word: 'solitude',
      phonetic: '/ˈsɒlɪtjuːd/',
      pos: 'n.',
      meaning: '独处 · 孤独',
      sentence: 'I have never found a companion that was so companionable as solitude.',
      translation: '我从未找到过比独处更合意的伴侣。',
      source: 'WALDEN · HENRY DAVID THOREAU',
      sourceZh: '亨利·戴维·梭罗《瓦尔登湖》'
    },
    'classic-oblivion': {
      word: 'oblivion',
      phonetic: '/əˈblɪviən/',
      pos: 'n.',
      meaning: '遗忘 · 湮没',
      sentence: 'A library is a small rebellion against oblivion.',
      translation: '图书馆，是一场对抗遗忘的微小起义。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    },
    'classic-remembrance': {
      word: 'remembrance',
      phonetic: '/rɪˈmembrəns/',
      pos: 'n.',
      meaning: '回忆 · 纪念',
      sentence: 'Remembrance is a form of meeting.',
      translation: '回忆，是另一种相遇。',
      source: 'KAHLIL GIBRAN · SAND AND FOAM',
      sourceZh: '纪伯伦《沙与沫》'
    },
    'classic-luminous': {
      word: 'luminous',
      phonetic: '/ˈluːmɪnəs/',
      pos: 'adj.',
      meaning: '发光的 · 明亮的',
      sentence: 'She had a luminous way of looking at ordinary things.',
      translation: '她看寻常事物的方式，带着一种柔和的光。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    },
    'classic-wander': {
      word: 'wander',
      phonetic: '/ˈwɒndə(r)/',
      pos: 'v.',
      meaning: '漫游 · 徘徊',
      sentence: "I wandered lonely as a cloud that floats on high o'er vales and hills.",
      translation: '我像一朵孤云漫游，高高飘过山谷与丘陵。',
      source: 'WILLIAM WORDSWORTH · I WANDERED LONELY AS A CLOUD',
      sourceZh: '威廉·华兹华斯《水仙》'
    },
    'classic-serendipity': {
      word: 'serendipity',
      phonetic: '/ˌserənˈdɪpəti/',
      pos: 'n.',
      meaning: '机缘 · 意外之喜',
      sentence: 'Serendipity is the art of finding what you did not know to seek.',
      translation: '机缘，是找到自己未曾寻找之物的艺术。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    },
    'classic-ephemeral': {
      word: 'ephemeral',
      phonetic: '/ɪˈfemərəl/',
      pos: 'adj.',
      meaning: '短暂的 · 瞬息的',
      sentence: 'Fame is ephemeral; a quiet afternoon is not.',
      translation: '声名转瞬即逝，而一个安静的午后不是。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    },
    'classic-tender': {
      word: 'tender',
      phonetic: '/ˈtendə(r)/',
      pos: 'adj.',
      meaning: '温柔的 · 柔软的',
      sentence: 'Already with thee! tender is the night.',
      translation: '已与你同在！夜色如此温柔。',
      source: 'JOHN KEATS · ODE TO A NIGHTINGALE',
      sourceZh: '约翰·济慈《夜莺颂》'
    },
    'classic-halcyon': {
      word: 'halcyon',
      phonetic: '/ˈhælsiən/',
      pos: 'adj.',
      meaning: '宁静美好的 · 太平的',
      sentence: 'We keep the halcyon days folded between these pages.',
      translation: '我们把那些宁静的日子，折存在这些书页之间。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    },
    'classic-splendor': {
      word: 'splendor',
      phonetic: '/ˈsplendə(r)/',
      pos: 'n.',
      meaning: '光辉 · 壮丽',
      sentence: 'The splendor falls on castle walls and snowy summits old in story.',
      translation: '光辉洒落城墙，也照亮故事里古老的雪峰。',
      source: 'ALFRED, LORD TENNYSON · THE SPLENDOR FALLS',
      sourceZh: '丁尼生《公主》'
    },
    'extra-petrichor': {
      word: 'petrichor',
      phonetic: '/ˈpetrɪkɔː(r)/',
      pos: 'n.',
      meaning: '雨后泥土的芬芳',
      sentence: 'The petrichor rose from the pavement after the summer rain.',
      translation: '夏雨过后，人行道上浮起泥土的芬芳。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    },
    'extra-susurrus': {
      word: 'susurrus',
      phonetic: '/suːˈsʌrəs/',
      pos: 'n.',
      meaning: '窸窣声 · 低语',
      sentence: 'A susurrus of leaves followed us through the empty street.',
      translation: '树叶的窸窣声跟着我们穿过空荡的街道。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    },
    'extra-gloaming': {
      word: 'gloaming',
      phonetic: '/ˈɡləʊmɪŋ/',
      pos: 'n.',
      meaning: '黄昏 · 暮色',
      sentence: 'In the gloaming, the city looked like a memory of itself.',
      translation: '暮色里，整座城市像一段关于自己的回忆。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    },
    'extra-vestige': {
      word: 'vestige',
      phonetic: '/ˈvestɪdʒ/',
      pos: 'n.',
      meaning: '遗迹 · 残余',
      sentence: 'Only a vestige of the old garden remained behind the wall.',
      translation: '墙后只剩下旧日花园的一点点遗迹。',
      source: 'THE WORD ARCHIVE · PRIVATE NOTEBOOK',
      sourceZh: '词匣手记 · 自撰例句'
    }
  };

  const FOLDER_DEFS = [
    {
      id: 'folder-time',
      name: '时序与文学',
      subtitle: 'TIME & LITERATURE',
      description: '在句子与世界之间，收藏值得反复摩挲的词。'
    },
    {
      id: 'folder-night',
      name: '夜航手记',
      subtitle: 'NOCTURNAL NOTES',
      description: '夜晚读到的词，像落在纸上的星屑。'
    },
    {
      id: 'folder-private',
      name: '私人词匣',
      subtitle: 'PRIVATE COLLECTION',
      description: '只属于自己的词与句子。'
    }
  ];

  const BOOK_DEFS = [
    {
      id: 'book-solitude',
      folderId: 'folder-time',
      name: '孤独的星图',
      subtitle: 'A MAP OF SOLITUDE',
      description: '关于独处、遗忘与微光的四个坐标。',
      wordIds: ['classic-solitude', 'classic-oblivion', 'classic-remembrance', 'classic-luminous']
    },
    {
      id: 'book-wanderer',
      folderId: 'folder-time',
      name: '漫游者手记',
      subtitle: 'THE WANDERER',
      description: '写给漫游、短暂与偶然相遇的词。',
      wordIds: ['classic-wander', 'classic-serendipity', 'classic-ephemeral']
    },
    {
      id: 'book-nightfall',
      folderId: 'folder-night',
      name: '夜色温柔',
      subtitle: 'TENDER IS THE NIGHT',
      description: '夜色、辉光与旧日安宁。',
      wordIds: ['classic-tender', 'classic-halcyon', 'classic-splendor']
    },
    {
      id: 'book-rain',
      folderId: 'folder-night',
      name: '雨的触感',
      subtitle: 'AFTER THE RAIN',
      description: '雨后空气、黄昏和一点正在消失的痕迹。',
      wordIds: ['extra-petrichor', 'extra-susurrus', 'extra-gloaming', 'extra-vestige']
    },
    {
      id: 'book-private',
      folderId: 'folder-private',
      name: '我的词条',
      subtitle: 'MY OWN WORDS',
      description: '把遇见的好词，收进自己的词匣。',
      wordIds: []
    }
  ];

  function createState() {
    const createdAt = '2026-11-01T20:00:00.000Z';

    return {
      version: 3,
      folders: FOLDER_DEFS.map((folder) => Object.assign({}, folder, { createdAt })),
      books: BOOK_DEFS.map((book) => ({
        id: book.id,
        folderId: book.folderId,
        name: book.name,
        subtitle: book.subtitle,
        description: book.description,
        createdAt,
        updatedAt: createdAt,
        lastOpenedAt: null,
        words: book.wordIds.map((wordId) => Object.assign({}, WORDS[wordId], {
          id: wordId,
          status: 'new',
          lastReviewedAt: null,
          createdAt
        }))
      })),
      activity: [],
      ui: {
        activeFolderId: 'folder-time',
        lastOpenedBookId: ''
      }
    };
  }

  Lexicon.Seed = {
    version: 3,
    create: createState
  };
})();
