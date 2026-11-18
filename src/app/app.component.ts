import { Component, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Eixo, Local, Projeto } from './models';
import { DadosService } from './services/dados.service';
import { Mapa3dComponent } from './mapa-3d/mapa-3d.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { DetalheComponent } from './detalhe/detalhe.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Mapa3dComponent, SidebarComponent, DetalheComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private dados = inject(DadosService);
  private mapa = viewChild.required(Mapa3dComponent);

  // dados vindos da API
  eixos = signal<Eixo[]>([]);
  locais = signal<Local[]>([]);
  projetos = signal<Projeto[]>([]);
  carregando = signal(true);
  dadosDeExemplo = signal(false);
  erro = signal<string | null>(null);

  // estado da tela
  filtroEixo = signal<string | null>(null);
  busca = signal('');
  selecionado = signal<Projeto | null>(null);

  /** Projetos que passam no filtro de eixo e na busca (filtrado no navegador: a lista é pequena). */
  filtrados = computed(() => {
    const eixo = this.filtroEixo(), q = normalizar(this.busca().trim());
    const nomeLocal = new Map(this.locais().map(l => [l.id, l.nome]));
    return this.projetos().filter(p =>
      (!eixo || p.eixo === eixo) &&
      (!q || normalizar([p.titulo, p.professor, p.unidade, p.departamento, nomeLocal.get(p.local) ?? '', p.descricao].join(' ')).includes(q)));
  });
  idsVisiveis = computed(() => new Set(this.filtrados().map(p => p.id)));

  eixoSelecionado = computed(() => this.eixos().find(e => e.id === this.selecionado()?.eixo));
  localSelecionado = computed(() => this.locais().find(l => l.id === this.selecionado()?.local));

  ngOnInit(): void {
    this.dados.carregarTudo().subscribe({
      next: ({ eixos, locais, projetos, origem }) => {
        this.dadosDeExemplo.set(origem === 'exemplo');
        this.eixos.set(eixos);
        this.locais.set(locais);
        this.projetos.set(projetos);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os projetos. Tente recarregar a página.');
        this.carregando.set(false);
      }
    });
  }

  filtrar(eixo: string | null): void {
    this.filtroEixo.set(eixo);
    this.fecharSeOculto();
  }

  buscar(texto: string): void {
    this.busca.set(texto);
    this.fecharSeOculto();
  }

  selecionar(p: Projeto): void {
    this.selecionado.set(p);
  }

  fechar(): void {
    this.selecionado.set(null);
  }

  visaoGeral(): void {
    this.fechar();
    this.mapa().visaoGeral();
  }

  @HostListener('document:keydown.escape')
  aoEsc(): void {
    this.fechar();
  }

  private fecharSeOculto(): void {
    const sel = this.selecionado();
    if (sel && !this.idsVisiveis().has(sel.id)) this.fechar();
  }
}

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
