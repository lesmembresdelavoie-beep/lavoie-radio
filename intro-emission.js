/* ═══════════════════════════════════════════════
   INTRO-EMISSION — Sistèm reyitilizab pou entwo
   anvan nenpòt emisyon sou lavoie.world

   ITILIZASYON (sou nenpòt nouvo paj emisyon) :

   1. Nan <head> :
      <link rel="stylesheet" href="intro-emission.css">

   2. Jis anvan </body> :
      <script src="intro-emission.js"
              data-video="vr-tv-intro.mp4"
              data-logo="📻📺 La VR-TV"></script>

   Atribi opsyonèl :
   - data-video : chemen videyo entwo a (obligatwa)
   - data-logo  : tèks ki parèt sou ekran "Antre" a (default : "📻📺 La VR-TV")
   - data-key   : kle sessionStorage pèsonalize (default : baze sou non paj la,
                  pou chak emisyon gen pwòp memwa "deja gade" pa li)
   ═══════════════════════════════════════════════ */

(function() {
  const thisScript = document.currentScript;
  const videoSrc = thisScript.getAttribute('data-video');
  const logoText = thisScript.getAttribute('data-logo') || '📻📺 La VR-TV';
  const seenKey = thisScript.getAttribute('data-key') || ('lavoie_intro_seen_' + location.pathname);

  if (!videoSrc) {
    console.warn('intro-emission.js: atribi data-video manke, entwo a pa ka demare.');
    return;
  }

  if (sessionStorage.getItem(seenKey)) {
    return; // deja gade sou paj sa a nan sesyon sa a — pa montre anyen
  }

  // Kreye estriktè HTML la dinamikman
  const overlay = document.createElement('div');
  overlay.id = 'ie-overlay';
  overlay.innerHTML =
    '<div id="ie-gate">' +
      '<div class="ie-logo">' + logoText + '</div>' +
      '<button class="ie-btn" id="ie-start">▶ Antre</button>' +
    '</div>' +
    '<video id="ie-video" playsinline preload="metadata" style="display:none;">' +
      '<source src="' + videoSrc + '" type="video/mp4" />' +
    '</video>' +
    '<button id="ie-skip" style="display:none;">Sote ⏭</button>';

  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.classList.add('ie-active');

  const gate = document.getElementById('ie-gate');
  const startBtn = document.getElementById('ie-start');
  const video = document.getElementById('ie-video');
  const skipBtn = document.getElementById('ie-skip');

  function finish() {
    sessionStorage.setItem(seenKey, '1');
    overlay.classList.add('ie-fading');
    document.body.classList.remove('ie-active');
    setTimeout(() => { overlay.remove(); }, 650);
  }

  startBtn.addEventListener('click', () => {
    gate.style.display = 'none';
    video.style.display = 'block';
    skipBtn.style.display = 'block';
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      video.play();
    });
  });

  video.addEventListener('ended', finish);
  skipBtn.addEventListener('click', () => {
    video.pause();
    finish();
  });
})();
