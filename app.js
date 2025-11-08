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

const $btnOpenFav = el('btn-open-fav');   // нижняя кнопка под картой: «Избранное»
const $btnShare = el('btn-share');
const $btnSend = el('btn-send');

const $btnHistory = el('btn-history');    // верхняя: «История»
const $btnFavTop  = el('btn-fav');        // верхняя: меняет смысл (Избранное / В избранное)
const $btnFavHome = el('btn-fav-home');   // кнопка на главном экране

const $btnBack = el('btn-back');
const $btnClear = el('btn-clear');

const $img = el('card-img');
const $ttl = el('card-title');
const $msg = el('card-msg');

const itemTpl = document.getElementById('item-tpl');

/* Home extra buttons & modals */
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
  },
  removeFav(id) { S.write(S.kFav, S.read(S.kFav).filter(x => x.id !== id)); },
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
  if (DECK.length > 1 && exceptId != null && DECK[idx].id === exceptId) idx = (idx + 1) % DECK.length;
  return DECK[idx];
}
function absoluteImageUrl(rel) { return new URL(rel, location.href).href; }
function findCardById(id) { return DECK.find(c => String(c.id) === String(id)); }

/* --- Header mode --- */
function setHeaderMode(mode) {
  if (mode === 'card') {
    // На экране карты: верхняя правая = «В избранное»
    $btnFavTop.textContent = 'В избранное';
    $btnFavTop.onclick = () => {
      if (!LAST_CARD) return;
      S.pushFav({ id: LAST_CARD.id, title: LAST_CARD.title, image: LAST_CARD.image, ts: Date.now() });
      const old = $btnFavTop.textContent;
      $btnFavTop.textContent = 'Добавлено ✓';
      setTimeout(() => { $btnFavTop.textContent = old; }, 900);
    };
  } else {
    // На прочих экранах: верхняя правая = «Избранное» (список)
    $btnFavTop.textContent = 'Избранное';
    $btnFavTop.onclick = () => renderList('fav');
  }
}

/* --- View switch --- */
function show(sectionEl) {
  [$home, $card, $list].forEach(s => s.classList.add('hidden'));
  sectionEl.classList.remove('hidden');
  setHeaderMode(sectionEl === $card ? 'card' : 'default');
}

/* --- Render --- */
function renderCard(card, addToHistory = true) {
  LAST_CARD = card;
  $img.src = card.image;
  $img.alt = card.title;
  $ttl.textContent = card.title;
  $msg.textContent = card.message;
  if (addToHistory) {
    S.pushHistory({ id: card.id, title: card.title, image: card.image, ts: Date.now() });
  }
  show($card);
}

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
    delBtn.classList.toggle('hidden', kind !== 'fav');
    delBtn.onclick = (e) => {
      e.stopPropagation();
      S.removeFav(it.id);
      renderList('fav');
    };

    root.onclick = () => {
      const c = findCardById(it.id);
      if (c) renderCard(c, false); // просмотр из «Избранного»/«Истории» — не пишем в историю
    };
    $listWrap.appendChild(node);
  });
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
$btnDraw.onclick = () => { const card = pickRandom(LAST_CARD?.id ?? null); if (card) renderCard(card); };
if ($btnAgain) $btnAgain.onclick = $btnDraw.onclick;

if ($btnOpenFav) $btnOpenFav.onclick = () => renderList('fav'); // нижняя кнопка под картой
if ($btnShare) $btnShare.onclick = () => LAST_CARD && shareCard(LAST_CARD);

/* Отправка в чат */
if ($btnSend) {
  $btnSend.onclick = () => {
    if (!LAST_CARD || !tg) return;
    const imgUrl = absoluteImageUrl(LAST_CARD.image);
    const payload = { type: 'send_card', card: { id: LAST_CARD.id, title: LAST_CARD.title, message: LAST_CARD.message, image: imgUrl } };
    tg.sendData(JSON.stringify(payload));
    tg.close();
  };
}

/* Навигация списков и дом */
$btnHistory.onclick = () => renderList('history');
if ($btnFavHome) $btnFavHome.onclick = () => renderList('fav');
if ($btnBack) $btnBack.onclick = () => show($home);
if ($btnClear) $btnClear.onclick = () => { S.clearHistory(); renderList('history'); };

/* Модалки */
if ($btnHow)   $btnHow.onclick   = () => $modalHow.classList.remove('hidden');
if ($btnGuide) $btnGuide.onclick = () => $modalGuide.classList.remove('hidden');
if ($btnHelp)  $btnHelp.onclick  = () => $about.classList.remove('hidden');
if ($btnCloseHow)   $btnCloseHow.onclick   = () => $modalHow.classList.add('hidden');
if ($btnCloseGuide) $btnCloseGuide.onclick = () => $modalGuide.classList.add('hidden');
if ($btnAbout)      $btnAbout.onclick      = () => $about.classList.remove('hidden');
if ($btnCloseAbout) $btnCloseAbout.onclick = () => $about.classList.add('hidden');

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