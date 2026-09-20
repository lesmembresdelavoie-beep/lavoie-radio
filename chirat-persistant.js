/* ============================================================
   CHIRAT PÈSISTAN — La Voie
   Ti bawo odyo flotan ki kontinye jwe menm lè moun nan chanje
   paj sou lavoie.world, jiskaske dat ekspirasyon an rive.
   Enjekte sou chak paj ak: <script src="chirat-persistant.js" defer></script>
   K'manse yon chirat ak: window.lvChiratJwe(src, titre, expiryISO)
============================================================ */
(function(){
  var CLE = 'lv_chirat_v1';

  function limanEta(){
    try{ return JSON.parse(localStorage.getItem(CLE) || 'null'); }catch(e){ return null; }
  }
  function sovEta(eta){
    try{ localStorage.setItem(CLE, JSON.stringify(eta)); }catch(e){}
  }
  function efaseEta(){
    try{ localStorage.removeItem(CLE); }catch(e){}
  }

  var bar=null, audio=null, btnPlay=null, titreEl=null;

  function kreyeBawo(eta){
    if(bar) return;
    bar=document.createElement('div');
    bar.id='lv-chirat-bar';
    bar.innerHTML =
      '<style>'+
      '#lv-chirat-bar{position:fixed;left:0;right:0;bottom:0;z-index:99999;'+
      'background:linear-gradient(90deg,#0a1a35,#0d2347);border-top:1.5px solid #c9a84c;'+
      'display:flex;align-items:center;gap:0.7rem;padding:0.6rem 0.9rem;'+
      'font-family:Georgia,serif;box-shadow:0 -4px 18px rgba(0,0,0,.35)}'+
      '#lv-chirat-bar .lv-ic{flex-shrink:0;width:36px;height:36px;border-radius:50%;'+
      'border:1.5px solid #c9a84c;display:flex;align-items:center;justify-content:center;'+
      'font-size:1.05rem;color:#e8cb7a;cursor:pointer;background:rgba(201,168,76,.08)}'+
      '#lv-chirat-bar .lv-txt{flex:1;min-width:0;color:#f7edcc}'+
      '#lv-chirat-bar .lv-titre{font-family:Georgia,serif;font-weight:600;font-size:0.82rem;'+
      'letter-spacing:0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
      '#lv-chirat-bar .lv-sous{font-size:0.68rem;letter-spacing:0.12em;text-transform:uppercase;'+
      'color:#c9a84c;margin-top:0.15rem}'+
      '#lv-chirat-bar .lv-close{flex-shrink:0;background:none;border:none;color:#e8cb7a;'+
      'font-size:1.1rem;cursor:pointer;opacity:0.75;padding:0.2rem 0.3rem}'+
      '#lv-chirat-bar .lv-close:hover{opacity:1}'+
      '@media(min-width:600px){#lv-chirat-bar{padding:0.6rem 1.6rem}}'+
      '</style>'+
      '<div class="lv-ic" id="lv-chirat-toggle">▶</div>'+
      '<div class="lv-txt"><div class="lv-titre" id="lv-chirat-titre"></div><div class="lv-sous">Miqra Qadosh Spécial · Shabbat 14 Éthanim</div></div>'+
      '<button class="lv-close" id="lv-chirat-close" title="Fèmen" aria-label="Fèmen">✕</button>';
    document.body.appendChild(bar);
    document.body.style.paddingBottom='58px';

    btnPlay=document.getElementById('lv-chirat-toggle');
    titreEl=document.getElementById('lv-chirat-titre');
    titreEl.textContent = eta.titre || 'Chirat';

    btnPlay.addEventListener('click', function(){
      if(audio.paused){ audio.play().catch(function(){}); } else { audio.pause(); }
    });
    document.getElementById('lv-chirat-close').addEventListener('click', function(){
      efaseEta();
      if(audio){ audio.pause(); }
      bar.remove();
      document.body.style.paddingBottom='';
      bar=null;
    });
  }

  function jweEta(eta, reprann){
    kreyeBawo(eta);
    audio=new Audio(eta.src);
    audio.preload='auto';
    if(reprann && eta.temps) audio.currentTime = eta.temps;

    audio.addEventListener('play', function(){ btnPlay.textContent='❚❚'; });
    audio.addEventListener('pause', function(){ btnPlay.textContent='▶'; });
    audio.addEventListener('ended', function(){ efaseEta(); });

    var dènyeSov=0;
    audio.addEventListener('timeupdate', function(){
      var kounye=Date.now();
      if(kounye-dènyeSov>2000){
        dènyeSov=kounye;
        eta.temps=audio.currentTime;
        sovEta(eta);
      }
    });

    var teLanse=audio.play();
    if(teLanse && teLanse.catch){
      teLanse.catch(function(){
        btnPlay.textContent='▶';
      });
    }

    window.addEventListener('pagehide', function(){
      if(audio && !audio.paused){
        eta.temps=audio.currentTime;
        sovEta(eta);
      }
    });
  }

  // API piblik: kòmanse (oswa relanse) yon chirat
  window.lvChiratJwe = function(src, titre, expiryISO){
    var eta = { src: src, titre: titre, temps: 0, expire: expiryISO };
    sovEta(eta);
    jweEta(eta, false);
  };

  // Otomatikman reprann yon chirat ki te ap jwe, si li poko ekspire
  document.addEventListener('DOMContentLoaded', function(){
    var eta = limanEta();
    if(!eta) return;
    if(eta.expire && Date.now() > Date.parse(eta.expire)){
      efaseEta();
      return;
    }
    jweEta(eta, true);
  });
})();
