const STORAGE_KEY = "saved_video_links";
const THEME_KEY = "video_app_theme";

// ---------- Lưu trữ ----------
function getSavedLinks() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
function saveLinks(links) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

// ---------- Tiện ích ----------
function getYouTubeId(url) {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function fmt(sec) {
  sec = Math.floor(sec || 0);
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ---------- Dark / light mode ----------
function setupTheme() {
  const root = document.documentElement;
  const icon = document.getElementById("themeIcon");
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved ? saved === "dark" : prefersDark;

  applyTheme(isDark);

  document.getElementById("themeToggle").onclick = () => {
    const nowDark = !root.classList.contains("dark");
    applyTheme(nowDark);
    localStorage.setItem(THEME_KEY, nowDark ? "dark" : "light");
  };

  function applyTheme(dark) {
    root.classList.toggle("dark", dark);
    icon.className = dark ? "fa-solid fa-moon text-sm" : "fa-solid fa-sun text-sm";
  }
}

// ---------- Danh sách + tìm kiếm ----------
function renderLinkList(filterText = "") {
  const listEl = document.getElementById("linkList");
  const links = getSavedLinks();
  const filtered = filterText
    ? links.filter(item => item.name.toLowerCase().includes(filterText.toLowerCase()))
    : links;

  if (links.length === 0) {
    listEl.innerHTML = `<p class="text-neutral-500 text-sm">Chưa có video nào được lưu.</p>`;
    return;
  }
  if (filtered.length === 0) {
    listEl.innerHTML = `<p class="text-neutral-500 text-sm">Không tìm thấy video nào khớp.</p>`;
    return;
  }

  listEl.innerHTML = filtered.map((item) => {
    const realIndex = links.indexOf(item);
    return `
      <div class="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg px-3 py-2">
        <button data-play="${realIndex}" class="flex-1 text-left text-sm truncate hover:text-red-500 transition">
          <i class="fa-solid fa-circle-play mr-2 text-red-600"></i>${item.name}
        </button>
        <button data-remove="${realIndex}" class="text-neutral-400 hover:text-red-500 text-sm px-1">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll("[data-play]").forEach(btn => {
    btn.onclick = () => {
      const item = links[btn.dataset.play];
      window._playLink(item.link, item.name);
    };
  });
  listEl.querySelectorAll("[data-remove]").forEach(btn => {
    btn.onclick = () => {
      const updated = links.filter((_, idx) => idx !== Number(btn.dataset.remove));
      saveLinks(updated);
      renderLinkList(document.getElementById("searchInput").value.trim());
    };
  });
}

function setupSearch() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    renderLinkList(e.target.value.trim());
  });
}

// ---------- Form thêm video ----------
function setupSaveForm() {
  const errorMsg = document.getElementById("errorMsg");

  function addLink() {
    const nameInput = document.getElementById("nameInput");
    const linkInput = document.getElementById("linkInput");
    const link = linkInput.value.trim();
    if (!link) return;
    errorMsg.classList.add("hidden");

    const links = getSavedLinks();
    if (links.some(item => item.link === link)) {
      errorMsg.textContent = "Link này đã được lưu rồi.";
      errorMsg.classList.remove("hidden");
      return;
    }

    const name = nameInput.value.trim() || (getYouTubeId(link) ? "Video YouTube" : "Video chưa đặt tên");
    links.push({ name, link });
    saveLinks(links);
    nameInput.value = "";
    linkInput.value = "";
    renderLinkList(document.getElementById("searchInput").value.trim());
  }

  document.getElementById("addBtn").onclick = addLink;
  document.getElementById("linkInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addLink();
  });
}

// ---------- Player ----------
function setupPlayer() {
  const video = document.getElementById("videoTag");
  const playBtn = document.getElementById("playBtn");
  const seek = document.getElementById("seek");
  const volume = document.getElementById("volume");
  const timeLabel = document.getElementById("time");
  const controls = document.getElementById("controls");
  const seekFlash = document.getElementById("seekFlash");
  const seekIcon = document.getElementById("seekIcon");
  const seekText = document.getElementById("seekText");
  const playerBox = document.getElementById("playerBox");
  const errorMsg = document.getElementById("errorMsg");
  const playerDiv = document.getElementById("player");
  const ytWrap = document.getElementById("ytWrap");
  const ytFrame = document.getElementById("ytFrame");
  let hideTimer;

  function showControls() {
    controls.style.opacity = "1";
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!video.paused) controls.style.opacity = "0"; }, 2500);
  }

  playBtn.onclick = () => (video.paused ? video.play() : video.pause());
  video.onplay = () => { playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; showControls(); };
  video.onpause = () => { playBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; controls.style.opacity = "1"; };
  video.ontimeupdate = () => {
    seek.value = (video.currentTime / video.duration) * 100 || 0;
    timeLabel.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
  };
  video.onerror = () => {
    errorMsg.textContent = "Link không hợp lệ hoặc không phát được.";
    errorMsg.classList.remove("hidden");
    playerDiv.classList.add("hidden");
  };

  seek.oninput = () => (video.currentTime = (seek.value / 100) * video.duration);
  volume.oninput = () => (video.volume = volume.value);
  document.getElementById("back10").onclick = () => (video.currentTime -= 10);
  document.getElementById("fwd10").onclick = () => (video.currentTime += 10);
  video.onclick = () => { video.paused ? video.play() : video.pause(); showControls(); };
  playerBox.onmousemove = showControls;

  function flashSeek(dir, text) {
    seekIcon.className = dir === "back" ? "fa-solid fa-backward" : "fa-solid fa-forward";
    seekText.textContent = text;
    seekFlash.classList.remove("hidden");
    seekFlash.classList.add("flex");
    setTimeout(() => { seekFlash.classList.add("hidden"); seekFlash.classList.remove("flex"); }, 500);
  }

  let lastTapLeft = 0, lastTapRight = 0;
  document.getElementById("leftTap").ontouchend = () => {
    const now = Date.now();
    if (now - lastTapLeft < 300) { video.currentTime -= 10; flashSeek("back", "10s"); }
    lastTapLeft = now;
  };
  document.getElementById("rightTap").ontouchend = () => {
    const now = Date.now();
    if (now - lastTapRight < 300) { video.currentTime += 10; flashSeek("fwd", "10s"); }
    lastTapRight = now;
  };
  document.getElementById("leftTap").ondblclick = () => { video.currentTime -= 10; flashSeek("back", "10s"); };
  document.getElementById("rightTap").ondblclick = () => { video.currentTime += 10; flashSeek("fwd", "10s"); };

  window._playLink = (link, name) => {
    errorMsg.classList.add("hidden");
    const ytId = getYouTubeId(link);
    if (ytId) {
      video.pause();
      playerDiv.classList.add("hidden");
      ytFrame.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
      ytWrap.classList.remove("hidden");
      // YouTube nhúng qua iframe: không can thiệp được, nên không đặt Media Session ở đây
    } else {
      ytWrap.classList.add("hidden");
      ytFrame.src = "";
      video.src = link;
      playerDiv.classList.remove("hidden");
      video.play();
      setupMediaSession(name || "Video đang phát");
    }
    document.getElementById("player").scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ---------- Media Session: điều khiển từ màn hình khóa / thông báo ----------
  function setupMediaSession(title) {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: "MyTube",
    });

    navigator.mediaSession.setActionHandler("play", () => video.play());
    navigator.mediaSession.setActionHandler("pause", () => video.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => (video.currentTime -= 10));
    navigator.mediaSession.setActionHandler("seekforward", () => (video.currentTime += 10));
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) video.currentTime = details.seekTime;
    });

    // Cập nhật trạng thái play/pause cho hệ điều hành biết
    video.addEventListener("play", () => (navigator.mediaSession.playbackState = "playing"));
    video.addEventListener("pause", () => (navigator.mediaSession.playbackState = "paused"));
  }
}

// ---------- Khởi chạy ----------
setupTheme();
setupSearch();
setupSaveForm();
setupPlayer();
renderLinkList();
