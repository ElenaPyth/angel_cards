/* --- Telegram init --- */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.ready();
  // CSS уже учитывает тему через prefers-color-scheme
}

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
const $btnAbout = el('btn-about');
const $about = el('about-modal');
const $btnCloseAbout = el('btn-close-about');
const $img = el('card-img');
const $ttl = el('card-title');
const $msg = el('card-msg');
const $btnSend = el('btn-send'); // кнопка "Отправить в чат"
const itemTpl = document.getElementById('item-tpl');

let DECK = [];
let LAST_CARD = null;

/* --- Storage helpers --- */
const S = {
  get kHistory() { return 'cards_history_v1'; },
  get kFav() { return 'cards_fav_v1'; },
  read(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } },
  write(key, list) { localStorage.setItem(key, JSON.stringify(list)); },
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
  }
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
/** делаем из относительного пути абсолютный https-URL для Telegram */
function absoluteImageUrl(rel) {
  return new URL(rel, location.href).href; // корректно учтёт /angel_cards/
}

/* --- Render --- */
function renderCard(card) {
  LAST_CARD = card;
  $img.src = card.image;
  $img.alt = card.title;
  $ttl.textContent = card.title;
  $msg.textContent = card.message;
  S.pushHistory({ id: card.id, title: card.title, image: card.image, ts: Date.now() });
  show($card);
}
function renderList(kind = 'history') {
  $listWrap.innerHTML = '';
  const data = S.read(kind === 'history' ? S.kHistory : S.kFav);
  $listTitle.textContent = kind === 'history' ? 'История' : 'Избранное';
  data.forEach(it => {
    const node = itemTpl.content.cloneNode(true);
    node.querySelector('.thumb').src = it.image;
    node.querySelector('.ttl').textContent = it.title;
    node.querySelector('.dt').textContent = fmtDate(it.ts || Date.now());
    $listWrap.appendChild(node);
  });
  show($list);
}

/* --- Share --- */
async function shareCard(card) {
  const text = `${card.title}\n\n${card.message}`;
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch {}
  }
  try {
    await navigator.clipboard.writeText(text);
    alert('Текст послания скопирован в буфер.');
  } catch {
    alert('Скопируйте вручную:\n\n' + text);
  }
}

/* --- Events --- */
$btnDraw.onclick = () => {
  const card = pickRandom(LAST_CARD?.id ?? null);
  if (card) renderCard(card);
};
$btnAgain.onclick = $btnDraw.onclick;

$btnFav.onclick = () => {
  if (!LAST_CARD) return;
  S.pushFav({ id: LAST_CARD.id, title: LAST_CARD.title, image: LAST_CARD.image, ts: Date.now() });
  $btnFav.textContent = 'Добавлено ✓';
  setTimeout(() => $btnFav.textContent = 'В избранное', 900);
};
$btnShare.onclick = () => LAST_CARD && shareCard(LAST_CARD);

/* --- Отправка карты в чат --- */
if ($btnSend) {
  $btnSend.onclick = () => {
    if (!LAST_CARD || !tg) return;
    const imgUrl = absoluteImageUrl(LAST_CARD.image);
    console.log('Отправляем изображение:', imgUrl); // 🔍 вот тут увидим URL
    const payload = {
      type: 'send_card',
      card: {
        id: LAST_CARD.id,
        title: LAST_CARD.title,
        message: LAST_CARD.message,
        image: imgUrl
      }
    };
    tg.sendData(JSON.stringify(payload));
    tg.close();
  };
}
$btnHistory.onclick = () => renderList('history');
$btnFavList.onclick = () => renderList('fav');
$btnBack.onclick = () => show($home);

$btnAbout.onclick = () => $about.classList.remove('hidden');
$btnCloseAbout.onclick = () => $about.classList.add('hidden');

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
