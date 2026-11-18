import { Component, input, output } from '@angular/core';
import { Eixo, Local, Projeto } from '../models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  template: `
    <div class="sec">
      <input class="search" type="search" placeholder="Buscar projeto, professor ou unidade…"
             [value]="busca()" (input)="buscar.emit($any($event.target).value)">
    </div>

    <div class="sec">
      <h2>Eixos temáticos</h2>
      <div class="eixos">
        <button class="chip" [class.on]="!filtroEixo()" style="--c:#18241f" (click)="filtrar.emit(null)">
          <span class="dot" style="background:#18241f"></span>Todos <span class="n">{{ total() }}</span>
        </button>
        @for (e of eixos(); track e.id) {
          <button class="chip" [class.on]="filtroEixo() === e.id" [style.--c]="e.cor" (click)="filtrar.emit(e.id)">
            <span class="dot" [style.background]="e.cor"></span>{{ e.nome }} <span class="n">{{ e.total }}</span>
          </button>
        }
      </div>
    </div>

    <div class="list">
      @for (p of projetos(); track p.id) {
        <div class="item" [class.sel]="selecionadoId() === p.id" (click)="selecionar.emit(p)">
          <span class="bar" [style.background]="corDoEixo(p.eixo)"></span>
          <div><b>{{ p.titulo }}</b><small>{{ p.professor }} · {{ nomeDoLocal(p.local) }}</small></div>
        </div>
      } @empty {
        <div class="empty">Nenhum projeto encontrado.</div>
      }
    </div>

    <div class="foot">
      <span>{{ projetos().length }} {{ projetos().length === 1 ? 'projeto' : 'projetos' }}</span>
      @if (exemplo()) { <span class="badge">Dados ilustrativos</span> }
    </div>
  `,
  styles: [`
    :host { position: fixed; top: 92px; left: 16px; bottom: 16px; width: 340px; z-index: 5; background: var(--panel);
      backdrop-filter: blur(8px); border-radius: 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; overflow: hidden; }
    .sec { padding: 14px 16px; border-bottom: 1px solid var(--line); }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .09em; color: var(--muted); margin: 0 0 10px; font-weight: 600; }
    .search { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; font: inherit; font-size: 14px; background: #fff; outline: none; }
    .search:focus { border-color: var(--accent); }
    .eixos { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 999px; border: 1px solid var(--line);
      background: #fff; font-size: 13px; cursor: pointer; color: var(--ink); transition: all .15s; }
    .chip .dot { width: 9px; height: 9px; border-radius: 50%; }
    .chip .n { font-size: 11px; color: var(--muted); }
    .chip:hover { border-color: #aab8b1; }
    .chip.on { background: var(--c); border-color: var(--c); color: #fff; }
    .chip.on .dot { background: #fff !important; }
    .chip.on .n { color: #ffffffcc; }
    .list { flex: 1; overflow: auto; padding: 6px 8px 10px; }
    .item { display: flex; gap: 10px; padding: 10px; border-radius: 10px; cursor: pointer; align-items: flex-start; }
    .item:hover { background: #f1f5f2; }
    .item.sel { background: #e5efe9; }
    .bar { width: 4px; align-self: stretch; border-radius: 4px; flex: none; }
    .item b { display: block; font-size: 14px; font-weight: 600; line-height: 1.25; }
    .item small { display: block; font-size: 12px; color: var(--muted); margin-top: 3px; }
    .empty { padding: 20px; color: var(--muted); font-size: 13px; text-align: center; }
    .foot { padding: 10px 16px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
    .badge { background: #fff4d6; color: #7a5a00; border: 1px solid #f1dc9a; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    @media (max-width: 860px) { :host { left: 10px; right: 10px; width: auto; top: auto; bottom: 10px; height: 44vh; } }
  `]
})
export class SidebarComponent {
  eixos = input<Eixo[]>([]);
  locais = input<Local[]>([]);
  /** projetos já filtrados */
  projetos = input<Projeto[]>([]);
  total = input(0);
  filtroEixo = input<string | null>(null);
  busca = input('');
  exemplo = input(false);
  selecionadoId = input<string | null>(null);

  filtrar = output<string | null>();
  buscar = output<string>();
  selecionar = output<Projeto>();

  corDoEixo(id: string): string {
    return this.eixos().find(e => e.id === id)?.cor ?? '#888';
  }

  nomeDoLocal(id: string): string {
    return this.locais().find(l => l.id === id)?.nome ?? id;
  }
}
