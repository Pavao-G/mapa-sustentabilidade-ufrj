import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Eixo, Link, Local, Projeto, TipoLocal } from '../models';
import { lerCsv, numero } from './csv';

export type Origem = 'planilha' | 'exemplo';

export interface Catalogo {
  eixos: Eixo[];
  locais: Local[];
  projetos: Projeto[];
  /** "exemplo" quando os projetos vieram dos arquivos de exemplo (mostra o selo "Dados ilustrativos"). */
  origem: Origem;
}

/**
 * Carrega eixos, locais e projetos.
 * Prioridade: planilha do Google (CSV publicado) → arquivos de exemplo em public/dados/.
 */
@Injectable({ providedIn: 'root' })
export class DadosService {
  private http = inject(HttpClient);

  carregarTudo(): Observable<Catalogo> {
    const cfg = environment.planilha;
    return forkJoin({
      eixos: this.carregar(cfg.eixos, 'dados/eixos.json', linhaParaEixo),
      locais: this.carregar(cfg.locais, 'dados/locais.json', linhaParaLocal),
      projetos: this.carregar(cfg.projetos, 'dados/projetos.json', linhaParaProjeto)
    }).pipe(
      map(({ eixos, locais, projetos }) => {
        const idsEixos = new Set(eixos.dados.map(e => e.id));
        const idsLocais = new Set(locais.dados.map(l => l.id));
        const validos = projetos.dados.filter(p => {
          const ok = idsEixos.has(p.eixo) && idsLocais.has(p.local);
          if (!ok) console.warn(`Projeto "${p.titulo}" ignorado: eixo "${p.eixo}" ou local "${p.local}" não cadastrado.`);
          return ok;
        });
        return {
          eixos: eixos.dados.map(e => ({ ...e, total: validos.filter(p => p.eixo === e.id).length })),
          locais: locais.dados,
          projetos: validos,
          origem: projetos.origem
        };
      })
    );
  }

  /** Lê o CSV da planilha; se não houver link ou der erro, usa o JSON de exemplo. */
  private carregar<T>(csvUrl: string, jsonUrl: string, converter: (l: Record<string, string>) => T | null)
    : Observable<{ dados: T[]; origem: Origem }> {
    const exemplo$ = this.http.get<T[]>(jsonUrl).pipe(map(dados => ({ dados, origem: 'exemplo' as Origem })));
    if (!csvUrl) return exemplo$;
    return this.http.get(csvUrl, { responseType: 'text' }).pipe(
      map(texto => ({
        dados: lerCsv(texto).map(converter).filter((x): x is T => x !== null),
        origem: 'planilha' as Origem
      })),
      catchError(err => {
        console.warn(`Não foi possível ler a planilha (${csvUrl}). Usando dados de exemplo.`, err);
        return of(null);
      }),
      switchMap(r => r ? of(r) : exemplo$)
    );
  }
}

// ---------- conversão das linhas da planilha ----------

function linhaParaEixo(l: Record<string, string>): Eixo | null {
  if (!l['id'] || !l['nome']) return null;
  return { id: l['id'], nome: l['nome'], cor: l['cor'] || '#888888', total: 0 };
}

function linhaParaLocal(l: Record<string, string>): Local | null {
  const lat = numero(l['lat'] ?? l['latitude']), lng = numero(l['lng'] ?? l['longitude']);
  if (!l['id'] || !l['nome'] || isNaN(lat) || isNaN(lng)) return null;
  const tipo = (['predio', 'area', 'vila'].includes(l['tipo']) ? l['tipo'] : 'predio') as TipoLocal;
  return { id: l['id'], nome: l['nome'], lat, lng, tipo };
}

function linhaParaProjeto(l: Record<string, string>): Projeto | null {
  if (!l['id'] || !l['titulo'] || !l['eixo'] || !l['local']) return null;
  const links: Link[] = [];
  for (let i = 1; i <= 5; i++) {
    const url = l[`link${i}_url`];
    if (url) links.push({ titulo: l[`link${i}_titulo`] || 'Link', url });
  }
  return {
    id: l['id'],
    titulo: l['titulo'],
    eixo: l['eixo'],
    local: l['local'],
    descricao: l['descricao'] ?? '',
    pesquisa: l['pesquisa'] ?? '',
    professor: l['professor'] ?? '',
    departamento: l['departamento'] ?? '',
    unidade: l['unidade'] ?? '',
    contato: l['contato'] ?? '',
    inicio: l['inicio'] ?? '',
    ods: (l['ods'] ?? '').split(/[;,]/).map(s => s.trim()).filter(Boolean),
    links
  };
}
