/**
 * @jest-environment jsdom
 */

// —— 环境准备(必须在 require app.js 之前完成)——
// app.js 启动时会立即调用 requestAnimationFrame,这里用空实现挡住,避免无限循环
global.requestAnimationFrame = jest.fn(() => 1);
global.cancelAnimationFrame = jest.fn();

document.body.innerHTML = `
  <div id="viewport"><div id="track"></div></div>
  <div id="dropzone"></div>
  <span id="speed-val"></span>
  <button id="btn-open"></button>
  <button id="btn-plus"></button>
  <button id="btn-minus"></button>
  <button id="btn-full"></button>
  <button id="btn-exit"></button>
`;

window.alert = jest.fn();
window.api = {
  parseFile: jest.fn(),
  openDialog: jest.fn(),
  toggleFullscreen: jest.fn(),
};

require('../src/app.js');

const $ = (id) => document.getElementById(id);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// 把速度复位到默认 250(速度是模块内部状态,只能通过按钮调节)
function resetSpeed() {
  let cur = parseInt($('speed-val').textContent, 10);
  if (Number.isNaN(cur)) cur = 250;
  while (cur < 250) { $('btn-plus').click(); cur += 10; }
  while (cur > 250) { $('btn-minus').click(); cur -= 10; }
}

// 模拟把一个文件拖进窗口,触发解析
async function dropFile(name) {
  const fakeFile = { name, arrayBuffer: async () => new ArrayBuffer(0) };
  const evt = new Event('drop', { bubbles: true, cancelable: true });
  evt.dataTransfer = { files: [fakeFile] };
  document.dispatchEvent(evt);
  await flush();
}

beforeEach(() => {
  resetSpeed();
  window.alert.mockClear();
  window.api.parseFile.mockReset();
  window.api.openDialog.mockReset();
  window.api.toggleFullscreen.mockReset();
});

describe('速度调节', () => {
  test('默认速度 250', () => {
    expect($('speed-val').textContent).toBe('250');
  });

  test('点 + 一次 +10', () => {
    $('btn-plus').click();
    expect($('speed-val').textContent).toBe('260');
  });

  test('点 − 一次 −10', () => {
    $('btn-minus').click();
    expect($('speed-val').textContent).toBe('240');
  });

  test('速度下限 80', () => {
    for (let i = 0; i < 200; i++) $('btn-minus').click();
    expect($('speed-val').textContent).toBe('80');
  });

  test('速度上限 500', () => {
    for (let i = 0; i < 200; i++) $('btn-plus').click();
    expect($('speed-val').textContent).toBe('500');
  });
});

describe('拖入文件解析', () => {
  test('解析成功渲染读句并进入提词界面', async () => {
    window.api.parseFile.mockResolvedValue({ ok: true, segments: ['第一句。', '第二句。', '第三句。'] });
    await dropFile('稿子.txt');
    const track = $('track');
    expect(track.children.length).toBe(3);
    expect(track.children[0].textContent).toBe('第一句。');
    expect($('dropzone').style.display).toBe('none');
    expect(track.style.display).toBe('block');
  });

  test('解析失败弹出错误提示', async () => {
    window.api.parseFile.mockResolvedValue({ ok: false, error: '暂不支持该格式' });
    await dropFile('x.pdf');
    expect(window.alert).toHaveBeenCalledWith('暂不支持该格式');
  });

  test('读取到空文案时提示', async () => {
    window.api.parseFile.mockResolvedValue({ ok: true, segments: [] });
    await dropFile('空.txt');
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('没有读取到文字'));
  });
});

describe('退出提词', () => {
  test('点退出后回到选文件界面', async () => {
    window.api.parseFile.mockResolvedValue({ ok: true, segments: ['一句。'] });
    await dropFile('稿子.txt');
    expect($('dropzone').style.display).toBe('none');
    $('btn-exit').click();
    expect($('dropzone').style.display).toBe('flex');
    expect($('track').style.display).toBe('none');
    expect($('track').innerHTML).toBe('');
  });
});
