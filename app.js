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
const $btnDraw = el('btn-draw');          
const $btnPractice = el('btn-practice');  
const $btnAgain = el('btn-again');
const $btnShare = el('btn-share');
const $btnBackMain = el('btn-back-main');
const $btnBack = el('btn-back');
const $btnClear = el('btn-clear');
const $btnGuide = el('btn-guide');
const $btnHelp = el('btn-help');
const $modalGuide = el('modal-guide');
const $about = el('about-modal');
const $btnCloseGuide = el('btn-close-guide');
const $btnCloseAbout = el('btn-close-about');
const $floatingAboutBtn = el('floating-about-btn');
const $img = el('card-img');
const $ttl = el('card-title');
const $msg = el('card-msg');
const $listTitle = el('list-title');
const $listWrap = el('list-wrap');
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
  // Плавающая кнопка "О проекте" видна только на главном экране
  if ($floatingAboutBtn) {
    if (view === 'home') {
      $floatingAboutBtn.classList.remove('hidden');
    } else {
      $floatingAboutBtn.classList.add('hidden');
    }
  }
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

$btnPractice.onclick = () => {
  const url = 'https://t.me/Tesei_Angels_bot?start=angely';
  if (tg && typeof tg.openTelegramLink === 'function') {
    tg.openTelegramLink(url);
    tg.close();
    return;
  }
  window.location.href = url;
};
$btnDraw.onclick = () => {
  // Для кнопки "Ангельские послания"
  const card = pickRandom(LAST_CARD && LAST_CARD.id);
  if (card) renderCard(card);
  else alert('Колода карт не загружена. Попробуйте позже.');
};
$btnAgain.onclick = $btnDraw.onclick;

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
$btnBackMain.onclick = () => show('home');
$btnBack.onclick = () => show('home');
if ($btnClear) {
  $btnClear.onclick = () => {
    S.clearHistory();
    renderList('history');
  };
}
$btnGuide.onclick = () => $modalGuide.classList.remove('hidden');
if ($btnCloseGuide) $btnCloseGuide.onclick = () => $modalGuide.classList.add('hidden');
if ($btnCloseAbout) $btnCloseAbout.onclick = () => $about.classList.add('hidden');

// Плавающая кнопка "О проекте"
if ($floatingAboutBtn) {
  $floatingAboutBtn.onclick = () => {
    $about.classList.remove('hidden');
  };
}

$btnHelp.onclick = () => alert('Функционал "Чем я могу помочь тебе" пока в разработке.');

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
