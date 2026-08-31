// src/parse.js 的单元测试:编码识别 + 断句 + 按扩展名解析
const iconv = require('iconv-lite');
const { parseFileBuffer, decodeText, splitSegments } = require('../src/parse');

describe('decodeText 编码识别', () => {
  test('UTF-8 BOM', () => {
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('你好', 'utf8')]);
    expect(decodeText(buf)).toBe('你好');
  });

  test('UTF-16 LE BOM', () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('你好', 'utf16le')]);
    expect(decodeText(buf)).toBe('你好');
  });

  test('UTF-16 BE BOM', () => {
    const be = Buffer.from(Buffer.from('你好', 'utf16le'));
    be.swap16();
    const buf = Buffer.concat([Buffer.from([0xfe, 0xff]), be]);
    expect(decodeText(buf)).toBe('你好');
  });

  test('无 BOM 的 UTF-8', () => {
    expect(decodeText(Buffer.from('大家好', 'utf8'))).toBe('大家好');
  });

  test('GBK 编码回退', () => {
    const gbk = iconv.encode('中文测试', 'gbk');
    expect(decodeText(gbk)).toBe('中文测试');
  });
});

describe('splitSegments 断句', () => {
  test('按句末标点切分', () => {
    expect(splitSegments('你好。世界!')).toEqual(['你好。', '世界!']);
  });

  test('换行也作为断句符(兼容 \\r\\n)', () => {
    expect(splitSegments('第一行\r\n第二行\n第三行')).toEqual(['第一行', '第二行', '第三行']);
  });

  test('空输入返回空数组', () => {
    expect(splitSegments('')).toEqual([]);
    expect(splitSegments(null)).toEqual([]);
    expect(splitSegments('   ')).toEqual([]);
  });

  test('长句按逗号/顿号切分', () => {
    const part = '字'.repeat(10);
    const text = `${part},${part},${part}。`;
    expect(splitSegments(text)).toEqual([`${part},`, `${part},`, `${part}。`]);
  });

  test('无标点超长句按 24 字硬切', () => {
    const long = '字'.repeat(50);
    expect(splitSegments(long)).toEqual(['字'.repeat(24), '字'.repeat(24), '字'.repeat(2)]);
  });
});

describe('parseFileBuffer 按扩展名解析', () => {
  test('.txt UTF-8', async () => {
    const r = await parseFileBuffer('稿子.txt', Buffer.from('你好。世界。', 'utf8'));
    expect(r.name).toBe('稿子.txt');
    expect(r.text).toBe('你好。世界。');
    expect(r.segments).toEqual(['你好。', '世界。']);
  });

  test('.md 按文本解析', async () => {
    const r = await parseFileBuffer('README.md', Buffer.from('第一段。第二段。', 'utf8'));
    expect(r.segments).toEqual(['第一段。', '第二段。']);
  });

  test('.txt GBK 编码', async () => {
    const gbk = iconv.encode('中文文案', 'gbk');
    const r = await parseFileBuffer('gbk.txt', gbk);
    expect(r.text).toBe('中文文案');
  });

  test('.rtf 解析出中文', async () => {
    const rtf = Buffer.from('{\\rtf1\\ansi\\u20320?\\u22909?}', 'latin1');
    const r = await parseFileBuffer('测试.rtf', rtf);
    expect(r.text).toContain('你好');
  });

  test('不支持的格式抛错', async () => {
    await expect(parseFileBuffer('a.pdf', Buffer.from('x'))).rejects.toThrow('暂不支持该格式');
  });
});
