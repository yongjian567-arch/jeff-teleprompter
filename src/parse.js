// 文案解析:支持 .txt(UTF-8/GBK)、.md、.docx(mammoth)、.doc(word-extractor)、.rtf
const mammoth = require('mammoth');
const iconv = require('iconv-lite');
const WordExtractor = require('word-extractor');

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

// 解析 .doc(老版 Word):word-extractor 直接吃 Buffer,无需临时文件
async function parseDoc(buffer) {
  const doc = await new WordExtractor().extract(buffer);
  return (doc && doc.getBody && doc.getBody()) || '';
}

// 解析 .rtf(富文本):剥离控制字,还原中文
function parseRtf(buffer) {
  let s = buffer.toString('latin1');
  s = stripRtfHeader(s);
  // \uN 还原 Unicode(吃掉后面一个后备字符,常见为 ? 或空格)
  s = s.replace(/\\u(-?\d+)./g, (_m, n) => {
    const c = parseInt(n, 10);
    return c > 0 ? String.fromCharCode(c) : '';
  });
  // \'hh 还原单字节
  s = s.replace(/\\'([0-9a-fA-F]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  // 换行 / 制表
  s = s.replace(/\\par\b/g, '\n').replace(/\\line\b/g, '\n').replace(/\\tab\b/g, ' ');
  // 去掉剩余控制字
  s = s.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');
  // 去掉花括号
  s = s.replace(/[{}]/g, '');
  return s;
}

// 跳过 RTF 表头里的分组(fonttbl / colortbl / stylesheet / info 等),按括号深度匹配
function stripRtfHeader(s) {
  const keys = ['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'header', 'footer'];
  for (const key of keys) {
    const m = new RegExp('\\\\' + key + '\\b').exec(s);
    if (!m) continue;
    const open = s.lastIndexOf('{', m.index);
    if (open < 0) continue;
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') { depth--; if (depth <= 0) { s = s.slice(0, open) + s.slice(i + 1); break; } }
    }
  }
  return s;
}

async function parseFileBuffer(name, buffer) {
  const lower = (name || '').toLowerCase();
  let text = '';
  if (lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || '';
  } else if (lower.endsWith('.doc')) {
    text = await parseDoc(buffer);
  } else if (lower.endsWith('.rtf')) {
    text = parseRtf(buffer);
  } else if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    text = decodeText(buffer);
  } else {
    throw new Error('暂不支持该格式(' + (name || '未知') + ')。支持:.txt / .md / .docx / .doc / .rtf');
  }
  return { name, text, segments: splitSegments(text) };
}

module.exports = { parseFileBuffer, decodeText, splitSegments };
