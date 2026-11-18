/**
 * Leitor de CSV simples (aspas, vírgulas e quebras de linha dentro de campos).
 * Devolve uma linha por registro, com as chaves = cabeçalho normalizado
 * (minúsculas, sem acentos, espaços viram "_").  Ex.: "Título" -> "titulo".
 */
export function lerCsv(texto: string): Record<string, string>[] {
  const linhas: string[][] = [];
  let campo = '', linha: string[] = [], aspas = false;
  const t = texto.replace(/^﻿/, '');

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }

  const [cab, ...resto] = linhas.filter(l => l.some(v => v.trim() !== ''));
  if (!cab) return [];
  const chaves = cab.map(normalizarChave);
  return resto.map(l => Object.fromEntries(chaves.map((k, i) => [k, (l[i] ?? '').trim()])));
}

export function normalizarChave(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/g, '_');
}

/** Aceita "-22.8587" e "-22,8587" (planilhas em português). */
export function numero(s: string | undefined): number {
  return Number((s ?? '').replace(/\s/g, '').replace(',', '.'));
}
