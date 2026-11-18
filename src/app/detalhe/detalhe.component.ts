import { Component, computed, input, output } from '@angular/core';
import { Eixo, Local, Projeto } from '../models';

@Component({
  selector: 'app-detalhe',
  standalone: true,
  host: { '[class.open]': '!!projeto()', '[style.--c]': 'eixo()?.cor ?? "#1f6b4f"', 'aria-live': 'polite' },
  template: `
    @if (projeto(); as p) {
      <div class="dhead">
        <button class="close" aria-label="Fechar" (click)="fechar.emit()">×</button>
        <span class="tag">{{ eixo()?.nome }}</span>
        <h3>{{ p.titulo }}</h3>
        <div class="where">📍 {{ local()?.nome }} · Cidade Universitária</div>
      </div>
      <div class="dbody">
        <h4>Sobre o projeto</h4>
        <p>{{ p.descricao }}</p>

        <h4>Linha de pesquisa</h4>
        <p>{{ p.pesquisa }}</p>

        <h4>Coordenação</h4>
        <div class="prof">
          <div class="avatar">{{ iniciais() }}</div>
          <div>
            <b>{{ p.professor }}</b>
            <small>{{ p.departamento }} · {{ p.unidade }}</small>
            <small>{{ p.contato }}</small>
          </div>
        </div>

        <h4>Informações</h4>
        <div class="meta">
          <div><small>Unidade</small><b>{{ p.unidade }}</b></div>
          <div><small>Desde</small><b>{{ p.inicio }}</b></div>
        </div>

        @if (p.ods.length) {
          <h4>Objetivos de Desenvolvimento Sustentável</h4>
          <div class="ods">
            @for (o of p.ods; track o) { <span>{{ o }}</span> }
          </div>
        }

        @if (p.links.length) {
          <h4>Links</h4>
          <div class="links">
            @for (l of p.links; track l.titulo) {
              <a [href]="l.url" target="_blank" rel="noopener">{{ l.titulo }}<span>↗</span></a>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; top: 16px; right: 16px; bottom: 16px; width: 380px; z-index: 6; background: var(--panel-solid);
      border-radius: 18px; box-shadow: var(--shadow); transform: translateX(calc(100% + 30px));
      transition: transform .35s cubic-bezier(.2,.8,.2,1); display: flex; flex-direction: column; overflow: hidden; }
    :host(.open) { transform: none; }
    .dhead { padding: 22px 22px 18px; color: #fff; background: var(--c); position: relative; }
    .tag { display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: .09em; font-weight: 600; background: #ffffff2e; padding: 4px 9px; border-radius: 999px; }
    h3 { font-family: "Fraunces", serif; font-weight: 650; font-size: 24px; line-height: 1.15; margin: 12px 0 6px; }
    .where { font-size: 13px; opacity: .9; }
    .close { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 50%; border: none; background: #ffffff33; color: #fff; font-size: 18px; cursor: pointer; line-height: 1; }
    .close:hover { background: #ffffff55; }
    .dbody { padding: 20px 22px; overflow: auto; flex: 1; }
    h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .09em; color: var(--muted); margin: 20px 0 8px; font-weight: 600; }
    h4:first-child { margin-top: 0; }
    p { margin: 0; font-size: 14.5px; line-height: 1.55; }
    .prof { display: flex; gap: 12px; align-items: center; padding: 12px; border: 1px solid var(--line); border-radius: 12px; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font-weight: 600; color: #fff; flex: none; background: var(--c); }
    .prof b { display: block; font-size: 14.5px; }
    .prof small { display: block; color: var(--muted); font-size: 12.5px; margin-top: 2px; }
    .ods { display: flex; flex-wrap: wrap; gap: 6px; }
    .ods span { font-size: 12px; padding: 4px 9px; border-radius: 8px; background: #f1f5f2; border: 1px solid var(--line); }
    .links a { display: flex; justify-content: space-between; align-items: center; padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px; color: var(--ink); text-decoration: none; font-size: 14px; margin-bottom: 6px; }
    .links a:hover { border-color: var(--c); }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .meta div { background: #f6f8f6; border-radius: 10px; padding: 10px; }
    .meta small { display: block; font-size: 11px; color: var(--muted); }
    .meta b { font-size: 13.5px; font-weight: 600; }
    @media (max-width: 860px) {
      :host { left: 10px; right: 10px; width: auto; top: auto; bottom: 10px; height: 72vh; transform: translateY(calc(100% + 30px)); }
    }
  `]
})
export class DetalheComponent {
  projeto = input<Projeto | null>(null);
  eixo = input<Eixo | undefined>(undefined);
  local = input<Local | undefined>(undefined);
  fechar = output<void>();

  iniciais = computed(() => {
    const nome = this.projeto()?.professor ?? '';
    return nome.replace(/^Prof\.ª?\s*/, '').split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('');
  });
}
