/* Telegram init */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.ready();
}

/* DOM refs */
const el = (id) => document.getElementById(id);

const $home = el('home');
const $card = el('card');
const $list = el('list');

const $btnHistory = el('btn-history');
const $btnFavTop = el('btn-fav');
const $btnFavHome = el('btn-fav-home');
const $btnOpenFav = el('btn-open-fav');

const $btnDraw = el('btn-draw');
const $btnAgain = el('btn-again');
const $btnPractice = el('btn-practice'); // новая кнопка практики
const $btnShare = el('btn-share');

const $btnBack = el('btn-back');
const $btnClear = el('btn-clear');

const $img = el('card-img');
const $ttl = el('card-title');
const $msg = el('card-msg');

const $listTitle = el('list-title');
const $listWrap = el('list-wrap');

const $btnHow   = el('btn-how');
const $btnGuide = el('btn-guide');
const $btnHelp  = el('btn-help');
const $modalHow   = el('modal-how');
const $modalGuide = el('modal-guide');
const $about      = el('about-modal');
const $btnCloseHow   = el('btn-close-how');
const $btnCloseGuide = el('btn-close-guide');
const $btnAbout      = el('btn-about');
const $btnCloseAbout = el('btn-close-about');

const itemTpl = document.getElementById('item-tpl');

let DECK = [];
let LAST_CARD = null;
let CURRENT_VIEW = 'home'; // home | card | list

/* Хранилище */
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
    const list = S.read(S.kHistory);
    list.unshift(item);
    S.write(S.kHistory, list.slice(0, 200));
  },
  pushFav(item) {
    const list = S.read(S.kFav);
    if (!list.find(x => x.id === item.id)) {
      list.unshift(item);
      S.write(S.kFav, list.slice(0, 200));
    }
  },
  removeFav(id) {
    const list = S.read(S.kFav).filter(x => x.id !== id);
    S.write(S.kFav, list);
  },
  clearHistory() {
    S.write(S.kHistory, []);
  }
};

/* Утилиты */
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function pickRandom(exceptId = null) {
  if (!DECK.length) return null;
  let idx = Math.floor(Math.random() * DECK.length);
  if (DECK.length > 1 && exceptId != null && DECK[idx].id === exceptId) {
    idx = (idx + 1) % DECK.length;
  }
  return DECK[idx];
}

function findCardById(id) {
  return DECK.find(c => String(c.id) === String(id));
}

function show(sectionName) {
  CURRENT_VIEW = sectionName;
  $home.classList.add('hidden');
  $card.classList.add('hidden');
  $list.classList.add('hidden');

  if (sectionName === 'home') $home.classList.remove('hidden');
  if (sectionName === 'card') $card.classList.remove('hidden');
  if (sectionName === 'list') $list.classList.remove('hidden');
}

/* Рендер карты */
function renderCard(card, addToHistory = true) {
  LAST_CARD = card;
  $img.src = card.image;
  $img.alt = card.title;
  $ttl.textContent = card.title;
  $msg.textContent = card.message;

  if (addToHistory) {
    S.pushHistory({
      id: card.id,
      title: card.title,
      image: card.image,
      ts: Date.now()
    });
  }
  show('card');
}

/* Рендер списка истории/избранного */
function renderList(kind = 'history') {
  $listWrap.innerHTML = '';
  const data = S.read(kind === 'history' ? S.kHistory : S.kFav);
  $listTitle.textContent = kind === 'history' ? 'История' : 'Избранное';

  data.forEach(it => {
    const node = itemTpl.content.cloneNode(true);
    const root = node.querySelector('.item');
    root.dataset.id = it.id;
    root.dataset.kind = kind;
    node.querySelector('.thumb').src = it.image;
    node.querySelector('.ttl').textContent = it.title;
    node.querySelector('.dt').textContent = fmtDate(it.ts || Date.now());
    const delBtn = node.querySelector('.del');
    if (delBtn) {
      delBtn.classList.toggle('hidden', kind !== 'fav');
      delBtn.onclick = (e) => {
        e.stopPropagation();
        S.removeFav(it.id);
        renderList('fav');
      };
    }
    root.onclick = () => {
      const card = findCardById(it.id);
      if (card) renderCard(card, false);
    };
    $listWrap.appendChild(node);
  });

  if ($btnClear) {
    $btnClear.classList.toggle('hidden', kind !== 'history' || data.length === 0);
  }

  show('list');
}

/* Поделиться */
async function shareCard(card) {
  const text = `${card.title}\n\n${card.message}`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {}
  }
  try {
    await navigator.clipboard.writeText(text);
    alert('Текст послания скопирован.');
  } catch {
    alert('Скопируй текст вручную:\n\n' + text);
  }
}

/* События */

$btnDraw.onclick = () => {
  const card = pickRandom(LAST_CARD?.id ?? null);
  if (card) renderCard(card);
};
$btnAgain.onclick = $btnDraw.onclick;

/* Верхняя кнопка Избранное:
   на экране карты добавляет карту в избранное,
   на других экранах открывает список избранного. */
$btnFavTop.onclick = () => {
  if (CURRENT_VIEW === 'card') {
    if (!LAST_CARD) return;
    S.pushFav({
      id: LAST_CARD.id,
      title: LAST_CARD.title,
      image: LAST_CARD.image,
      ts: Date.now()
    });
    $btnFavTop.textContent = 'Добавлено ✓';
    setTimeout(() => { $btnFavTop.textContent = 'Избранное'; }, 900);
  } else {
    renderList('fav');
  }
};

/* Кнопки открытия избранного */
$btnFavHome.onclick = () => renderList('fav');
$btnOpenFav.onclick = () => renderList('fav');

/* История */
$btnHistory.onclick = () => renderList('history');

/* НОВАЯ логика кнопки «Пройти бесплатную практику» */
if ($btnPractice) {
  $btnPractice.onclick = () => {
    if (!tg) return;
    const payload = {
      action: 'practice',
      text: 'Ангелы'
    };
    tg.sendData(JSON.stringify(payload));
    tg.close();
  };
}

/* Поделиться */
$btnShare.onclick = () => {
  if (LAST_CARD) shareCard(LAST_CARD);
};

/* Навигация в списках */
$btnBack.onclick = () => show('home');
if ($btnClear) {
  $btnClear.onclick = () => {
    S.clearHistory();
    renderList('history');
  };
}

/* Модалки */
if ($btnHow)   $btnHow.onclick   = () => $modalHow.classList.remove('hidden');
if ($btnGuide) $btnGuide.onclick = () => $modalGuide.classList.remove('hidden');
if ($btnHelp)  $btnHelp.onclick  = () => $about.classList.remove('hidden');
if ($btnCloseHow)   $btnCloseHow.onclick   = () => $modalHow.classList.add('hidden');
if ($btnCloseGuide) $btnCloseGuide.onclick = () => $modalGuide.classList.add('hidden');
if ($btnAbout)      $btnAbout.onclick      = () => $about.classList.remove('hidden');
if ($btnCloseAbout) $btnCloseAbout.onclick = () => $about.classList.add('hidden');

/* Загрузка колоды */
(async function boot() {
  try {
    const deckName = new URL(location.href).searchParams.get('deck') || 'deck';
    const res = await fetch(`./${deckName}.json?${Date.now()}`);
    DECK = await res.json();
  } catch (e) {
    console.error(e);
    alert('Не удалось загрузить колоду. Проверь deck.json.');
  }
  show('home');
})();
