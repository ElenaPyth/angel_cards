/* --- Telegram init --- */
const tg = window.Telegram?.WebApp;
if (tg) { tg.expand(); tg.ready(); }

/* --- DOM refs --- */
const el = (id) => document.getElementById(id);
const $home = el('home');
const $card = el('card');
const $list = el('list');
const $listTitle = el('list-title');
const $listWrap = el('list-wrap');
const $btnDraw = el('btn-draw');
const $btnAgain = el('btn-again');
const $btnFav = el('btn-favorite');
const $btnShare = el('btn-share');
const $btnHistory = el('btn-history');
const $btnFavList = el('btn-fav');
const $btnBack = el('btn-back');
const $btnAbout = el('about-modal') ? el('btn-about') : null;
const $about = el('about-modal');
const $btnCloseAbout = el('btn-close-about');
const $img = el('card-img');
const $ttl = el('card-title');
const $msg = el('card-msg');
const $btnSend = el('btn-send');
const $btnClear = el('btn-clear'); // появится после правки html
const itemTpl = document.getElementById('item-tpl');

let DECK = [];
let LAST_CARD = null;
let CURRENT_LIST_KIND = 'history'; // 'history' | 'fav'

/* --- Storage helpers --- */
const S = {
  get kHistory() { return 'cards_history_v1'; },
  get kFav() { return 'cards_fav_v1'; },
  read(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } },
  write(key, list) { localStorage.setItem(key, JSON.stringify(list)); },
  // добавление в историю без дублей подряд
  addToHistory(item) {
    const list = S.read(S.kHistory);
    if (list.length && String(list[0]?.id) === String(item.id)) {
      return; // не дублируем последнюю открытую карту
    }
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
  clearHistory() { S.write(S.kHistory, []); }
};

/* --- Utils --- */
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function pickRandom(exceptId = null) {
  if (!DECK.length) return null;
  let idx = Math.floor(Math.random() * DECK.length);
  if (DECK.length > 1 && exceptId != null && DECK[idx].id === exceptId) {
    idx = (idx + 1) % DECK.length;
  }
  return DECK[idx];
}
function show(section) {
  [$home, $card, $list].forEach(s => s.classList.add('hidden'));
  section.classList.remove('hidden');
}
/** превращаем относительный путь в абсолютный https-URL */
function absoluteImageUrl(rel) {
  return new URL(rel, location.href).href;
}
function findCardById(id) {
  return DECK.find(c => String(c.id) === String(id));
}

/* --- Render --- */
function renderCard(card) {
  LAST_CARD = card;
  console.log('[CARD]', card.title, '->', card.image); // помогает увидеть связку title↔image
  $img.src = card.image;
  $img.alt = card.title;
  $ttl.textContent = card.title;
  $msg.textContent = card.message;
  show($card);
}

// универсальный показ карты с управлением записи в историю
function showCard(card, { track = true } = {}) {
  renderCard(card);
  if (track) {
    S.addToHistory({ id: card.id, title: card.title, image: card.image, ts: Date.now() });
  }
}

function renderList(kind = 'history') {
  CURRENT_LIST_KIND = kind;
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
      if (card) showCard(card, { track: false }); // не добавляем повторно в историю
    };
    $listWrap.appendChild(node);
  });
  // показать/скрыть кнопку очистки истории
  if ($btnClear) $btnClear.classList.toggle('hidden', kind !== 'history' || data.length === 0);
  show($list);
}

/* --- Share --- */
async function shareCard(card) {
  const text = `${card.title}\n\n${card.message}`;
  if (navigator.share) { try { await navigator.share({ text }); return; } catch {} }
  try { await navigator.clipboard.writeText(text); alert('Текст послания скопирован.'); }
  catch { alert('Скопируйте вручную:\n\n' + text); }
}

/* --- Events --- */
$btnDraw.onclick = () => {
  const card = pickRandom(LAST_CARD?.id ?? null);
  if (card) showCard(card, { track: true });
};
$btnAgain.onclick = $btnDraw.onclick;

$btnFav.onclick = () => {
  if (!LAST_CARD) return;
  S.pushFav({ id: LAST_CARD.id, title: LAST_CARD.title, image: LAST_CARD.image, ts: Date.now() });
  $btnFav.textContent = 'Добавлено ✓';
  setTimeout(() => $btnFav.textContent = 'В избранное', 900);
};
$btnShare.onclick = () => LAST_CARD && shareCard(LAST_CARD);

/* Отправка в чат */
if ($btnSend) {
  $btnSend.onclick = () => {
    if (!LAST_CARD || !tg) return;
    const imgUrl = absoluteImageUrl(LAST_CARD.image);
    const payload = {
      type: 'send_card',
      card: { id: LAST_CARD.id, title: LAST_CARD.title, message: LAST_CARD.message, image: imgUrl }
    };
    console.log('[SEND to bot]', payload);
    tg.sendData(JSON.stringify(payload));
    tg.close();
  };
}

$btnHistory.onclick = () => renderList('history');
$btnFavList.onclick = () => renderList('fav');
$btnBack.onclick = () => show($home);
if ($btnClear) $btnClear.onclick = () => { S.clearHistory(); renderList('history'); };

if (el('btn-about')) {
  el('btn-about').onclick = () => $about.classList.remove('hidden');
  $btnCloseAbout.onclick = () => $about.classList.add('hidden');
}

/* --- Boot --- */
(async function boot() {
  try {
    const deckName = new URL(location.href).searchParams.get('deck') || 'deck';
    const res = await fetch(`./${deckName}.json?${Date.now()}`);
    DECK = await res.json();
  } catch (e) {
    console.error(e);
    alert('Не удалось загрузить колоду. Проверьте deck.json');
  }
  show($home);
})();
