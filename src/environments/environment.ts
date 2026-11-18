/**
 * De onde vêm os dados do mapa.
 *
 * Cole aqui os links da planilha do Google publicada como CSV
 * (Arquivo → Compartilhar → Publicar na Web → escolha a aba → "Valores separados por vírgula (.csv)").
 * Cada aba tem seu próprio link.
 *
 * Se um link ficar vazio (ou a planilha não responder), o site usa os arquivos de exemplo
 * em public/dados/*.json.
 */
export const environment = {
  planilha: {
    projetos: '',
    eixos: '',
    locais: ''
  }
};
