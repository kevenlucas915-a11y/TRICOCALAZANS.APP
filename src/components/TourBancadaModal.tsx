import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Hand, 
  Check, 
  Sparkles, 
  MousePointer, 
  Hash, 
  Layers, 
  SlidersHorizontal,
  Square,
  HelpCircle,
  Camera,
  Usb,
  Wifi,
  Video
} from 'lucide-react';

interface TourBancadaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  titulo: string;
  subtitulo: string;
  conteudo: React.ReactNode;
  dica: string;
}

export const TourBancadaModal: React.FC<TourBancadaModalProps> = ({
  isOpen,
  onClose
}) => {
  const [etapaAtual, setEtapaAtual] = useState<number>(0);

  if (!isOpen) return null;

  const passos: TourStep[] = [
    {
      titulo: 'Bem-vinda à Bancada de Tricoscopia Manual',
      subtitulo: 'Ferramenta profissional de precisão clínica e contagem folicular',
      conteudo: (
        <div className="space-y-3 text-xs text-stone-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Esta bancada foi inspirada em softwares tricoscópicos avançados. <strong>Toda a marcação é feita manualmente por você</strong> (via toque ou mouse), garantindo julgamento clínico exclusivo, sem contagens automáticas ou aproximações de IA.
          </p>
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Destaques da Bancada:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-stone-500 dark:text-slate-400">
              <li>Classificação direta por óstio folicular (1, 2, 3 fios ou vazio).</li>
              <li>Registro de sinais e achados patológicos do Atlas.</li>
              <li>Cálculo em tempo real de fios, densidade e média de fios/UF.</li>
            </ul>
          </div>
        </div>
      ),
      dica: 'Você pode reabrir este tour a qualquer momento no botão "Guia da Bancada".'
    },
    {
      titulo: '1. Conexão do Tricoscópio (Cabo / Wi-Fi) e Permissões',
      subtitulo: 'Como visualizar a câmera ao vivo e autorizar o acesso no navegador',
      conteudo: (
        <div className="space-y-3 text-xs text-stone-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Você pode capturar fotos direto do aparelho clicando no botão <strong>"📸 Conectar Câmera / Tricoscópio ao Vivo"</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                <Usb className="w-4 h-4 shrink-0" />
                <span>Por Cabo USB (UVC)</span>
              </div>
              <p className="text-stone-500 dark:text-slate-400 leading-relaxed">
                Plugue o cabo no computador (ou adaptador OTG no celular). O tricoscópio é reconhecido na hora como câmera externa. Verifique se o LED do aparelho acendeu.
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                <Wifi className="w-4 h-4 shrink-0" />
                <span>Por Wi-Fi (Sem Fio)</span>
              </div>
              <p className="text-stone-500 dark:text-slate-400 leading-relaxed">
                Conecte seu computador ou tablet na rede Wi-Fi emitida pelo aparelho e insira o endereço de stream IP (ex: <code>http://192.168.1.1:8080/stream</code>).
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2 text-[11px]">
            <strong className="text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Como conceder as permissões de câmera no navegador:</span>
            </strong>
            <ul className="list-disc list-inside space-y-1 pl-1 text-stone-600 dark:text-slate-300">
              <li><strong>Chrome e Edge:</strong> Olhe ao lado do link do site no topo e clique no ícone de <em>Cadeado</em> ou de <em>Ajustes do Site</em>. No item <strong>Câmera</strong>, selecione <strong>Permitir</strong>.</li>
              <li><strong>Safari (Mac):</strong> Menu superior <em>Safari &gt; Ajustes para Este Site... &gt; Câmera: Permitir</em>.</li>
              <li><strong>Celular/Tablet:</strong> Toque em <strong>Permitir</strong> quando surgir o aviso na tela.</li>
            </ul>
          </div>
        </div>
      ),
      dica: 'Na câmera ao vivo, aperte a barra de espaço para congelar a foto instantaneamente sem tirar a mão do aparelho!'
    },
    {
      titulo: '2. Barra de Ferramentas e Tipos de Óstio',
      subtitulo: 'Selecione a classificação antes de marcar a imagem',
      conteudo: (
        <div className="space-y-3 text-xs text-stone-600 dark:text-slate-300">
          <p className="leading-relaxed">
            No topo da imagem, selecione o tipo de elemento que deseja identificar. Apenas um tipo fica ativo por vez:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#2563EB] shrink-0" />
              <div>
                <strong className="text-blue-900 dark:text-blue-200">Unitário (Azul):</strong>
                <p className="text-stone-500 dark:text-slate-400">1 fio emergente por óstio.</p>
              </div>
            </div>

            <div className="p-2 rounded-xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/30 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#06B6D4] shrink-0" />
              <div>
                <strong className="text-cyan-900 dark:text-cyan-200">Duplo (Ciano):</strong>
                <p className="text-stone-500 dark:text-slate-400">2 fios emergentes por óstio.</p>
              </div>
            </div>

            <div className="p-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#16A34A] shrink-0" />
              <div>
                <strong className="text-emerald-900 dark:text-emerald-200">Triplo (Verde):</strong>
                <p className="text-stone-500 dark:text-slate-400">3 fios emergentes por óstio.</p>
              </div>
            </div>

            <div className="p-2 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/30 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F97316] shrink-0" />
              <div>
                <strong className="text-orange-900 dark:text-orange-200">Óstio Vazio (Laranja):</strong>
                <p className="text-stone-500 dark:text-slate-400">Ponto amarelo / óstio sem fio.</p>
              </div>
            </div>
          </div>
          <div className="p-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 flex items-center gap-2 text-[11px]">
            <span className="w-3 h-3 rounded-full bg-[#DC2626] shrink-0" />
            <div>
              <strong className="text-rose-900 dark:text-rose-200">Achado Tricoscópico (Vermelho):</strong>
              <p className="text-stone-500 dark:text-slate-400">Abre modal para registrar sinal (ex: anisotricose, halo marrom), intensidade e nota.</p>
            </div>
          </div>
          <div className="p-2 rounded-xl border border-fuchsia-200 dark:border-fuchsia-900 bg-fuchsia-50/50 dark:bg-fuchsia-950/30 flex items-center gap-2 text-[11px]">
            <span className="w-3 h-3 rounded-full bg-[#C026D3] shrink-0" />
            <div>
              <strong className="text-fuchsia-900 dark:text-fuchsia-200">🔥 Inflamação & Eritema (Fúcsia):</strong>
              <p className="text-stone-500 dark:text-slate-400">Identifica halos eritematosos perifoliculares, eritema interfolicular e focos inflamatórios ativos.</p>
            </div>
          </div>
        </div>
      ),
      dica: 'Cada categoria tem sua própria numeração sequencial independente (ex: Unitário 1, 2, 3...).'
    },
    {
      titulo: '3. Como Desenhar e Marcar na Imagem',
      subtitulo: 'Toque rápido ou arraste livre com o dedo ou mouse',
      conteudo: (
        <div className="space-y-3 text-xs text-stone-600 dark:text-slate-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-slate-100">
                <MousePointer className="w-4 h-4 text-rose-600" />
                <span>Toque Simples (Rápido)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-500 dark:text-slate-400">
                Dê um toque ou clique sobre o óstio folicular. Um retângulo pequeno padronizado é criado imediatamente centralizado no ponto.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-slate-100">
                <Square className="w-4 h-4 text-rose-600" />
                <span>Arraste Personalizado</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-500 dark:text-slate-400">
                Pressione e arraste sobre o óstio ou haste para criar uma caixa no tamanho exato desejado. Ao soltar, a marcação é confirmada.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
            🛡️ <strong>Prevenção de toques acidentais:</strong> Movimentos menores que 8 pixels são automaticamente filtrados para não poluir sua tela.
          </p>
        </div>
      ),
      dica: 'Errou? Use os botões Desfazer (Ctrl+Z) e Refazer com mais de 50 níveis de histórico!'
    },
    {
      titulo: '4. Modo Mover e Edição de Marcações',
      subtitulo: 'Navegação por pan/zoom e ajustes de caixas existentes',
      conteudo: (
        <div className="space-y-3 text-xs text-stone-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Ative o modo <strong>Mover (ícone de mão)</strong> sempre que quiser navegar pela lâmina ou ajustar marcações já criadas:
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-start gap-2 p-2 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
              <Hand className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
              <div>
                <strong>Navegação Livre:</strong> Arraste a imagem para mover o campo de visão. Dê zoom de 1x a 6x com a roda do mouse, pinça touch ou botões + e −.
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
              <SlidersHorizontal className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
              <div>
                <strong>Ajuste e Redimensionamento:</strong> Toque em uma marcação para selecioná-la. Arraste suas alças de canto para redimensionar ou mova a caixa inteira.
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
              <Layers className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
              <div>
                <strong>Mini Menu Flutuante:</strong> Na marcação selecionada, troque o tipo (de Unitário para Duplo, Triplo, etc.) com 1 clique ou exclua com o ícone de lixeira.
              </div>
            </div>
          </div>
        </div>
      ),
      dica: 'Ao remover ou alterar uma marcação, a sequência numérica é corrigida automaticamente.'
    },
    {
      titulo: '5. Painel de Contagem e Laudo Clínico',
      subtitulo: 'Estatísticas fototricoscópicas instantâneas prontas para emissão',
      conteudo: (
        <div className="space-y-3 text-xs text-stone-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Conforme você marca, o card lateral calcula tudo em tempo real:
          </p>
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span>Total de Fios e UFs:</span>
              <strong className="text-rose-700 dark:text-rose-400">Calculado automaticamente</strong>
            </div>
            <div className="flex justify-between">
              <span>Média de fios por UF:</span>
              <strong className="text-stone-900 dark:text-slate-100">Ex: 2,1 fios/UF</strong>
            </div>
            <div className="flex justify-between">
              <span>% de Unidades Unitárias:</span>
              <strong className="text-blue-700 dark:text-blue-400">Marcador de miniaturização</strong>
            </div>
            <div className="flex justify-between">
              <span>Densidade (cm²):</span>
              <strong className="text-emerald-700 dark:text-emerald-400">Preencha a área do campo óptico</strong>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-slate-400">
            Ao terminar, clique em <strong>"Salvar Sessão"</strong> no rodapé para gravar a ficha da cliente com todas as coordenadas, ou em <strong>"Emitir Laudo"</strong> para gerar um PDF médico pronto para impressão.
          </p>
        </div>
      ),
      dica: 'Suas sessões ficam salvas e você pode reabri-las no Histórico a qualquer momento.'
    }
  ];

  const passo = passos[etapaAtual];
  const ehUltimo = etapaAtual === passos.length - 1;

  const avancar = () => {
    if (ehUltimo) {
      onClose();
    } else {
      setEtapaAtual(prev => prev + 1);
    }
  };

  const voltar = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Cabeçalho do Tour */}
        <div className="p-5 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between bg-stone-50/80 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-700 dark:text-rose-300 font-bold text-xs">
              {etapaAtual + 1}/{passos.length}
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-rose-700 dark:text-rose-400 block">
                Guia Rápido da Bancada
              </span>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-slate-100 leading-tight">
                {passo.titulo}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 transition-colors"
            title="Pular tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Passo */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-stone-700 dark:text-slate-300 border-l-2 border-rose-500 pl-2">
            {passo.subtitulo}
          </p>

          <div>{passo.conteudo}</div>

          {/* Dica de Rodapé */}
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-bold">💡 Dica:</span>
            <span>{passo.dica}</span>
          </div>
        </div>

        {/* Rodapé de Navegação */}
        <div className="p-4 sm:px-6 border-t border-stone-100 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/80 flex items-center justify-between gap-3">
          {/* Indicadores de Progresso */}
          <div className="flex items-center gap-1.5">
            {passos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setEtapaAtual(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === etapaAtual 
                    ? 'w-6 bg-rose-600 dark:bg-rose-500' 
                    : 'w-2 bg-stone-300 dark:bg-slate-700 hover:bg-stone-400'
                }`}
                title={`Ir para etapa ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {etapaAtual > 0 ? (
              <button
                onClick={voltar}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-stone-500 dark:text-slate-400 text-xs font-medium hover:text-stone-800 dark:hover:text-slate-200 transition-colors"
              >
                Pular
              </button>
            )}

            <button
              onClick={avancar}
              className="px-4 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
            >
              <span>{ehUltimo ? 'Entendi, Começar!' : 'Próximo'}</span>
              {!ehUltimo && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
