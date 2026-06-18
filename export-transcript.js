/**
 * export-transcript.js
 * Lê o transcript JSONL desta sessão e gera um arquivo HTML
 * que o Word abre diretamente (Arquivo > Salvar como > .docx).
 *
 * Uso: node export-transcript.js
 */

const fs = require('fs');
const path = require('path');

const JSONL = 'C:/Users/Daniel/.claude/projects/E--IA-PROJECTS-BIBLIOTECAPAIXAOCORTES/25294ace-a6a6-460c-879a-ae7e10fe8c7b.jsonl';
const OUT   = path.join(__dirname, 'transcript-biblioteca.html');

// ── Lê e parseia o JSONL ────────────────────────────────────────────────────
const lines = fs.readFileSync(JSONL, 'utf8').trim().split('\n');
const objs  = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

// Mantém apenas mensagens de usuário e assistente, em ordem de timestamp
const messages = objs
  .filter(o => o.type === 'user' || o.type === 'assistant')
  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

// ── Extrai texto de um conteúdo (string ou array de blocos) ─────────────────
function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(b => b.type === 'text')   // ignora "thinking", tool_use, tool_result
      .map(b => b.text || '')
      .join('\n');
  }
  return '';
}

// ── Escapa HTML ─────────────────────────────────────────────────────────────
function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Converte Markdown básico para HTML inline ───────────────────────────────
function md(str) {
  return esc(str)
    // blocos de código ```...```
    .replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) =>
      `<pre style="background:#f4f4f4;border:1px solid #ddd;padding:10px;border-radius:4px;font-family:Consolas,monospace;font-size:10pt;white-space:pre-wrap;word-break:break-all;">${code}</pre>`)
    // código inline `...`
    .replace(/`([^`]+)`/g, '<code style="background:#f4f4f4;padding:1px 4px;border-radius:3px;font-family:Consolas,monospace;font-size:10pt;">$1</code>')
    // negrito **...**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // itálico *...*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // títulos ### ## #
    .replace(/^### (.+)$/gm, '<h3 style="font-size:12pt;margin:8px 0 4px;">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:13pt;margin:10px 0 4px;">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:15pt;margin:12px 0 6px;">$1</h1>')
    // linhas horizontais ---
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #ccc;margin:8px 0;">')
    // itens de lista - item
    .replace(/^- (.+)$/gm, '<li style="margin:2px 0;">$1</li>')
    // quebras de linha
    .replace(/\n/g, '<br>');
}

// ── Monta o HTML ────────────────────────────────────────────────────────────
let turns = '';
let msgCount = 0;

for (const obj of messages) {
  const role    = obj.type;                        // 'user' | 'assistant'
  const content = obj.message?.content;
  const text    = extractText(content).trim();
  const ts      = new Date(obj.timestamp).toLocaleString('pt-BR');

  if (!text) continue;
  msgCount++;

  const isUser  = role === 'user';
  const label   = isUser ? '👤 Usuário' : '🤖 Assistente';
  const bgColor = isUser ? '#e8f4fd' : '#f9f9f9';
  const border  = isUser ? '#90cdf4' : '#d1d5db';

  turns += `
    <div style="margin-bottom:20px;border-left:4px solid ${border};background:${bgColor};padding:12px 16px;border-radius:0 8px 8px 0;page-break-inside:avoid;">
      <div style="font-size:9pt;color:#666;margin-bottom:6px;font-weight:bold;">
        ${label} &nbsp;·&nbsp; <span style="font-weight:normal;">${ts}</span>
      </div>
      <div style="font-size:11pt;line-height:1.6;color:#1a1a1a;">
        ${md(text)}
      </div>
    </div>`;
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Transcript — Biblioteca Paixão Côrtes</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1 style="font-size:18pt;color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:8px;">
    📚 Biblioteca Paixão Côrtes — Transcript da Sessão
  </h1>
  <p style="color:#666;font-size:10pt;margin-bottom:30px;">
    Sessão: <code>25294ace-a6a6-460c-879a-ae7e10fe8c7b</code> &nbsp;·&nbsp;
    Exportado em: ${new Date().toLocaleString('pt-BR')} &nbsp;·&nbsp;
    ${msgCount} mensagens
  </p>

  ${turns}

  <hr style="margin-top:40px;border:none;border-top:1px solid #ccc;">
  <p style="text-align:center;color:#999;font-size:9pt;">
    Para salvar como .docx: Arquivo → Salvar como → Documento do Word (.docx)
  </p>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`✅ Arquivo gerado: ${OUT}`);
console.log(`   ${msgCount} mensagens exportadas.`);
console.log(`\n   Abra o arquivo no Word e salve como .docx.`);
