// ùuuu giỏi vậy tarrr, biết vào trong này luôn. Xem thôi đừng phá đấy nhá =))
// 🌍 DỮ LIỆU & CẤU HÌNH
let EVENTS = [], FRIENDS = [];
const map = L.map('map', { zoomControl: true }).setView([15.5, 107], 5);
L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', { maxZoom: 12 }).addTo(map);

const pathGlow = L.polyline([], { color: '#2ecc71', opacity: 0.25, weight: 10 }).addTo(map);
const pathLine = L.polyline([], { color: '#2ecc71', opacity: 0.95, weight: 4 }).addTo(map);
const markers = [];
const friendsLayer = L.layerGroup().addTo(map);

let current = -1;
let timelineWasVisible = true;
const audio = document.getElementById('bgm');
const muteBtn = document.getElementById('muteBtn');
const overlays = {
  intro: document.getElementById('intro'),
  story: document.getElementById('storyOverlay'),
  invite: document.getElementById('inviteOverlay')
};
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const closeStoryBtn = document.getElementById('closeStoryBtn');
const showFriendsBtn = document.getElementById('showFriendsBtn');
const inviteCloseBtn = document.getElementById('inviteCloseBtn');

// 🎵 ÂM THANH
let isMuted = false;
muteBtn.onclick = () => {
  isMuted = !isMuted;
  audio.muted = isMuted;
  muteBtn.textContent = isMuted ? '🔈' : '🔊';
};

audio.onerror = () => {
  if (!audio.dataset.fallback) {
    audio.dataset.fallback = '1';
    audio.innerHTML = `<source src="https://www.dropbox.com/scl/fi/w5vhpt271i0nc9po6saux/Everytime.mp3?dl=1" type="audio/mpeg">`;
    audio.load();
    audio.play().catch(() => {});
  }
};

// ⚙️ HÀM TIỆN ÍCH
const delay = (ms = 1000) => new Promise(r => setTimeout(r, ms));
const flyToEvent = (lat, lng, zoom = 10, dur = 4) => map.flyTo([lat, lng], zoom, { duration: dur, easeLinearity: 0.25 });
const flyToFriend = (lat, lng) => map.flyTo([lat, lng], 10, { duration: 3, easeLinearity: 0.25 });

function fadeInMarker(m, scale = 6, stepTime = 40) {
  let step = 0;
  const fade = setInterval(() => {
    step += 0.1;
    m.setStyle({ radius: step * scale, fillOpacity: step * 0.9, opacity: step * 0.9 });
    if (step >= 1) clearInterval(fade);
  }, stepTime);
}

// 📦 LOAD DỮ LIỆU
async function loadData() {
  try {
    const [e, f] = await Promise.all([fetch('events.json'), fetch('friends.json')]);
    EVENTS = await e.json();
    FRIENDS = await f.json();
  } catch {
    console.error('⚠️ Không thể tải dữ liệu');
  }
}

// 📍 TẠO MARKER SỰ KIỆN
// 📍 TẠO MARKER SỰ KIỆN — có icon theo giai đoạn
function bindMarkers() {
  markers.length = 0;

  EVENTS.forEach((e, i) => {
    let iconUrl;
    if (i === 0) {
      iconUrl = 'https://cdn-icons-png.flaticon.com/512/3010/3010995.png'; // 🏠 nhà
    } else if (i === EVENTS.length - 1) {
      iconUrl = 'https://cdn-icons-png.flaticon.com/512/2995/2995600.png'; // 🎓 tốt nghiệp
    } else if (e.place && e.place.match(/Thực tập|Thực tế|Nha Trang|Long An|Ninh Thuận|Vĩnh Hy/i)) {
      iconUrl = 'https://cdn-icons-png.flaticon.com/512/2028/2028376.png'; // 🌄 chuyến đi
    } else if (e.place && e.place.match(/Tp\. Hồ Chí Minh|Thủ Đức|Trường|Linh Trung|Dĩ An/i)) {
      iconUrl = 'https://cdn-icons-png.flaticon.com/512/4185/4185714.png'; // 🎒 đi học
    } else if (e.place && e.place.match(/Làm|Công ty|Tân Bình/i)) {
      iconUrl = 'https://cdn-icons-png.flaticon.com/512/2163/2163311.png'; // 💼 đi làm
    } else {
      iconUrl = 'https://cdn-icons-png.flaticon.com/512/1344/1344759.png'; // pin mặc định
    }

    const iconEvent = L.icon({
      iconUrl,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -30]
    });

    const imgs = Array.isArray(e.img)
      ? e.img.map(src => `<img class="event-img" src="${src}" loading="lazy" alt="${e.title}">`).join('')
      : e.img ? `<img class="event-img" src="${e.img}" alt="${e.title}">` : '';

    const html = `
      <h3>${e.title} <span class="badge">${e.date || ''}</span></h3>
      <p><b>Địa điểm:</b> ${e.place || ''}</p>
      <p>${e.desc || ''}</p>
      ${imgs ? `<div class="${Array.isArray(e.img) && e.img.length > 1 ? 'img-row' : 'img-single'}">${imgs}</div>` : ''}
    `;

    const m = L.marker(e.coords, { icon: iconEvent }).bindPopup(html, { maxWidth: 460 });
    markers.push(m);
  });
}

// 🚀 BẮT ĐẦU HÀNH TRÌNH
async function start() {
  await loadData();
  bindMarkers();
  overlays.intro.classList.add('hidden');
  audio.currentTime = 0;
  audio.volume = 0.8;
  audio.play().catch(err => console.warn('Autoplay bị chặn:', err));

  // 🎮 Hiện các nút điều khiển
  const controls = document.getElementById("controls");
  controls.classList.add("show");

  // 🖼️ Ẩn timeline mặc định khi bắt đầu
  const timeline = document.getElementById("timeline");
  timeline.classList.remove("show");
  timeline.style.display = "none";
  controls.classList.add("controls-lower"); // hạ nút xuống cho cân đối

  timelineWasVisible = false; // lưu trạng thái mặc định là ẩn

  showEvent(0);
}

async function showEvent(index, forward = true) {
  current = index;
  prevBtn.disabled = current <= 0;
  nextBtn.disabled = current >= EVENTS.length - 1;

  const e = EVENTS[index];
  const coords = L.latLng(e.coords);
  const points = forward ? [...pathLine.getLatLngs(), coords] : EVENTS.slice(0, index + 1).map(ev => ev.coords);
  pathLine.setLatLngs(points);
  pathGlow.setLatLngs(points);

  flyToEvent(e.coords[0], e.coords[1]);

  // 💡 Hiện marker khi đến mốc
  if (!map.hasLayer(markers[index])) {
    markers[index].addTo(map);
  }

  markers[index].openPopup();
  if (e.music) swapMusic(e.music);

  if (index === EVENTS.length - 1) {
    await delay(2500);
    overlays.story.classList.remove('hidden');
    celebrate();
  }
  // 🖼️ Thêm ảnh sự kiện vào timeline
// 🖼️ Thêm ảnh sự kiện vào timeline (ảnh mới lên đầu)
const timelineBox = document.getElementById("timelineContent");
if (e.img) {
  const imgs = Array.isArray(e.img) ? e.img : [e.img];
  imgs.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.className = "timeline-img";
    // thêm ảnh mới lên đầu (ảnh cũ tự lùi xuống)
    timelineBox.prepend(img);
    setTimeout(() => img.classList.add("show"), 100);
  });
  // Cuộn lại đầu để luôn thấy ảnh mới nhất
  timelineBox.scrollTo({ left: 0, behavior: "smooth" });}
}

function swapMusic(src) {
  if (!src) return;
  audio.pause();
  audio.innerHTML = `<source src="${src}" type="audio/mpeg">`;
  audio.load();
  audio.muted = isMuted;
  audio.play().catch(() => {});
}

// 🎊 PHÁO GIẤY
function celebrate() {
  const seq = [
    { particleCount: 160, spread: 80, startVelocity: 45 },
    { particleCount: 200, spread: 120, startVelocity: 55 },
    { particleCount: 260, spread: 140, startVelocity: 60 }
  ];
  seq.forEach((s, i) =>
    setTimeout(() => confetti({ ...s, origin: { y: 0.6 } }), i * 700)
  );
  const end = Date.now() + 2500;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// 💛 HIỆN BẠN BÈ — Giữ marker để người xem có thể click
async function revealFriendsSequential() {
  // 🧭 Ẩn timeline khi xem bạn bè
  document.getElementById("timeline").style.display = "none";
  const controls = document.getElementById("controls");
  controls.style.bottom = "20px";
  friendsLayer.clearLayers();
  markers.forEach(m => map.removeLayer(m));
  pathLine.remove();
  pathGlow.remove();

  // 🔤 Bắt đầu hiệu ứng chữ chạy trong lúc hiển thị bạn bè
  const typingFx = typingDuringFriends();

  for (const f of FRIENDS) {
    const friendIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/2107/2107957.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -28]
    });

    const m = L.marker(f.coords, { icon: friendIcon })
      .bindPopup(`<b>${f.name}</b><br>${f.msg || ''}`)
      .addTo(friendsLayer);

    fadeInMarker(m, 6, 40);
    flyToFriend(...f.coords);
    m.openPopup();
    await delay(2500);
    m.closePopup();
    await delay(300);
  }

  // 🛑 Dừng chữ chạy khi hết bạn bè
  typingFx.stop();

  const EXTRA_FRIENDS = [
    [10.181312,105.02934],[21.314253,106.41557],[9.136016,105.185867],[9.741704,105.759187],
    [22.744235,106.085667],[15.681718,108.21346],[12.920833,108.445585],[21.710477,103.023615],
    [11.435488,107.035754],[10.495061,105.897457],[13.889082,108.440932],[20.999186,105.699851],
    [18.290224,105.737081],[20.869045,106.507798],[16.330726,107.519444],[20.614969,106.276306],
    [22.316816,103.187044],[11.672261,107.970793],[21.838538,106.620681],[22.059544,104.3492],
    [19.236351,104.946119],[20.307646,106.051826],[21.014025,105.285948],[14.76793,108.145635],
    [21.240554,107.267896],[17.239355,106.529388],[21.192675,104.071508],[11.049251,106.166868],
    [22.022424,105.825298],[20.045184,105.319816],[10.865813,106.845196],[22.488711,105.10103],[9.996202,106.289283]
  ];
  EXTRA_FRIENDS.forEach((coords, idx) => {
    const extraIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/2107/2107957.png',
      iconSize: [16, 16],
      iconAnchor: [13, 16],
      popupAnchor: [0, -20]
    });

    setTimeout(() => {
      const m = L.marker(coords, { icon: extraIcon }).addTo(friendsLayer);
      m._icon.style.transform = 'scale(0)';
      setTimeout(() => m._icon.style.transform = 'scale(1)', 50);
    }, idx * 40);
  });

  const msg = L.popup({ closeButton: false })
    .setLatLng([10.853389081049862, 106.64577969192148])
    .setContent(`<b>…và còn rất nhiều người khác nữa 💫</b><br>Mỗi người một nơi, nhưng tất cả<br>đều là một phần của hành trình này.`)
    .openOn(map);

  await delay(4000);
  map.closePopup(msg);

  map.flyToBounds(L.latLngBounds([...FRIENDS.map(f => f.coords), ...EXTRA_FRIENDS]), {
    padding: [40, 40], duration: 3
  });
  await delay(3000);
  overlays.invite.classList.remove('hidden');
  startFireworks();
}

// ✨ HIỆU ỨNG SAO & PHÁO HOA
const canvasStar = document.getElementById('starfield');
const ctxStar = canvasStar.getContext('2d');
let stars = [];

function resizeCanvas() {
  canvasStar.width = window.innerWidth;
  canvasStar.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function startStarfield() {
  stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * canvasStar.width,
    y: Math.random() * canvasStar.height,
    size: Math.random() * 2,
    speed: Math.random() * 0.3 + 0.05
  }));
  (function animate() {
    ctxStar.clearRect(0, 0, canvasStar.width, canvasStar.height);
    stars.forEach(s => {
      ctxStar.fillStyle = 'white';
      ctxStar.globalAlpha = 0.6 + Math.random() * 0.4;
      ctxStar.beginPath();
      ctxStar.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctxStar.fill();
      s.y += s.speed;
      if (s.y > canvasStar.height) s.y = 0;
    });
    requestAnimationFrame(animate);
  })();
}

function startFireworks() {
  const canvas = document.getElementById('fireworks');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.opacity = 1;

  let fireworks = [];
  let running = true;

  const random = (min, max) => Math.random() * (max - min) + min;

  function createFirework(x, y) {
    const color = `hsl(${random(0, 360)}, 100%, 60%)`;
    return Array.from({ length: 80 }, () => ({
      x, y,
      angle: random(0, Math.PI * 2),
      speed: random(2, 6),
      alpha: 1,
      color
    }));
  }

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    fireworks.forEach((particles, i) => {
      particles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed + 0.5;
        p.alpha -= 0.01;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      if (particles.every(p => p.alpha <= 0)) fireworks.splice(i, 1);
    });
    ctx.globalAlpha = 1;
    if (running) requestAnimationFrame(draw);
  }

  draw();
  setInterval(() => {
    for (let i = 0; i < 3; i++)
      fireworks.push(createFirework(random(0, canvas.width), random(0, canvas.height / 2)));
  }, 500);
}

// 🎮 GIAO DIỆN NÚT
startBtn.onclick = start;
nextBtn.onclick = () => current < EVENTS.length - 1 && showEvent(current + 1);
prevBtn.onclick = () => current > 0 && showEvent(current - 1);
closeStoryBtn.onclick = async () => {
  overlays.story.classList.add('hidden');
  await delay(200);
  overlays.invite.classList.remove('hidden');
  startStarfield();
  startFireworks();
// 💌 Lưu trạng thái timeline trước khi ẩn
const timeline = document.getElementById("timeline");
const controls = document.getElementById("controls");
timelineWasVisible = timeline.style.display !== "none"; // true nếu đang hiển thị

// 🧭 Ẩn timeline và controls khi mở lời mời
timeline.style.display = "none";
controls.style.display = "none";

// 🧭 Ẩn timeline và nút điều khiển khi hiển thị lời mời
  document.getElementById("timeline").style.display = "none";
  document.getElementById("controls").style.display = "none";

// 🔊 Điều khiển âm thanh
  const bgm = document.getElementById('bgm');
  const fireworks = document.getElementById('fireworkSound');

// Tạm tắt nhạc nền và bật nhạc pháo hoa
  bgm.pause();
  fireworks.currentTime = 0;
  fireworks.volume = 0.8;
  fireworks.play().catch(() => {});
};
showFriendsBtn.onclick = () => {
  overlays.story.classList.add('hidden');
  revealFriendsSequential();
};
// 💬 Hiệu ứng chữ gõ chạy trong lúc hiển thị bạn bè
function typingDuringFriends() {
 const messages = [
  "Những người bạn đã cùng tôi đi qua hành trình này 💚",
  "Mỗi người một nơi nhưng kỷ niệm thì vẫn còn mãi ✨",
  "Cảm ơn vì đã đồng hành cùng tôi trong những ngày tháng học tập và trưởng thành 🎓",
  "Cảm ơn tất cả mọi người vì đã chia sẻ cùng tôi những niềm vui và cả những khó khăn 🌿",
  "Có những ngày chỉ cần ngồi bên nhau thôi cũng thấy lòng bình yên lắm ☕",
  "Những chuyến đi, những buổi học, những bức ảnh cùng nhau sẽ luôn là ký ức quý giá 📸",
  "Cảm ơn vì đã luôn giúp đỡ và động viên để tôi có thêm niềm tin và năng lượng ❤️",
  "Có lúc mệt có lúc nản nhưng nhờ có bạn bè mà mọi thứ đều trở nên dễ dàng hơn 🌈",
  "Mọi người là phần không thể thiếu trong hành trình này và tôi thật sự trân quý điều đó 💫",
  "Hy vọng sau này dù mỗi người một hướng chúng ta vẫn nhớ về những ngày tươi đẹp ấy 😊",
  "Chúc cho tất cả chúng ta gặp nhiều may mắn và thành công trên con đường phía trước 🌻",
  "Cảm ơn mọi người rất nhiều vì đã là một phần thanh xuân tuyệt vời của tôi 💕"
];


  const box = document.createElement("div");
  box.id = "typingOverlay";
  Object.assign(box.style, {
    position: "fixed",
    top: "10%",
    left: "50%",  
    transform: "translateX(-50%)",
    fontSize: "1.4rem",
    color: "#fff",
    textShadow: "0 0 8px rgba(0,0,0,0.7)",
    fontWeight: "500",
    textAlign: "center",
    whiteSpace: "pre",
    zIndex: 1200,
    fontFamily: "system-ui, sans-serif",
    transition: "opacity .3s"
  });
  document.body.appendChild(box);

  let isRunning = true;

  async function typeAndErase(text) {
    for (let i = 0; i < text.length && isRunning; i++) {
      box.textContent += text[i];
      await delay(55);
    }
    await delay(1500);
    for (let i = text.length; i >= 0 && isRunning; i--) {
      box.textContent = text.slice(0, i);
      await delay(25);
    }
    await delay(300);
  }

  (async function run() {
    while (isRunning) {
      for (const msg of messages) await typeAndErase(msg);
    }
  })();

  return {
    stop() {
      isRunning = false;
      box.style.opacity = 0;
      setTimeout(() => box.remove(), 400);
    }
  };
}

// 🖼️ Nút bật/tắt timeline (đổi màu thay vì đổi chữ)
const toggleTimelineBtn = document.getElementById("toggleTimelineBtn");

toggleTimelineBtn.onclick = () => {
  const timeline = document.getElementById("timeline");
  const controls = document.getElementById("controls");
  const isHidden = timeline.style.display === "none" || !timeline.classList.contains("show");

  if (isHidden) {
    // 👉 Hiện timeline
    timeline.style.display = "flex";
    setTimeout(() => timeline.classList.add("show"), 10);
    controls.classList.remove("controls-lower");

    // Đổi màu nút thành xanh (đang bật)
    toggleTimelineBtn.classList.remove("off");
    timelineWasVisible = true;
  } else {
    // 👉 Ẩn timeline
    timeline.classList.remove("show");
    setTimeout(() => (timeline.style.display = "none"), 400);
    controls.classList.add("controls-lower");
    toggleTimelineBtn.classList.toggle("off");
    // Đổi màu nút thành xám (đang tắt)
    toggleTimelineBtn.classList.add("off");
    timelineWasVisible = false;
  }
};

// 💡 Khi đóng lời mời
inviteCloseBtn.onclick = () => {
  overlays.invite.classList.add('hidden');

  const timeline = document.getElementById("timeline");
  const controls = document.getElementById("controls");

  // ✅ Chỉ hiện lại nếu trước đó timeline đang bật
  if (timelineWasVisible) {
    timeline.style.display = "flex";
    setTimeout(() => timeline.classList.add("show"), 10);
  }

  // ✅ Luôn hiện controls
  controls.style.display = "flex";
  setTimeout(() => controls.classList.add("show"), 10);

  // 🔼 Đưa nút điều khiển trở lại vị trí cũ
  controls.style.bottom = "130px";

  // 🧭 Hiển thị lại đường hành trình & markers
  map.flyTo([15.5, 107], 5, { duration: 3 });
  map.addLayer(pathLine);
  map.addLayer(pathGlow);
  markers.forEach(m => m.addTo(map));

  const canvas = document.getElementById('fireworks');
  canvas.style.opacity = 1;
  startFireworks();

  // 🔊 Âm thanh
  const bgm = document.getElementById('bgm');
  const fireworks = document.getElementById('fireworkSound');
  fireworks.pause();
  fireworks.currentTime = 0;
  bgm.play().catch(() => {});

  setTimeout(() => {
    canvas.style.opacity = 0;
  }, 2000);
};


