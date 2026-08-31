// Jeff 提词器 — 前端逻辑:拖拽 / 解析 / 滚动引擎 / 速度 / 键盘
(function () {
  'use strict';
  const api = window.api;

const viewport = document.getElementById('viewport');
const track = document.getElementById('track');
const dropzone = document.getElementById('dropzone');
const speedVal = document.getElementById('speed-val');
const btnOpen = document.getElementById('btn-open');
const btnPlus = document.getElementById('btn-plus');
const btnMinus = document.getElementById('btn-minus');
const btnFull = document.getElementById('btn-full');

const SLOT = 112;        // 每句占用的固定高度(px)
const BASE_FONT = 40;    // 居中句的最大字号(px)
const MIN_SPEED = 80;
const MAX_SPEED = 500;
const DEFAULT_SPEED = 250;

let segments = [];
let speed = DEFAULT_SPEED;
let playing = false;
let offset = 0;          // 当前滚动偏移(px)
let maxOffset = 0;
let centerY = [];        // 每句在轨道坐标系里的中心位置(px)
let currentIdx = 0;      // 当前居中句的下标
let lastTs = 0;

// 把「字/分钟」换算成滚动速度(px/秒)
function pxPerSec() {
  if (!segments.length) return 0;
  const total = segments.reduce((a, s) => a + s.length, 0);
  const avg = Math.max(1, total / segments.length);
  return (speed / 60) / avg * SLOT;
}

// 二分查找:第一个 >= x 的下标
function lowerBound(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (arr[m] < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}

function layout() {
  const vh = viewport.clientHeight;
  const pad = (vh - SLOT) / 2;
  track.style.paddingTop = pad + 'px';
  track.style.paddingBottom = pad + 'px';
  centerY = segments.map((_, i) => pad + i * SLOT + SLOT / 2);
  maxOffset = Math.max(0, pad + segments.length * SLOT + pad - vh);
  if (offset > maxOffset) offset = maxOffset;
}

function renderSegments() {
  track.innerHTML = '';
  centerY = [];
  segments.forEach((text) => {
    const el = document.createElement('div');
    el.className = 'segment';
    el.textContent = text;
    el.style.fontSize = BASE_FONT + 'px';
    track.appendChild(el);
  });
  layout();
}

// 根据每句到屏幕中心的距离,计算缩放与明暗,实现「居中最大、渐入放大」
function applyScroll() {
  if (!segments.length) return;
  track.style.transform = 'translate3d(0, ' + (-offset) + 'px, 0)';
  const vh = viewport.clientHeight;
  const center = vh / 2;
  const D = vh * 0.42;
  const els = track.children;
  const lo = lowerBound(centerY, offset - vh);
  const hi = lowerBound(centerY, offset + vh);
  for (let i = lo; i < hi && i < els.length; i++) {
    const d = Math.abs((centerY[i] - offset) - center);
    const t = Math.min(1, d / D);
    const scale = 1 - 0.5 * t;
    const op = 1 - 0.88 * t;
    els[i].style.transform = 'scale(' + scale.toFixed(3) + ')';
    els[i].style.opacity = op.toFixed(3);
  }
  // 记录当前居中句下标
  const target = offset + center;
  let idx = lowerBound(centerY, target);
  if (idx > 0 && idx < centerY.length && Math.abs(centerY[idx - 1] - target) < Math.abs(centerY[idx] - target)) {
    idx = idx - 1;
  }
  currentIdx = Math.max(0, Math.min(centerY.length - 1, idx));
}

// 跳到第 idx 句,并把它居中
function jumpTo(idx) {
  if (!segments.length) return;
  idx = Math.max(0, Math.min(segments.length - 1, idx));
  currentIdx = idx;
  offset = centerY[idx] - viewport.clientHeight / 2;
  offset = Math.max(0, Math.min(maxOffset, offset));
  applyScroll();
}

function setSpeed(v) {
  speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, v));
  speedVal.textContent = speed;
}

function showScript(res) {
  segments = res.segments || [];
  if (!segments.length) {
    alert('没有读取到文字,请确认文件是 .txt 或 .docx 格式');
    return;
  }
  renderSegments();
  playing = false;
  offset = 0;
  lastTs = 0;
  dropzone.style.display = 'none';
  track.style.display = 'block';
  applyScroll();
}

async function loadFile(name, buf) {
  const res = await api.parseFile({ name, data: buf });
  if (res && res.ok) showScript(res);
  else alert((res && res.error) || '读取失败');
}

// 拖拽导入
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!f) return;
  const buf = await f.arrayBuffer();
  loadFile(f.name, buf);
});

// 打开文件按钮
btnOpen.onclick = async () => {
  const res = await api.openDialog();
  if (res && res.canceled) return;
  if (res && res.ok) showScript(res);
  else if (res && res.error) alert(res.error);
};

// 速度与全屏
btnPlus.onclick = () => setSpeed(speed + 10);
btnMinus.onclick = () => setSpeed(speed - 10);
btnFull.onclick = () => api.toggleFullscreen();

// 键盘控制
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') { e.preventDefault(); jumpTo(currentIdx - 1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); jumpTo(currentIdx + 1); }
  else if (e.key === ' ') { e.preventDefault(); if (segments.length) playing = !playing; }
  else if (e.key === 'F11') { e.preventDefault(); api.toggleFullscreen(); }
});

window.addEventListener('resize', () => {
  if (segments.length) { layout(); applyScroll(); }
});

setSpeed(DEFAULT_SPEED);

// 主循环:按当前速度持续推进滚动
function frame(ts) {
  if (!lastTs) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (playing && segments.length) {
    offset += pxPerSec() * dt;
    if (offset >= maxOffset) { offset = maxOffset; playing = false; }
    applyScroll();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
