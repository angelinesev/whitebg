(function () {

  if (document.getElementById('immersive-canvas')) return;

  /* ─── EXACT FLOOR DATA CONFIGURATION ─── */
  var FLOORS = [
    { id: 'floor-l3',  title: '3RD FLOOR LUXURY ATRIUM', shortTitle: 'L3', panoramaName: 'third_floor' },
    { id: 'floor-l2',  title: '2ND FLOOR UPPER PROMENADE', shortTitle: 'L2', panoramaName: 'second_floor' },
    { id: 'floor-g',   title: 'GROUND LUXURY ATRIUM',    shortTitle: 'G',  panoramaName: 'ground_floor' }
  ];

  /* ─── STATE MANAGEMENT ─── */
  var state = {
    activeFloorId: 'floor-g', 
    searchQuery: ''
  };

  var mediaRequestId = 0;
  var firstJump = true;

  /* ─── HELPERS ─── */
  function sel(id)         { return document.getElementById(id); }
  function setText(id, t)  { var el = sel(id); if (el) el.textContent = t; }
  
  function getFloor() { 
    var found = FLOORS.find(function(f) { return f.id === state.activeFloorId; });
    return found || FLOORS[2]; 
  }

  function getActiveIndex() {
    return FLOORS.findIndex(function(f) { return f.id === state.activeFloorId; });
  }

  function matchShortTitle(floor, query) {
    if (!query) return true;
    var cleanedQuery = query.toLowerCase().trim();
    if (cleanedQuery === '') return true;
    
    var title = floor.shortTitle.toLowerCase();
    return title.indexOf(cleanedQuery) === 0;
  }

  /* ─── VIRTUAL TOUR PLAYER BRIDGE ─── */
  function getPlayer() {
    var root = (window.tour && (window.tour.getRoot ? window.tour.getRoot() : window.tour.root)) || window.tour || null;
    return window.player || window.vtour || (root && root.locManager && root.locManager.rootPlayer) || (root && root.player) || null;
  }

  function refreshPlayer(p) {
    try {
      var currentMedia = p.getCurrentMedia ? p.getCurrentMedia() : (p.currentMedia || null);
      if (currentMedia && currentMedia.initialView) {
        var iv = currentMedia.initialView;
        if (p.lookTo) {
          p.lookTo(iv.yaw || 0, iv.pitch || 0, iv.fov || currentMedia.fov || 75, true);
        }
      } else {
        if (p.lookTo) { p.lookTo(0, 0, 75, true); }
        else if (p.moveTo) { p.moveTo(0, 0, 'fixed'); }
      }
    } catch(e) {}
    
    try { p.drawScene && p.drawScene(); } catch(e) {}
    try { p.render    && p.render();    } catch(e) {}
    try { p.update    && p.update();    } catch(e) {}
  }

  function tryJump(name) {
    var p = getPlayer();
    if (!p) return false;
    
    var fns = [
      function(){ p.setMediaByName(name, false); }, 
      function(){ p.setMediaByName(name); }, 
      function(){ p.SetMediaByName(name); },
      function(){ window.tour.setMediaByName(name, false); }, 
      function(){ window.tour.SetMediaByName(name); },
      function(){ p.openPanorama(name); }, 
      function(){ p.loadScene(name); }
    ];
    
    for (var i = 0; i < fns.length; i++) {
      try { 
        fns[i](); 
        setTimeout(function() { refreshPlayer(p); }, 50);
        return true; 
      } catch(e) {}
    }
    return false;
  }

  function goToPanorama(name) {
    mediaRequestId++;
    var rid = mediaRequestId;
    var delay = firstJump ? 600 : 0;
    firstJump = false;
    
    setTimeout(function () {
      if (rid !== mediaRequestId) return;
      if (tryJump(name)) return;

      var t = setInterval(function () {
        if (rid !== mediaRequestId) { clearInterval(t); return; }
        if (tryJump(name)) {
          clearInterval(t); 
        }
      }, 80);
      
      setTimeout(function () { clearInterval(t); }, 4000);
    }, delay);
  }

  /* ─── HUD VISIBILITY CONTROLLER ─── */
  function checkHUDVisibility() {
    var p = getPlayer();
    var canvasEl = sel('immersive-canvas');
    if (!canvasEl) return;

    try {
      var currentMedia = p.getCurrentMedia ? p.getCurrentMedia() : (p.currentMedia || null);
      if (currentMedia && currentMedia.name) {
        
        var currentPanName = currentMedia.name.toLowerCase().trim().replace(/\.(jpg|jpeg|png|pan|xml)$/i, '');

        var isGround = currentPanName.indexOf('ground') !== -1 || currentPanName.indexOf('ground_floor') !== -1;
        var isSecond = currentPanName.indexOf('second') !== -1 || currentPanName.indexOf('second_floor') !== -1;
        var isThird  = currentPanName.indexOf('third')   !== -1 || currentPanName.indexOf('third_floor')   !== -1;

        if (isGround || isSecond || isThird) {
          canvasEl.style.setProperty('display', 'block', 'important');
          
          var matchingFloor = FLOORS.find(function(f) { 
            var configPanName = f.panoramaName.toLowerCase().trim();
            return currentPanName === configPanName || 
                   currentPanName.indexOf(configPanName) !== -1 || 
                   configPanName.indexOf(currentPanName) !== -1;
          });

          if (matchingFloor && state.activeFloorId !== matchingFloor.id) {
            state.activeFloorId = matchingFloor.id;
            setText('active-floor-title', matchingFloor.title);
            renderCarousel();
            if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
          }
        } else {
          canvasEl.style.setProperty('display', 'none', 'important');
          if (typeof window.hideLotPopup === 'function') {
            window.hideLotPopup();
          }
        }
      } else {
        canvasEl.style.setProperty('display', 'block', 'important');
      }
    } catch (e) {
      canvasEl.style.setProperty('display', 'block', 'important');
    }
  }

  /* ─── INJECT DARK-MODE STYLES ─── */
  var style = document.createElement('style');
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    #immersive-canvas, #immersive-canvas * {
      font-family: 'Inter', sans-serif !important;
      box-sizing: border-box;
      outline: none !important;
    }

    #immersive-canvas {
      position: fixed !important; 
      inset: 0 !important; 
      z-index: 99999999 !important; 
      width: 100% !important; 
      height: 100vh !important;
      overflow: hidden !important; 
      pointer-events: none !important;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    #immersive-canvas.hud-ready { opacity: 1 !important; }

    .premium-directory-panel {
      position: absolute !important;
      top: 32px !important;
      left: 32px !important;
      width: 390px !important;
      background: #141414 !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 28px !important;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6) !important;
      padding: 24px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 20px !important;
      pointer-events: auto !important;
    }

    /* ─── STANDALONE SUB BUTTON ACTION ROW CONTAINER ─── */
    #hud-external-actions {
      position: absolute !important;
      top: 310px !important; /* Positioned directly underneath the 32px + 258px panel bounding box height */
      left: 32px !important;
      width: 390px !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      pointer-events: auto !important;
    }

    .header-row { display: flex !important; align-items: center !important; gap: 14px !important; }
    
    .icon-badge-box {
      width: 40px !important; height: 40px !important; border-radius: 14px !important;
      background: rgba(255, 255, 255, 0.06) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      color: #ffffff !important;
    }

    .meta-text-block { display: flex !important; flex-direction: column !important; flex-grow: 1 !important; }
    .meta-subtitle { font-size: 10px !important; font-weight: 600 !important; color: rgba(255, 255, 255, 0.35) !important; letter-spacing: 2px !important; text-transform: uppercase !important; }
    .meta-title { font-size: 18px !important; font-weight: 500 !important; color: #ffffff !important; margin-top: 2px !important; letter-spacing: -0.3px !important; }

    .carousel-container { display: flex !important; align-items: center !important; gap: 8px !important; }
    
    .carousel-track {
      display: flex !important; gap: 8px !important; flex-grow: 1 !important; overflow-x: auto !important;
      scrollbar-width: none !important; -ms-overflow-style: none !important;
      align-items: center !important;
    }
    .carousel-track::-webkit-scrollbar { display: none !important; }

    .nav-arrow-btn {
      width: 36px !important; height: 38px !important; border-radius: 12px !important;
      background: rgba(255, 255, 255, 0.04) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      color: rgba(255, 255, 255, 0.6) !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      cursor: pointer !important; transition: all 0.2s ease !important;
    }
    .nav-arrow-btn:hover { 
      background: rgba(255, 255, 255, 0.08) !important; 
      color: #ffffff !important; 
      border-color: rgba(255, 255, 255, 0.2) !important; 
    }

    .floor-caro-item {
      position: relative !important; flex: 1 0 calc(33.33% - 6px) !important; min-width: 52px !important; height: 38px !important;
      border-radius: 14px !important; background: rgba(255, 255, 255, 0.02) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      color: rgba(255, 255, 255, 0.5) !important; font-size: 13px !important; font-weight: 600 !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      cursor: pointer !important; transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
      pointer-events: auto !important;
    }
    .floor-caro-item:hover { 
      background: rgba(255, 255, 255, 0.06) !important; 
      color: rgba(255, 255, 255, 0.85) !important; 
      border-color: rgba(255, 255, 255, 0.25) !important; 
    }
    
    .floor-caro-item.is-active-level {
      background: #ffffff !important; 
      border-color: #ffffff !important;
      color: #141414 !important; 
      font-weight: 700 !important;
      box-shadow: 0 8px 20px rgba(255, 255, 255, 0.15) !important;
    }

    .empty-search-fallback {
      width: 100% !important; text-align: center !important; font-size: 12px !important; font-weight: 500 !important;
      color: rgba(255, 255, 255, 0.25) !important; letter-spacing: 0.5px !important;
      padding: 8px 0 !important; text-transform: uppercase !important;
    }

    .search-input-shell { 
      position: relative !important;  
      width: 100% !important;  
      display: flex !important;
      align-items: center !important;
    }
    
    .search-input-shell .search-icon { 
      position: absolute !important;  
      left: 16px !important;  
      color: rgba(255, 255, 255, 0.4) !important;
      width: 16px !important;  
      height: 16px !important;  
      pointer-events: none !important;
      z-index: 2 !important;
    }
    
    .search-bar-field {
      width: 100% !important; height: 44px !important; border-radius: 14px !important;
      background: rgba(0, 0, 0, 0.25) !important; border: 1px solid rgba(255, 255, 255, 0.06) !important;
      padding: 0 16px 0 44px !important; color: #ffffff !important; font-size: 13px !important; font-weight: 400 !important;
      letter-spacing: 0.2px !important; transition: all 0.2s ease !important;
      position: relative !important;
      z-index: 1 !important;
    }
    .search-bar-field:focus { border-color: rgba(255, 255, 255, 0.4) !important; background: rgba(0, 0, 0, 0.4) !important; }
    .search-bar-field::placeholder { color: rgba(255, 255, 255, 0.25) !important; }

    .reference-sub-button {
      flex: 1 !important;
      background: rgba(20, 20, 20, 0.85) !important;
      backdrop-filter: blur(16px) !important;
      border: 1.5px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 18px !important;
      height: 48px !important;
      color: #ffffff !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 1px !important;
      text-transform: uppercase !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 10px !important;
      cursor: pointer !important;
      transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35) !important;
    }
    .reference-sub-button:hover {
      background: rgba(28, 28, 28, 0.95) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      transform: translateY(-2px) !important;
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45) !important;
    }
    .reference-sub-button:active {
      transform: translateY(0px) !important;
    }

    .panel-footer-row {
      display: flex !important; align-items: center !important; justify-content: space-between !important;
      border-top: 1px solid rgba(255, 255, 255, 0.06) !important; padding-top: 14px !important;
    }
    .footer-counter { font-size: 10px !important; font-weight: 600 !important; color: rgba(255, 255, 255, 0.3) !important; letter-spacing: 1px !important; text-transform: uppercase !important; }
  `;
  document.head.appendChild(style);

  /* ─── EXTERNAL DEPENDENCY HANDLERS ─── */
  var loaded = 0;
  function onLoad() { if (++loaded === 2) initApp(); }
  function loadScript(src) {
    var s = document.createElement('script'); s.src = src; s.onload = onLoad;
    document.head.appendChild(s);
  }
  loadScript('https://cdn.tailwindcss.com');
  loadScript('https://unpkg.com/lucide@latest');

  /* ─── DOM INITIALIZATION ENGINE ─── */
  var canvas = document.createElement('div');
  canvas.id = 'immersive-canvas';

  canvas.innerHTML = `
    <div class="premium-directory-panel">
      
      <div class="header-row">
        <div class="icon-badge-box">
          <i data-lucide="compass" style="width: 18px; height: 18px;"></i>
        </div>
        <div class="meta-text-block">
          <span class="meta-subtitle">Active Level</span>
          <span class="meta-title" id="active-floor-title">--</span>
        </div>
      </div>

      <div class="carousel-container">
        <button class="nav-arrow-btn" id="caro-prev-btn"><i data-lucide="chevron-left" style="width:16px; height:16px;"></i></button>
        
        <div class="carousel-track" id="caro-floor-track"></div>

        <button class="nav-arrow-btn" id="caro-next-btn"><i data-lucide="chevron-right" style="width:16px; height:16px;"></i></button>
      </div>

      <div class="search-input-shell">
        <i data-lucide="search" class="search-icon"></i>
        <input type="text" class="search-bar-field" id="floor-search-input" placeholder="Search level (e.g. 'G', 'L3')">
      </div>

      <div class="panel-footer-row">
        <div class="footer-counter" id="floor-counter-label">Showing 0 of 0 Floors</div>
      </div>

    </div>

    <div id="hud-external-actions">
      <button id="ref-floorplan-btn" class="reference-sub-button">
        <i data-lucide="map" style="width: 15px; height: 15px;"></i>
        <span>Floor Plan</span>
      </button>
      <button id="ref-calculator-btn" class="reference-sub-button">
        <i data-lucide="calculator" style="width: 15px; height: 15px;"></i>
        <span>Calculator</span>
      </button>
    </div>

    <style>
      @media (max-width: 440px) {
        .premium-directory-panel { width: calc(100% - 32px) !important; top: auto !important; bottom: 84px !important; right: 16px !important; left: 16px !important; padding: 20px !important; }
        #hud-external-actions { width: calc(100% - 32px) !important; top: auto !important; bottom: 20px !important; right: 16px !important; left: 16px !important; }
      }
    </style>
  `;

  document.body.appendChild(canvas);

  /* ─── TARGET REFERENCE ELEMENTS ─── */
  var track = sel('caro-floor-track');
  var prevBtn = sel('caro-prev-btn');
  var nextBtn = sel('caro-next-btn');
  var searchInput = sel('floor-search-input');

  /* ─── RE-RENDER GRAPHICS CONSOLE TRACK RUNTIME ─── */
  var trackingItemsEmptyFallbackLabel = 'No floor found';
  function renderCarousel() {
    track.innerHTML = '';
    
    var filteredFloors = FLOORS.filter(function (f) {
      return matchShortTitle(f, state.searchQuery);
    });

    if (filteredFloors.length === 0) {
      var fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'empty-search-fallback';
      fallbackDiv.textContent = trackingItemsEmptyFallbackLabel;
      track.appendChild(fallbackDiv);

      setText('floor-counter-label', 'SHOWING 0 OF ' + FLOORS.length + ' FLOORS');
      return;
    }

    filteredFloors.forEach(function (floor) {
      var isCurrentActive = state.activeFloorId === floor.id;

      var btn = document.createElement('button');
      btn.className = 'floor-caro-item' + (isCurrentActive ? ' is-active-level' : '');
      btn.textContent = floor.shortTitle;
      btn.setAttribute('type', 'button');

      btn.onmousedown = function (e) {
        e.preventDefault(); 
        state.activeFloorId = floor.id;
        state.searchQuery = '';
        if (searchInput) searchInput.value = '';
        updateHUDState(true); 
      };

      track.appendChild(btn);
    });

    setText('floor-counter-label', 'SHOWING ' + filteredFloors.length + ' OF ' + FLOORS.length + ' FLOORS');
  }

  /* ─── REALTIME CONSOLE SYNC MECHANISM ─── */
  function updateHUDState(shouldJump) {
    var activeFloor = getFloor();

    setText('active-floor-title', activeFloor.title);

    renderCarousel();

    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    
    if (shouldJump) {
      goToPanorama(activeFloor.panoramaName);
    }
  }

  /* ─── EVENTS DETECTOR ATTACHMENTS ─── */
  function setupEvents() {
    prevBtn.onclick = function () {
      var currentIndex = getActiveIndex();
      if (currentIndex > 0) {
        state.activeFloorId = FLOORS[currentIndex - 1].id;
      } else {
        state.activeFloorId = FLOORS[FLOORS.length - 1].id; 
      }
      updateHUDState(true);
    };

    nextBtn.onclick = function () {
      var currentIndex = getActiveIndex();
      if (currentIndex < FLOORS.length - 1) {
        state.activeFloorId = FLOORS[currentIndex + 1].id;
      } else {
        state.activeFloorId = FLOORS[0].id; 
      }
      updateHUDState(true);
    };

    searchInput.oninput = function (e) {
      state.searchQuery = e.target.value;
      renderCarousel();
      
      var matches = FLOORS.filter(function (f) {
        return matchShortTitle(f, state.searchQuery);
      });
      
      if (matches.length > 0) {
        if (!matches.some(function(m) { return m.id === state.activeFloorId; })) {
          state.activeFloorId = matches[0].id;
          updateHUDState(false); 
        }
      }
    };

    searchInput.onkeydown = function (e) {
      if (e.key === 'Enter') {
        var matches = FLOORS.filter(function (f) {
          return matchShortTitle(f, state.searchQuery);
        });
        if (matches.length > 0) {
          state.activeFloorId = matches[0].id;
          updateHUDState(true); 
          searchInput.blur();
        }
      }
    };

    /* ─── HOOK INTERACTION ACTION HANDLERS FOR NEW EXTERNAL BUTTONS ─── */
    sel('ref-floorplan-btn').onclick = function () {
      console.log('Floor Plan context module initialized for: ' + state.activeFloorId);
      // Add custom floor plan handling script logic here
    };

    sel('ref-calculator-btn').onclick = function () {
      console.log('Investment Calculator drawer opened.');
      // Add custom spreadsheet or overlay tool handling logic here
    };
  }

  /* ─── RUN SYSTEM ENGINE INITIALIZATION ─── */
  function initApp() {
    setupEvents();
    updateHUDState(false);

    setTimeout(function () {
      var canvasEl = sel('immersive-canvas');
      if (canvasEl) canvasEl.classList.add('hud-ready');
    }, 120);

    setInterval(checkHUDVisibility, 250);
  }

})();