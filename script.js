(function(){
    const navItems = document.querySelectorAll('[data-nav]');

    navItems.forEach(it => {
    it.addEventListener('click', () => {
        const target = it.dataset.nav;

        switch (target) {
        case "home":
            window.location.href = "home.html";
            break;
        case "sets":
            window.location.href = "sets.html";
            break;
        case "tasks":
            window.location.href = "tasks.html";
            break;
        case "ranking":
            window.location.href = "ranking.html";
            break;
        case "resources":
            window.location.href = "resources.html";
            break;
        case "profile":
            window.location.href = "profile.html";
            break;
        case "settings":
            window.location.href = "settings.html";
            break;
        }
    });
    });
    


  function flashMessage(text) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position='absolute';
    el.style.left='50%';
    el.style.transform='translateX(-50%)';
    el.style.top='18px';
    el.style.background='rgba(0,0,0,0.6)';
    el.style.padding='8px 12px';
    el.style.borderRadius='10px';
    el.style.fontSize='13px';
    el.style.opacity='0';
    el.style.transition='opacity .2s, top .3s';

    document.querySelector('.frame').appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.top='34px'; });

    setTimeout(()=>{
      el.style.opacity='0';
      el.style.top='18px';
      setTimeout(()=>el.remove(),300);
    },1200);
  }

async function loadSettings(){
    const defaultSettings = { mainLanguage: 'pl', targetLanguage: 'en', darkMode: true };
    try {
      const resp = await fetch('/data/settings.json');
      if(resp.ok) {
        const json = await resp.json();
        const saved = JSON.parse(localStorage.getItem('settings') || '{}');
        return {...defaultSettings, ...json, ...saved};
      }
    } catch(e){}
    const saved = JSON.parse(localStorage.getItem('settings') || 'null');
    return saved ? {...defaultSettings, ...saved} : defaultSettings;
  }

  function updateCurrentPair(main, target) {
    const map = { pl: 'PL', en: 'EN', de: 'DE' };
    const el = document.getElementById('current-pair');
    if(el) el.textContent = `${map[main] || main.toUpperCase()} → ${map[target] || target.toUpperCase()}`;
    // uaktualnij widoczne napisy .subtitle (jeśli są)
    document.querySelectorAll('.subtitle').forEach(s => {
      s.textContent = `Język: ${ (map[main]||main).toUpperCase() } → ${ (map[target]||target).toUpperCase() }`;
    });
  }

  loadSettings().then(s => {
    console.log('settings loaded:', s);
    // ustaw widok aktualnej pary języków
    updateCurrentPair(s.mainLanguage, s.targetLanguage);
  });

  // obsługa wyboru z menu
  document.addEventListener('DOMContentLoaded', () => {
    const langBtn = document.getElementById('lang-btn');
    const langMenu = document.getElementById('lang-menu');

    if(langBtn && langMenu){
      // toggle menu
      langBtn.addEventListener('click', () => {
        const open = langMenu.hasAttribute('hidden') ? false : true;
        if(open) {
          langMenu.setAttribute('hidden','');
          langBtn.setAttribute('aria-expanded','false');
        } else {
          langMenu.removeAttribute('hidden');
          langBtn.setAttribute('aria-expanded','true');
        }
      });

      // opcje
      document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const main = opt.dataset.main;
          const target = opt.dataset.target;
          const settings = { mainLanguage: main, targetLanguage: target };
          localStorage.setItem('settings', JSON.stringify(settings));
          updateCurrentPair(main, target);
          langMenu.setAttribute('hidden','');
          langBtn.setAttribute('aria-expanded','false');
          flashMessage(`Język ustawiony: ${main.toUpperCase()} → ${target.toUpperCase()}`);
        });
      });

      // zamknij klikając poza
      document.addEventListener('click', (e) => {
        if(!langBtn.contains(e.target) && !langMenu.contains(e.target)) {
          langMenu.setAttribute('hidden','');
          langBtn.setAttribute('aria-expanded','false');
        }
      });
    }
  });

})();

/* --- sets.html: dynamiczne renderowanie poziomów i przekierowanie do quiz --- */
document.addEventListener('DOMContentLoaded', () => {
  const levelsContainer = document.getElementById('levels-list');
  if (!levelsContainer) return;

  // pobierz ustawienia z localStorage (format: { mainLanguage, targetLanguage })
  function getLangSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('settings') || '{}');
      return {
        mainLanguage: s.mainLanguage || 'pl',
        targetLanguage: s.targetLanguage || 'en'
      };
    } catch (e) {
      return { mainLanguage: 'pl', targetLanguage: 'en' };
    }
  }

  async function loadLexicon() {
    try {
      const resp = await fetch('data/LanguagePack.json');
      if (!resp.ok) throw new Error('Nie można wczytać słownika');
      return await resp.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  function groupByLevel(entries, lang) {
    const counts = {};
    entries.forEach(ent => {
      const lvl = ent.level?.[lang] || 'unknown';
      counts[lvl] = (counts[lvl] || 0) + 1;
    });
    // utrzymaj kolejność A1..C2
    const order = ['A1','A2','B1','B2','C1','C2'];
    return order.map(l => ({ level: l, count: counts[l] || 0 })).filter(x => x.count > 0 || true);
  }

  function renderLevels(levels, main, target) {
    levelsContainer.innerHTML = '';
    // filtruj tylko poziomy które mają count>0 OR pokaz wszystkie (tutaj pokazujemy wszystkie poziomy, count 0 ma etykietę)
    levels.forEach(l => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.level = l.level;
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'space-between';

      card.innerHTML = `
        <div>
          <div class="big" style="font-size:16px;">Poziom ${l.level}</div>
          <div class="muted" style="font-size:13px; margin-top:6px;">${l.count} fiszek</div>
        </div>
      `;
      levelsContainer.appendChild(card);
    });

    // delegacja kliknięć w przycisk otwierający poziom
    levelsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-level]');
      if (!btn) return;
      const level = btn.getAttribute('data-open-level');
      // zapamiętaj wybór (main, target, level)
      const study = { mainLanguage: main, targetLanguage: target, level };
      localStorage.setItem('study', JSON.stringify(study));
      // przekieruj do quiz.html
      window.location.href = 'quiz.html';
    });
  }

  // inicjalizacja
  (async function(){
    const { mainLanguage, targetLanguage } = getLangSettings();
    const data = await loadLexicon();
    const grouped = groupByLevel(data, targetLanguage);
    renderLevels(grouped, mainLanguage, targetLanguage);
    // uaktualnij widok pary języków (jeśli masz taką funkcję w skrypcie - nie konieczne)
    const currentPairEl = document.getElementById('current-pair');
    if (currentPairEl) currentPairEl.textContent = `${(mainLanguage||'PL').toUpperCase()} → ${(targetLanguage||'EN').toUpperCase()}`;
  })();

});

document.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  if (!card.closest('.content')) return;

  const levelsList = document.getElementById('levels-list');

  // jeśli karta NIE jest w #levels-list (np. na sets.html), nie przekierowujemy — pokazujemy komunikat
  if (!levelsList || !levelsList.contains(card)) {
    const lvl = card.dataset.level || ((card.textContent || '').match(/\b(A1|A2|B1|B2|C1|C2)\b/) || [null])[0];
    if (window.flashMessage) window.flashMessage(`Otwieram zestawy: ${lvl || ''}`);
    else console.log(`Otwieram zestawy: ${lvl || ''}`);
    return;
  }

  // karta jest w resources (#levels-list) — zapisz wybór i przejdź do quiz
  const settings = JSON.parse(localStorage.getItem('settings') || '{}');
  const main = settings.mainLanguage || 'pl';
  const target = settings.targetLanguage || 'en';

  let level = card.dataset.level || null;
  if (!level) {
    const m = (card.textContent || '').match(/\b(A1|A2|B1|B2|C1|C2)\b/);
    level = m ? m[1] : null;
  }

  const study = { mainLanguage: main, targetLanguage: target, level };
  localStorage.setItem('study', JSON.stringify(study));
  window.location.href = 'quiz.html';
});