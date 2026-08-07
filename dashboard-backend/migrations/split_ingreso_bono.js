// Re-splits the 18 existing 05_INGRESO_BONO_part*.sql files into many smaller,
// self-contained INSERT statements. Uses a quote/paren-aware scanner (NOT
// line-based) because LOG_TALANA contains embedded lone \r characters that
// break any line-based splitter.
const fs = require('fs');
const path = require('path');

const CHUNK_DIR = path.join(__dirname, 'export_chunks');
const OUT_DIR = path.join(CHUNK_DIR, 'INGRESO_BONO_split');
const MAX_BYTES = 400 * 1024; // ~400 KB target per file

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f));

let big = '';
for (let i = 1; i <= 18; i++) {
  big += fs.readFileSync(path.join(CHUNK_DIR, `05_INGRESO_BONO_part${i}.sql`), 'utf8');
}

const headerMatch = big.match(/INSERT INTO INGRESO_BONO \([^)]*\) VALUES/);
if (!headerMatch) throw new Error('INSERT header not found');
const header = headerMatch[0];

const segments = big.split(header); // segments[0] = boilerplate before first statement

let partNum = 0;
let rowsBuffer = [];
let bufferBytes = 0;
let totalRows = 0;

function flush() {
  if (rowsBuffer.length === 0) return;
  partNum++;
  const fname = path.join(OUT_DIR, `05_INGRESO_BONO_part${String(partNum).padStart(3, '0')}.sql`);
  const content = 'USE Sistema_Bonos;\nGO\n\n' + header + '\n' + rowsBuffer.join(',\n') + ';\nGO\n';
  fs.writeFileSync(fname, content, 'utf8');
  totalRows += rowsBuffer.length;
  rowsBuffer = [];
  bufferBytes = 0;
}

const WS = /\s/;

function parseRowsFromSegment(seg) {
  let i = 0;
  const n = seg.length;
  while (i < n && WS.test(seg[i])) i++;
  while (i < n && seg[i] === '(') {
    const rowStart = i;
    let depth = 0;
    let inStr = false;
    for (; i < n; i++) {
      const c = seg[i];
      if (inStr) {
        if (c === "'") {
          if (seg[i + 1] === "'") { i++; continue; }
          inStr = false;
        }
        continue;
      }
      if (c === "'") { inStr = true; continue; }
      if (c === '(') { depth++; continue; }
      if (c === ')') {
        depth--;
        if (depth === 0) { i++; break; }
        continue;
      }
    }
    const row = seg.slice(rowStart, i);
    const rowBytes = Buffer.byteLength(row, 'utf8');
    if (rowsBuffer.length > 0 && bufferBytes + rowBytes > MAX_BYTES) flush();
    rowsBuffer.push(row);
    bufferBytes += rowBytes;
    while (i < n && WS.test(seg[i])) i++;
    if (seg[i] === ',') { i++; while (i < n && WS.test(seg[i])) i++; continue; }
    if (seg[i] === ';') { i++; break; }
    break;
  }
}

for (let s = 1; s < segments.length; s++) {
  parseRowsFromSegment(segments[s]);
}
flush();

const sizes = fs.readdirSync(OUT_DIR).map(f => fs.statSync(path.join(OUT_DIR, f)).size);
const totalOut = sizes.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({
  statementsFound: segments.length - 1,
  filesCreated: partNum,
  totalRows,
  totalOutBytes: totalOut,
  maxFile: Math.max(...sizes),
  minFile: Math.min(...sizes),
}, null, 2));
