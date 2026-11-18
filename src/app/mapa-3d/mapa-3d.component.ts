import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewEncapsulation,
  effect, inject, input, output, signal, untracked, viewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Eixo, Local, Projeto } from '../models';
import { CAIXA_PADRAO, CONTEXTO, Caixa, GEOMETRIA, ILHA, PONTES, TOPO, VIAS, geo } from './campus-geometria';

interface Pino {
  projeto: Projeto;
  grupo: THREE.Group;
  cabeca: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  anel: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  alvo: THREE.Mesh;
  fase: number;
}

interface Rotulo {
  el: HTMLDivElement;
  pos: THREE.Vector3;
  localId?: string;
}

const ALTURA_HASTE = 2.6;

@Component({
  selector: 'app-mapa-3d',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="m3d-stage" #stage></div>
    <div class="m3d-labels" #labels></div>
    <div class="m3d-tip" #tip></div>
  `,
  styles: [`
    app-mapa-3d { position: fixed; inset: 0; display: block; }
    .m3d-stage { position: absolute; inset: 0; }
    .m3d-stage canvas { display: block; }
    .m3d-labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .m3d-label { position: absolute; transform: translate(-50%, -100%); font-size: 11px; font-weight: 600;
      letter-spacing: .02em; color: #3b4a44; background: #ffffffc9; padding: 2px 7px; border-radius: 999px;
      white-space: nowrap; border: 1px solid #fff; transition: opacity .2s; }
    .m3d-label.area { background: #e7f1e6d9; color: #2f5a3e; font-style: italic; }
    .m3d-tip { position: fixed; z-index: 7; pointer-events: none; background: #18241f; color: #fff;
      padding: 8px 11px; border-radius: 9px; font-size: 13px; max-width: 240px; opacity: 0;
      transition: opacity .12s; box-shadow: var(--shadow); }
    .m3d-tip small { display: block; opacity: .75; font-size: 11.5px; margin-top: 2px; }
  `]
})
export class Mapa3dComponent implements AfterViewInit, OnDestroy {
  // ---- entradas e saídas ----
  eixos = input<Eixo[]>([]);
  locais = input<Local[]>([]);
  projetos = input<Projeto[]>([]);
  /** ids dos projetos que passam no filtro atual */
  visiveis = input<Set<string>>(new Set());
  selecionado = input<Projeto | null>(null);
  selecionar = output<Projeto>();

  private stageRef = viewChild.required<ElementRef<HTMLDivElement>>('stage');
  private labelsRef = viewChild.required<ElementRef<HTMLDivElement>>('labels');
  private tipRef = viewChild.required<ElementRef<HTMLDivElement>>('tip');
  private zone = inject(NgZone);

  // ---- three.js ----
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private readonly HOME = { pos: new THREE.Vector3(-14, 62, 66), alvo: new THREE.Vector3(0, 0, 0) };
  private pronto = signal(false);
  private locaisConstruidos = false;
  private topoDoLocal = new Map<string, THREE.Vector3>();
  private pegadas: [number, number, number, number][] = [];
  private segmentosVias: [number, number, number, number][] = [];
  private pinos: Pino[] = [];
  private grupoPinos = new THREE.Group();
  private rotulos: Rotulo[] = [];
  private hovered: Projeto | null = null;
  private voo: { dePos: THREE.Vector3; deAlvo: THREE.Vector3; paraPos: THREE.Vector3; paraAlvo: THREE.Vector3; t0: number; ms: number } | null = null;
  private raf = 0;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private downAt: [number, number] | null = null;
  private tmp = new THREE.Vector3();
  private escalaAlvo = new THREE.Vector3();
  private removerListeners: (() => void)[] = [];

  constructor() {
    // Quando os dados chegam da API: desenha prédios dos locais, árvores e pinos.
    effect(() => {
      const locais = this.locais(), projetos = this.projetos();
      if (!this.pronto() || !locais.length) return;
      if (!this.locaisConstruidos) { this.construirLocais(locais); this.locaisConstruidos = true; }
      this.construirPinos(projetos);
      this.aplicarVisibilidade(untracked(() => this.visiveis()));
    });
    // Filtro
    effect(() => {
      const vis = this.visiveis();
      if (this.pronto()) this.aplicarVisibilidade(vis);
    });
    // Seleção -> voa até o pino
    effect(() => {
      const p = this.selecionado();
      if (this.pronto() && p) this.focar(p);
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.iniciarCena();
      this.loop(performance.now());
    });
    this.pronto.set(true);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.removerListeners.forEach(f => f());
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  /** Volta para a vista geral do campus. */
  visaoGeral(): void {
    this.voar(this.HOME.pos.clone(), this.HOME.alvo.clone());
  }

  // =================== CENA BASE ===================
  private iniciarCena(): void {
    const stage = this.stageRef().nativeElement;
    const w = window.innerWidth, h = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#dfe9e6');
    this.scene.fog = new THREE.Fog('#dfe9e6', 120, 240);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 600);
    this.camera.position.copy(this.HOME.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.HOME.alvo);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .08;
    this.controls.maxPolarAngle = 1.32;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 150;

    // Luz
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8aa596', 2.2));
    const sol = new THREE.DirectionalLight('#fff6e6', 2.4);
    sol.position.set(-30, 50, 25);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
    sol.shadow.camera.updateProjectionMatrix();
    sol.shadow.bias = -0.0008;
    this.scene.add(sol);

    // Água
    const agua = new THREE.Mesh(new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: '#9fc7cf', roughness: .35, metalness: .05 }));
    agua.rotation.x = -Math.PI / 2; agua.position.y = -0.4; agua.receiveShadow = true;
    this.scene.add(agua);

    // Ilha
    const forma = new THREE.Shape();
    ILHA.forEach(([x, z], i) => i ? forma.lineTo(x, -z) : forma.moveTo(x, -z));
    const ilhaGeo = new THREE.ExtrudeGeometry(forma, { depth: 1, bevelEnabled: true, bevelThickness: .35, bevelSize: .6, bevelSegments: 3, curveSegments: 12 });
    ilhaGeo.rotateX(-Math.PI / 2);
    const ilha = new THREE.Mesh(ilhaGeo, [
      new THREE.MeshStandardMaterial({ color: '#cfdcc0', roughness: .95 }),
      new THREE.MeshStandardMaterial({ color: '#c9bfa3', roughness: 1 })
    ]);
    ilha.position.y = -0.6; ilha.receiveShadow = true;
    this.scene.add(ilha);

    // Pontes
    const matPonte = new THREE.MeshStandardMaterial({ color: '#b9bdb8', roughness: .9 });
    for (const p of PONTES) {
      const [x1, z1] = p.de, [x2, z2] = p.ate, dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, .35, 1.4), matPonte);
      m.position.set((x1 + x2) / 2, .35, (z1 + z2) / 2); m.rotation.y = -Math.atan2(dz, dx); m.castShadow = true;
      this.scene.add(m);
      const n = Math.floor(len / 2.6);
      for (let i = 1; i < n; i++) {
        const t = i / n, pilar = new THREE.Mesh(new THREE.BoxGeometry(.4, 1, .4), matPonte);
        pilar.position.set(x1 + dx * t, -.2, z1 + dz * t); this.scene.add(pilar);
      }
      this.criarRotulo(p.nome, new THREE.Vector3(p.rotulo[0], .8, p.rotulo[1]));
    }

    // Vias
    const matVia = new THREE.MeshStandardMaterial({ color: '#e6e4dc', roughness: 1 });
    for (const via of VIAS) {
      for (let i = 0; i < via.pontos.length - 1; i++) {
        const [x1, z1] = via.pontos[i], [x2, z2] = via.pontos[i + 1], dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
        const m = new THREE.Mesh(new THREE.BoxGeometry(len + via.largura, .06, via.largura), matVia);
        m.position.set((x1 + x2) / 2, TOPO + .03, (z1 + z2) / 2); m.rotation.y = -Math.atan2(dz, dx); m.receiveShadow = true;
        this.scene.add(m);
        this.segmentosVias.push([x1, z1, x2, z2]);
      }
    }

    // Prédios de contexto
    for (const c of CONTEXTO) {
      const [x, z] = geo(c.lat, c.lng);
      this.desenharCaixas(x, z, c.caixas);
      this.criarRotulo(c.nome, new THREE.Vector3(x, TOPO + Math.max(...c.caixas.map(k => k[4])) + .5, z));
    }

    this.scene.add(this.grupoPinos);

    // Eventos
    const canvas = this.renderer.domElement;
    const onMove = (e: PointerEvent) => this.aoMover(e);
    const onDown = (e: PointerEvent) => { this.downAt = [e.clientX, e.clientY]; };
    const onUp = (e: PointerEvent) => this.aoSoltar(e);
    const onResize = () => this.aoRedimensionar();
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    window.addEventListener('resize', onResize);
    this.removerListeners.push(
      () => canvas.removeEventListener('pointermove', onMove),
      () => canvas.removeEventListener('pointerdown', onDown),
      () => canvas.removeEventListener('pointerup', onUp),
      () => window.removeEventListener('resize', onResize)
    );
  }

  // =================== LOCAIS (da API) ===================
  private matPredio = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: .85 });
  private matTelhado = new THREE.MeshStandardMaterial({ color: '#dcd8cf', roughness: .9 });

  private desenharCaixas(x: number, z: number, caixas: Caixa[]): number {
    let alturaMax = 0;
    for (const [dx, dz, w, d, h] of caixas) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        [this.matPredio, this.matPredio, this.matTelhado, this.matPredio, this.matPredio, this.matPredio]);
      m.position.set(x + dx, TOPO + h / 2, z + dz); m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
      this.pegadas.push([x + dx, z + dz, w / 2 + .6, d / 2 + .6]);
      alturaMax = Math.max(alturaMax, h);
    }
    return alturaMax;
  }

  private construirLocais(locais: Local[]): void {
    let mangue: [number, number] | null = null;
    for (const l of locais) {
      const [x, z] = geo(l.lat, l.lng);
      if (l.tipo === 'area') {
        this.topoDoLocal.set(l.id, new THREE.Vector3(x, TOPO, z));
        if (l.id === 'mangue') mangue = [x, z];
        if (l.id === 'horta') this.desenharCanteiros(x, z);
        this.criarRotulo(l.nome, new THREE.Vector3(x, TOPO + .6, z), l.id, true);
        continue;
      }
      if (l.tipo === 'vila') {
        const casas: Caixa[] = [];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) casas.push([-1.8 + i * 1.2, -1.2 + j * 1.2, .75, .75, .5 + ((i + j) % 3) * .2]);
        this.desenharCaixas(x, z, casas);
        this.topoDoLocal.set(l.id, new THREE.Vector3(x, TOPO + 1.1, z));
        this.criarRotulo(l.nome, new THREE.Vector3(x, TOPO + 1.6, z), l.id);
        continue;
      }
      const caixas = GEOMETRIA[l.id] ?? CAIXA_PADRAO;
      const h = this.desenharCaixas(x, z, caixas);
      // centro do conjunto de caixas
      const xs = caixas.flatMap(([dx, , w]) => [dx - w / 2, dx + w / 2]);
      const zs = caixas.flatMap(([, dz, , d]) => [dz - d / 2, dz + d / 2]);
      const cx = x + (Math.min(...xs) + Math.max(...xs)) / 2, cz = z + (Math.min(...zs) + Math.max(...zs)) / 2;
      this.topoDoLocal.set(l.id, new THREE.Vector3(cx, TOPO + h, cz));
      this.criarRotulo(l.nome, new THREE.Vector3(cx, TOPO + h + .5, cz), l.id);
    }
    this.plantarArvores(mangue);
  }

  private desenharCanteiros(x: number, z: number): void {
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(3.2, .18, .5),
        new THREE.MeshStandardMaterial({ color: i % 2 ? '#8aa64a' : '#a3b95a', roughness: 1 }));
      c.position.set(x, TOPO + .09, z - 1.5 + i * .7); c.receiveShadow = true; this.scene.add(c);
    }
    this.pegadas.push([x, z, 2.2, 2.2]);
  }

  private plantarArvores(mangue: [number, number] | null): void {
    const noMangue = (x: number, z: number) => !!mangue && Math.hypot(x - mangue[0], z - mangue[1]) < 5.5;
    const redonda = new THREE.IcosahedronGeometry(.6, 0); redonda.translate(0, .7, 0);
    const cone = new THREE.ConeGeometry(.55, 1.5, 6); cone.translate(0, .75, 0);
    this.plantar(480, (x, z) => !noMangue(x, z), redonda, '#6f9e62');
    this.plantar(200, (x, z) => !noMangue(x, z), cone, '#5a8a52');
    if (mangue) this.plantar(170, noMangue, redonda, '#3f7348');
  }

  private plantar(n: number, filtro: (x: number, z: number) => boolean, geometria: THREE.BufferGeometry, cor: string): void {
    const mesh = new THREE.InstancedMesh(geometria, new THREE.MeshStandardMaterial({ color: cor, roughness: .9, flatShading: true }), n);
    mesh.castShadow = true;
    const d = new THREE.Object3D();
    let k = 0, tentativas = 0;
    while (k < n && tentativas < n * 40) {
      tentativas++;
      const x = -28 + Math.random() * 56, z = -32 + Math.random() * 63;
      if (!dentroDaIlha(x, z) || !filtro(x, z)) continue;
      if (this.pegadas.some(([fx, fz, hw, hd]) => Math.abs(x - fx) < hw && Math.abs(z - fz) < hd)) continue;
      if (this.segmentosVias.some(s => distSegmento(x, z, s) < 1)) continue;
      const s = .6 + Math.random() * .8;
      d.position.set(x, TOPO, z); d.scale.set(s, s * (.8 + Math.random() * .5), s); d.rotation.y = Math.random() * 6;
      d.updateMatrix(); mesh.setMatrixAt(k++, d.matrix);
    }
    mesh.count = k;
    this.scene.add(mesh);
  }

  // =================== PINOS ===================
  private construirPinos(projetos: Projeto[]): void {
    this.grupoPinos.clear();
    this.pinos = [];
    const cores = new Map(this.eixos().map(e => [e.id, e.cor]));
    const porLocal = new Map<string, Projeto[]>();
    for (const p of projetos) {
      if (!porLocal.has(p.local)) porLocal.set(p.local, []);
      porLocal.get(p.local)!.push(p);
    }
    for (const [localId, lista] of porLocal) {
      const base = this.topoDoLocal.get(localId);
      if (!base) continue; // local sem cadastro
      lista.forEach((p, i) => {
        const n = lista.length, ang = n > 1 ? (i / n) * Math.PI * 2 + .6 : 0, r = n > 1 ? 1.5 : 0;
        const cor = new THREE.Color(cores.get(p.eixo) ?? '#888888');
        const grupo = new THREE.Group();
        grupo.position.set(base.x + Math.cos(ang) * r, base.y, base.z + Math.sin(ang) * r);

        const haste = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, ALTURA_HASTE, 8), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
        haste.position.y = ALTURA_HASTE / 2; grupo.add(haste);
        const cabeca = new THREE.Mesh(new THREE.SphereGeometry(.6, 24, 16),
          new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: .35, roughness: .4 }));
        cabeca.position.y = ALTURA_HASTE + .4; cabeca.castShadow = true; grupo.add(cabeca);
        const anel = new THREE.Mesh(new THREE.RingGeometry(.35, .6, 32),
          new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: .8, side: THREE.DoubleSide }));
        anel.rotation.x = -Math.PI / 2; anel.position.y = .05; grupo.add(anel);
        const alvo = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
        alvo.position.y = ALTURA_HASTE + .4; alvo.userData['projeto'] = p; grupo.add(alvo);

        this.grupoPinos.add(grupo);
        this.pinos.push({ projeto: p, grupo, cabeca, anel, alvo, fase: Math.random() * 6 });
      });
    }
  }

  private aplicarVisibilidade(vis: Set<string>): void {
    this.pinos.forEach(pn => pn.grupo.visible = vis.has(pn.projeto.id));
  }

  // =================== RÓTULOS ===================
  private criarRotulo(texto: string, pos: THREE.Vector3, localId?: string, area = false): void {
    const el = document.createElement('div');
    el.className = 'm3d-label' + (area ? ' area' : '');
    el.textContent = texto;
    this.labelsRef().nativeElement.appendChild(el);
    this.rotulos.push({ el, pos, localId });
  }

  private atualizarRotulos(): void {
    const filtrando = this.visiveis().size < this.projetos().length;
    const ocupados = new Set(this.pinos.filter(p => p.grupo.visible).map(p => p.projeto.local));
    const w = window.innerWidth, h = window.innerHeight;
    for (const r of this.rotulos) {
      this.tmp.copy(r.pos).project(this.camera);
      if (this.tmp.z > 1) { r.el.style.opacity = '0'; continue; }
      r.el.style.left = ((this.tmp.x * .5 + .5) * w) + 'px';
      r.el.style.top = ((-this.tmp.y * .5 + .5) * h) + 'px';
      const dist = this.camera.position.distanceTo(r.pos);
      let op = dist < 75 ? 1 : Math.max(0, 1 - (dist - 75) / 25);
      if (filtrando && r.localId && !ocupados.has(r.localId)) op *= .35;
      r.el.style.opacity = String(op);
    }
  }

  // =================== INTERAÇÃO ===================
  private escolher(e: PointerEvent): Projeto | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const alvos = this.pinos.filter(p => p.grupo.visible).map(p => p.alvo);
    const hits = this.raycaster.intersectObjects(alvos, false);
    return hits.length ? (hits[0].object.userData['projeto'] as Projeto) : null;
  }

  private aoMover(e: PointerEvent): void {
    if (e.pointerType === 'touch') return;
    const p = this.escolher(e);
    this.hovered = p;
    this.renderer.domElement.style.cursor = p ? 'pointer' : 'grab';
    const tip = this.tipRef().nativeElement;
    if (p) {
      const eixo = this.eixos().find(x => x.id === p.eixo)?.nome ?? '';
      const local = this.locais().find(x => x.id === p.local)?.nome ?? '';
      tip.innerHTML = '';
      tip.append(p.titulo);
      const small = document.createElement('small');
      small.textContent = `${eixo} · ${local}`;
      tip.append(small);
      tip.style.left = (e.clientX + 14) + 'px';
      tip.style.top = (e.clientY + 14) + 'px';
      tip.style.opacity = '1';
    } else {
      tip.style.opacity = '0';
    }
  }

  private aoSoltar(e: PointerEvent): void {
    if (!this.downAt) return;
    const moveu = Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]);
    this.downAt = null;
    if (moveu > 6) return;
    const p = this.escolher(e);
    if (p) this.zone.run(() => this.selecionar.emit(p));
  }

  private aoRedimensionar(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private focar(p: Projeto): void {
    const pino = this.pinos.find(x => x.projeto.id === p.id);
    if (!pino) return;
    const alvo = pino.grupo.position.clone(); alvo.y += 1.5;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    dir.y = Math.max(dir.y, .55); dir.normalize();
    this.voar(alvo.clone().add(dir.multiplyScalar(24)), alvo);
  }

  private voar(paraPos: THREE.Vector3, paraAlvo: THREE.Vector3, ms = 1000): void {
    this.voo = { dePos: this.camera.position.clone(), deAlvo: this.controls.target.clone(), paraPos, paraAlvo, t0: performance.now(), ms };
  }

  // =================== LOOP ===================
  private loop = (agora: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.voo) {
      const t = Math.min(1, (agora - this.voo.t0) / this.voo.ms), k = suave(t);
      this.camera.position.lerpVectors(this.voo.dePos, this.voo.paraPos, k);
      this.controls.target.lerpVectors(this.voo.deAlvo, this.voo.paraAlvo, k);
      if (t >= 1) this.voo = null;
    }
    const s = agora / 1000, sel = this.selecionado();
    for (const pn of this.pinos) {
      const ehSel = pn.projeto.id === sel?.id, ehHover = pn.projeto === this.hovered;
      pn.cabeca.position.y = ALTURA_HASTE + .4 + Math.sin(s * 2 + pn.fase) * .15;
      const esc = ehSel ? 1.45 : ehHover ? 1.2 : 1;
      pn.cabeca.scale.lerp(this.escalaAlvo.set(esc, esc, esc), .2);
      const pulso = (s * 1.5) % 1, rs = ehSel ? 1 + pulso * 2.2 : 1;
      pn.anel.scale.set(rs, rs, rs);
      pn.anel.material.opacity = ehSel ? .9 * (1 - pulso) : .8;
      pn.cabeca.material.emissiveIntensity = ehSel || ehHover ? .65 : .35;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.atualizarRotulos();
  };
}

// =================== utilitários ===================
function dentroPoligono(x: number, z: number, poly: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c;
  }
  return c;
}

function dentroDaIlha(x: number, z: number): boolean {
  return [[0, 0], [1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]].every(([a, b]) => dentroPoligono(x + a, z + b, ILHA));
}

function distSegmento(px: number, pz: number, [x1, z1, x2, z2]: [number, number, number, number]): number {
  const dx = x2 - x1, dz = z2 - z1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - x1 - t * dx, pz - z1 - t * dz);
}

function suave(t: number): number {
  return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
