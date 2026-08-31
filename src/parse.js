// 文案解析:支持 .txt(UTF-8 / GBK)与 .docx(mammoth)
const mammoth = require('mammoth');
const iconv = require('iconv-lite');

const MAX_CHARS = 24; // 每句最多字数,保证一行内显示

// 把字节解码成文字,自动识别编码
function decodeText(buf) {
  // UTF-8 BOM
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.slice(3).toString('utf8');
  }
  // UTF-16 LE BOM
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    return buf.slice(2).toString('utf16le');
  }
  // UTF-16 BE BOM(少见,手动换字节序)
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    const swapped = Buffer.from(buf.slice(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  // 先按严格 UTF-8 解码,失败(中文 GBK)则回退 GBK
  try {
    const dec = new TextDecoder('utf-8', { fatal: true });
    return dec.decode(buf);
  } catch (e) {
    return iconv.decode(buf, 'gbk');
  }
}

// 硬切:长串按 max 字一段
function wrapLong(text, max) {
  const out = [];
  let cur = '';
  for (const ch of text) {
    cur += ch;
    if (cur.length >= max) {
      out.push(cur);
      cur = '';
    }
  }
  if (cur) out.push(cur);
  return out;
}

// 把整篇文案切成一条条「读句」
function splitSegments(text) {
  const cleaned = String(text || '').replace(/\r\n?/g, '\n');
  const chunks = cleaned.split(/(?<=[。！？!?；;\n])/);
  const out = [];
  for (let s of chunks) {
    s = s.replace(/[\n\r]+/g, '').trim();
    if (!s) continue;
    if (s.length <= MAX_CHARS) {
      out.push(s);
      continue;
    }
    // 长句优先按逗号 / 顿号切,仍超长再硬切
    const byComma = s.split(/(?<=[，,、])/);
    for (let p of byComma) {
      p = p.trim();
      if (!p) continue;
      if (p.length <= MAX_CHARS) out.push(p);
      else out.push(...wrapLong(p, MAX_CHARS));
    }
  }
  return out;
}

async function parseFileBuffer(name, buffer) {
  const lower = (name || '').toLowerCase();
  let text = '';
  if (lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || '';
  } else if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    text = decodeText(buffer);
  } else {
    throw new Error('暂不支持该格式(' + (name || '未知') + '),请使用 .txt 或 .docx 文件');
  }
  return { name, text, segments: splitSegments(text) };
}

module.exports = { parseFileBuffer, decodeText, splitSegments };
