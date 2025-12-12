let tg = null;
try {
  if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }
} catch (e) {
  console.warn('Telegram WebApp not available');
}

const el = (id) => document.getElementById(id);

const $home = el('home');
const $card = el('card');
const $list = el('list');
const $btnHistory = el('btn-history');
const $btnFavTop = el('btn-fav');
const $btnFavHome = el('btn-fav-home');
const $btnOpenFav = el('btn-open-fav');

const $btnDraw = el('btn-draw');            // Ангельские послания (фиолет)
const $btnPractice = el('btn-practice');    // Ангельская практика (жёлтая)
const $btnAgain = el('btn-again');
const $btnShare = el('btn-share');
const $btnBackMain = el('btn-back-main');   // Новая кнопка "Назад" в карточке

const $btnBack = el('btn-back');
const $btnClear = el('btn-clear');

const $img = el('card-img');
const $ttl = el('card-title');
const $msg = el('card-msg');

const $listTitle = el('list-title');
const $listWrap = el('list-wrap');

const $btnGuide = el('btn-guide');
const $btnHelp = el('btn-help');

const $modalGuide = el('modal-guide');
const $about = el('about-modal');

const $btnCloseGuide = el('btn-close-guide');
const $btnAbout = el('btn-about');
const $btnCloseAbout = el('btn-close-about');

const itemTpl = el('item-tpl');

let DECK = [];
let LAST_CARD = null;
let CURRENT_VIEW = 'home';

const S = {
  kHistory: 'cards_history_v1',
  kFav: 'cards_fav_v1',

  read(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  },

  write(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  },

  pushHistory(item) {
    const list = this.read(this.kHistory);
    list.unshift(item);
    this.write(this.kHistory, list.slice(0, 200));
  },

  pushFav(item) {
    const list = this.read(this.kFav);
    if (!list.find(x => x.id === item.id)) {
      list.unshift(item);
      this.write(this.kFav, list.slice(0, 200));
    }
  },

  removeFav(id) {
    const list = this.read(this.kFav).filter(x => x.id !== id);
    this.write(this.kFav, list);
  },

  clearHistory() {
    this.write(this.kHistory, []);
  }
};

function show(view) {
  CURRENT_VIEW = view;
  $home.classList.add('hidden');
  $card.classList.add('hidden');
  $list.classList.add('hidden');
  if (view === 'home') $home.classList.remove('hidden');
  if (view === 'card') $card.classList.remove('hidden');
  if (view === 'list') $list.classList.remove('hidden');
}
function pickRandom(exceptId) {
  if (!DECK.length) return null;
  let card;
  do {
    card = DECK[Math.floor(Math.random() * DECK.length)];
  } while (DECK.length > 1 && card.id === exceptId);
  return card;
}
function renderCard(card, save = true) {
  LAST_CARD = card;
  $img.src = card.image;
  $img.alt = card.title;
  $ttl.textContent = card.title;
  $msg.textContent = card.message;
  if (save) {
    S.pushHistory({
      id: card.id,
      title: card.title,
      image: card.image,
      ts: Date.now()
    });
  }
  show('card');
}
function renderList(kind) {
  $listWrap.innerHTML = '';
  const data = S.read(kind === 'fav' ? S.kFav : S.kHistory);
  $listTitle.textContent = kind === 'fav' ? 'Избранное' : 'История';

  data.forEach(it => {
    const node = itemTpl.content.cloneNode(true);
    const root = node.querySelector('.item');
    root.onclick = () => {
      const card = DECK.find(c => String(c.id) === String(it.id));
      if (card) renderCard(card, false);
    };
    node.querySelector('.thumb').src = it.image;
    node.querySelector('.ttl').textContent = it.title;
    const delBtn = node.querySelector('.del');
    if (delBtn) {
      delBtn.classList.toggle('hidden', kind !== 'fav');
      delBtn.onclick = (e) => {
        e.stopPropagation();
        S.removeFav(it.id);
        renderList('fav');
      };
    }
    $listWrap.appendChild(node);
  });

  show('list');
}

// === Главная кнопка "Ангельская практика" ===
$btnPractice.onclick = () => {
  const url = 'https://t.me/Tesei_Angels_bot?start=angely';
  if (tg && typeof tg.openTelegramLink === 'function') {
    tg.openTelegramLink(url);
    tg.close();
    return;
  }
  window.location.href = url;
};

// === Главная кнопка "Ангельские послания" ===
$btnDraw.onclick = () => {
  const card = pickRandom(LAST_CARD && LAST_CARD.id);
  if (card) renderCard(card);
};
$btnAgain.onclick = $btnDraw.onclick;

// === Избранное и история ===
$btnFavTop.onclick = () => {
  if (CURRENT_VIEW === 'card' && LAST_CARD) {
    S.pushFav({ ...LAST_CARD, ts: Date.now() });
  } else {
    renderList('fav');
  }
};
$btnFavHome.onclick = () => renderList('fav');
$btnOpenFav.onclick = () => renderList('fav');
$btnHistory.onclick = () => renderList('history');

// === Новая кнопка "Назад" на карточке ===
$btnBackMain.onclick = () => show('home');

// === Поделиться ===
$btnShare.onclick = () => {
  if (!LAST_CARD) return;
  const text = `${LAST_CARD.title}\n\n${LAST_CARD.message}`;
  if (navigator.share) {
    navigator.share({ text });
  } else {
    navigator.clipboard.writeText(text);
    alert('Послание скопировано');
  }
};

$btnBack.onclick = () => show('home');
if ($btnClear) {
  $btnClear.onclick = () => {
    S.clearHistory();
    renderList('history');
  };
}

$btnGuide.onclick = () => $modalGuide.classList.remove('hidden');
$btnHelp.onclick = () => $about.classList.remove('hidden');
$btnCloseGuide.onclick = () => $modalGuide.classList.add('hidden');
$btnCloseAbout.onclick = () => $about.classList.add('hidden');
$btnAbout.onclick = () => $about.classList.remove('hidden');

(async function boot() {
  try {
    const res = await fetch('./deck.json?' + Date.now());
    DECK = await res.json();
  } catch (e) {
    console.error(e);
    alert('Не удалось загрузить колоду');
  }
  show('home');
})();
