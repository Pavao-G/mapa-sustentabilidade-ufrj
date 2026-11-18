# Mapa da Sustentabilidade · UFRJ

Mapa 3D das iniciativas de sustentabilidade da Cidade Universitária (Ilha do Fundão).

O site é feito em **Angular 18**, com o mapa 3D em **Three.js**, e fica hospedado no **GitHub Pages**. Os dados vêm de uma **planilha do Google**, então não existe servidor nem backend para manter.

```
Planilha Google (CSV publicado)  ──►  Site Angular no GitHub Pages
```

Enquanto a planilha não estiver ligada, o site mostra os dados de exemplo de `public/dados/*.json` com o selo "Dados ilustrativos".

---

## 1. Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `mapa-sustentabilidade-ufrj`.
2. Envie **todos** os arquivos desta pasta para o repositório, **incluindo a pasta oculta `.github`**.
   - O mais fácil é usar o **GitHub Desktop**: *File → Add local repository*, depois *Publish*.
   - Pelo site do GitHub (*Add file → Upload files*), a pasta `.github` pode não ir junto. Se isso acontecer, crie o arquivo à mão: *Add file → Create new file*, com o nome `.github/workflows/publicar.yml`, e cole o conteúdo do arquivo de mesmo nome desta pasta.
3. No repositório, vá em **Settings → Pages → Source** e escolha **GitHub Actions**.
4. Abra a aba **Actions** e espere o "Publicar no GitHub Pages" ficar verde (cerca de 2 minutos).
5. O endereço aparece em Settings → Pages, por exemplo `https://SEU-USUARIO.github.io/mapa-sustentabilidade-ufrj/`.

A cada alteração enviada para a branch `main`, o site é gerado e publicado de novo automaticamente. Você não precisa instalar nada no computador para isso.

> Para um endereço sem o seu usuário, crie uma **organização** no GitHub (por exemplo `ecomapa-ufrj`) e um repositório chamado `ecomapa-ufrj.github.io`. O site fica em `https://ecomapa-ufrj.github.io/`, e o workflow já ajusta isso sozinho.

## 2. Ligar a planilha do Google

1. Importe `modelo-planilha-mapa-ufrj.xlsx` no Google Sheets (*Arquivo → Importar*). Ele tem as abas `projetos`, `eixos`, `locais` e `instrucoes`.
2. Em *Arquivo → Compartilhar → Publicar na Web*, escolha a aba **projetos** e o formato **Valores separados por vírgula (.csv)**, e clique em **Publicar**. Copie o link gerado.
3. Repita o passo anterior para as abas **eixos** e **locais**.
4. No GitHub, edite `src/environments/environment.ts` (ícone de lápis) e cole os 3 links:

```ts
export const environment = {
  planilha: {
    projetos: 'https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv',
    eixos:    'https://docs.google.com/spreadsheets/d/e/.../pub?gid=123&single=true&output=csv',
    locais:   'https://docs.google.com/spreadsheets/d/e/.../pub?gid=456&single=true&output=csv'
  }
};
```

5. Salve o arquivo (*Commit changes*). Em cerca de 2 minutos o site passa a ler a planilha.

A partir daí, **toda edição na planilha aparece no site sozinha**, sem mexer em código. O Google leva alguns minutos para atualizar a versão publicada.

### Colunas da aba `projetos`

| Coluna | Exemplo |
|---|---|
| id | `p15` (único) |
| titulo | Telhados Solares do CT |
| eixo | `energia` (id da aba eixos) |
| local | `ct` (id da aba locais) |
| descricao, pesquisa | texto livre |
| professor, departamento, unidade, contato, inicio | texto |
| ods | `ODS 7; ODS 13` |
| link1_titulo / link1_url … link3_titulo / link3_url | Página do laboratório / https://… |

Para um **local novo**, adicione uma linha na aba `locais` com as coordenadas. No Google Maps, clique com o botão direito no lugar e o primeiro item do menu mostra a latitude e a longitude. O tipo pode ser `predio`, `area` ou `vila`. Os prédios que não têm um desenho próprio aparecem no mapa com um volume padrão.

---

## Rodar no computador (opcional)

Requer Node.js 18.19+ ou 20+.

```bash
npm install
npm start
```

Depois abra http://localhost:4200.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `src/app/mapa-3d/` | Mapa 3D (Three.js) e geometria do campus (`campus-geometria.ts`) |
| `src/app/sidebar/` | Busca, eixos e lista de projetos |
| `src/app/detalhe/` | Ficha do projeto |
| `src/app/services/dados.service.ts` | Leitura da planilha (CSV) ou dos dados de exemplo |
| `src/environments/environment.ts` | Links da planilha |
| `public/dados/` | Dados de exemplo (fictícios) |
| `.github/workflows/publicar.yml` | Publicação automática no GitHub Pages |
