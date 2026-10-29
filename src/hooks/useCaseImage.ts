import { useState, useEffect, useCallback } from 'react';
import { 
  obterImagemCaso, 
  obterImagensDoCaso,
  salvarImagemCaso, 
  adicionarImagemCaso,
  removerImagemCaso, 
  removerImagemEspecifica,
  arquivoParaDataURL,
  isAliasMatch,
  normalizarParaCasoOficial,
  ImagemArmazenada
} from '../utils/imageStore';

export function useCaseImage(casoId?: string, defaultUrl?: string) {
  const [imagens, setImagens] = useState<ImagemArmazenada[]>([]);
  const [indiceAtivo, setIndiceAtivo] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string | null>(defaultUrl || null);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Carregar imagens do banco de dados local ou verificar path estático padrão
  useEffect(() => {
    if (!casoId) {
      setImageUrl(defaultUrl || null);
      setImagens([]);
      setIndiceAtivo(0);
      setCarregando(false);
      return;
    }

    const currentCasoId = casoId;
    let isMounted = true;

    async function carregar() {
      setCarregando(true);
      try {
        const lista = await obterImagensDoCaso(currentCasoId);
        if (!isMounted) return;

        if (lista && lista.length > 0) {
          setImagens(lista);
          setIndiceAtivo(prev => (prev < lista.length ? prev : 0));
          setImageUrl(lista[0].dataUrl);
          return;
        }

        const single = await obterImagemCaso(currentCasoId);
        if (!isMounted) return;

        if (single && single.dataUrl) {
          setImagens([single]);
          setIndiceAtivo(0);
          setImageUrl(single.dataUrl);
          return;
        }

        if (defaultUrl) {
          setImageUrl(defaultUrl);
          setImagens([]);
          setIndiceAtivo(0);
          return;
        }

        // Tentar verificar se existe imagem estática colocada manualmente na pasta pública
        const oficialId = normalizarParaCasoOficial(currentCasoId);
        const publicPath = `/casos/${oficialId}.jpg`;
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            setImageUrl(publicPath);
            setImagens([{
              casoId: oficialId,
              dataUrl: publicPath,
              dataAtualizacao: Date.now()
            }]);
          }
        };
        img.onerror = () => {
          if (isMounted) {
            if (oficialId !== currentCasoId) {
              const imgAlt = new Image();
              imgAlt.onload = () => {
                if (isMounted) {
                  setImageUrl(`/casos/${currentCasoId}.jpg`);
                  setImagens([{
                    casoId: oficialId,
                    dataUrl: `/casos/${currentCasoId}.jpg`,
                    dataAtualizacao: Date.now()
                  }]);
                }
              };
              imgAlt.onerror = () => {
                if (isMounted) {
                  setImageUrl(null);
                  setImagens([]);
                }
              };
              imgAlt.src = `/casos/${currentCasoId}.jpg`;
            } else {
              setImageUrl(null);
              setImagens([]);
            }
          }
        };
        img.src = publicPath;
      } catch (e) {
        console.warn('Aviso ao ler imagem armazenada:', e);
        if (isMounted) {
          setImageUrl(defaultUrl || null);
          setImagens([]);
        }
      } finally {
        if (isMounted) setCarregando(false);
      }
    }

    carregar();

    // Ouvir atualizações de imagem disparadas de qualquer parte do app
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ 
        casoId: string; 
        dataUrl: string | null; 
        imagens?: ImagemArmazenada[] 
      }>;
      if (customEvent.detail && customEvent.detail.casoId) {
        const evtId = customEvent.detail.casoId;
        if (isAliasMatch(evtId, currentCasoId)) {
          if (customEvent.detail.imagens && customEvent.detail.imagens.length > 0) {
            setImagens(customEvent.detail.imagens);
            setIndiceAtivo(prev => {
              const nextIdx = prev < customEvent.detail.imagens!.length ? prev : 0;
              setImageUrl(customEvent.detail.imagens![nextIdx].dataUrl);
              return nextIdx;
            });
          } else if (customEvent.detail.dataUrl) {
            setImageUrl(customEvent.detail.dataUrl);
            setImagens([{
              casoId: currentCasoId,
              dataUrl: customEvent.detail.dataUrl,
              dataAtualizacao: Date.now()
            }]);
            setIndiceAtivo(0);
          } else {
            setImageUrl(null);
            setImagens([]);
            setIndiceAtivo(0);
          }
        }
      }
    };

    // Re-carregar ao voltar o foco para a janela
    const handleFocus = () => {
      carregar();
    };

    window.addEventListener('atlas-image-updated', handleUpdate);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('atlas-image-updated', handleUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [casoId, defaultUrl]);

  // Atualizar imageUrl quando o indiceAtivo muda
  useEffect(() => {
    if (imagens.length > 0) {
      const idx = Math.min(Math.max(0, indiceAtivo), imagens.length - 1);
      if (imagens[idx]?.dataUrl) {
        setImageUrl(imagens[idx].dataUrl);
      }
    }
  }, [indiceAtivo, imagens]);

  // Função para salvar nova imagem principal (substitui ou inicializa)
  const salvarArquivo = useCallback(async (file: File) => {
    if (!casoId) return;
    try {
      const dataUrl = await arquivoParaDataURL(file);
      await salvarImagemCaso(casoId, dataUrl, file.name, file.size);
      const lista = await obterImagensDoCaso(casoId);
      setImagens(lista);
      setImageUrl(dataUrl);
    } catch (err) {
      console.warn('Aviso ao salvar imagem do caso:', err);
    }
  }, [casoId]);

  // Adiciona uma foto ao acervo existente (suporte multi-imagem)
  const adicionarArquivo = useCallback(async (file: File) => {
    if (!casoId) return;
    try {
      const dataUrl = await arquivoParaDataURL(file);
      const novaLista = await adicionarImagemCaso(casoId, dataUrl, file.name, file.size);
      setImagens(novaLista);
      setIndiceAtivo(novaLista.length - 1); // foca na foto recém-adicionada
      setImageUrl(dataUrl);
    } catch (err) {
      console.warn('Aviso ao adicionar imagem ao caso:', err);
    }
  }, [casoId]);

  // Adiciona múltiplos arquivos ao acervo de uma vez
  const adicionarMultiplosArquivos = useCallback(async (files: FileList | File[]) => {
    if (!casoId || !files || files.length === 0) return;
    try {
      const arrayFiles = Array.from(files);
      let ultimaLista: ImagemArmazenada[] = imagens;
      for (const file of arrayFiles) {
        const dataUrl = await arquivoParaDataURL(file);
        ultimaLista = await adicionarImagemCaso(casoId, dataUrl, file.name, file.size);
      }
      setImagens(ultimaLista);
      setIndiceAtivo(ultimaLista.length - 1);
      if (ultimaLista.length > 0) {
        setImageUrl(ultimaLista[ultimaLista.length - 1].dataUrl);
      }
    } catch (err) {
      console.warn('Aviso ao adicionar múltiplos arquivos:', err);
    }
  }, [casoId, imagens]);

  // Remove a imagem que está atualmente ativa na exibição
  const removerFotoAtual = useCallback(async () => {
    if (!casoId || imagens.length === 0) return;
    try {
      const alvo = imagens[indiceAtivo] || imagens[0];
      const targetKey = alvo.id || alvo.dataUrl;
      const restante = await removerImagemEspecifica(casoId, targetKey);
      setImagens(restante);
      const novoIndice = Math.max(0, Math.min(indiceAtivo, restante.length - 1));
      setIndiceAtivo(novoIndice);
      setImageUrl(restante[novoIndice]?.dataUrl || null);
    } catch (err) {
      console.warn('Aviso ao remover foto atual:', err);
    }
  }, [casoId, imagens, indiceAtivo]);

  // Remove uma imagem específica pelo ID ou dataUrl
  const removerEspecifica = useCallback(async (idOuDataUrl: string) => {
    if (!casoId) return;
    try {
      const restante = await removerImagemEspecifica(casoId, idOuDataUrl);
      setImagens(restante);
      const novoIndice = Math.max(0, Math.min(indiceAtivo, restante.length - 1));
      setIndiceAtivo(novoIndice);
      setImageUrl(restante[novoIndice]?.dataUrl || null);
    } catch (err) {
      console.warn('Aviso ao remover foto específica:', err);
    }
  }, [casoId, indiceAtivo]);

  // Remove todas as imagens do caso
  const remover = useCallback(async () => {
    if (!casoId) return;
    try {
      await removerImagemCaso(casoId);
      setImageUrl(null);
      setImagens([]);
      setIndiceAtivo(0);
    } catch (err) {
      console.warn('Aviso ao remover imagens do caso:', err);
    }
  }, [casoId]);

  return {
    imageUrl,
    imagens,
    indiceAtivo,
    setIndiceAtivo,
    totalImagens: imagens.length,
    carregando,
    salvarArquivo,
    adicionarArquivo,
    adicionarMultiplosArquivos,
    removerFotoAtual,
    removerEspecifica,
    remover
  };
}
