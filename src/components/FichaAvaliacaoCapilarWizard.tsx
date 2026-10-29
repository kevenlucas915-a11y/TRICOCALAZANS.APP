import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Save, 
  Sparkles, 
  User, 
  Heart, 
  Activity, 
  Moon, 
  Scissors, 
  Stethoscope, 
  Edit3, 
  Download, 
  Share2, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  X,
  Search,
  CheckSquare,
  Square,
  Lock,
  Camera,
  Users
} from 'lucide-react';
import { Paciente } from '../types/paciente';
import { UsuarioProfissional } from '../types/usuario';
import { FichaAvaliacaoCapilarData, RespostaAnamnese, SessaoEvolucaoFicha } from '../types/anamnese';
import { saveRespostaAnamnese } from '../services/anamneseService';
import { baixarPdfFicha, compartilharPdfFicha } from '../services/fichaPdfGenerator';
import { MODELO_FICHA_AVALIACAO_CAPILAR_ID } from '../data/anamneseTemplates';

interface FichaAvaliacaoCapilarWizardProps {
  paciente: Paciente | null;
  profissional: UsuarioProfissional | null;
  fichaExistente?: RespostaAnamnese | null;
  onFechar: () => void;
  onFichaSalva: (resposta: RespostaAnamnese) => void;
  onNavegarParaPlanos?: () => void;
  onAvancarParaTricoscopia?: (paciente: Paciente) => void;
  onEncaminharParaRelatorioPaciente?: (paciente: Paciente) => void;
}

export const FichaAvaliacaoCapilarWizard: React.FC<FichaAvaliacaoCapilarWizardProps> = ({
  paciente,
  profissional,
  fichaExistente,
  onFechar,
  onFichaSalva,
  onNavegarParaPlanos,
  onAvancarParaTricoscopia,
  onEncaminharParaRelatorioPaciente
}) => {
  // Inicialização do estado da ficha
  const estadoInicial = useMemo<FichaAvaliacaoCapilarData>(() => {
    if (fichaExistente?.dadosFichaJson) {
      try {
        return JSON.parse(fichaExistente.dadosFichaJson);
      } catch {}
    }

    const calcularIdadeInicial = (nasc?: string) => {
      if (!nasc) return '';
      const data = new Date(nasc);
      if (isNaN(data.getTime())) return '';
      const hoje = new Date();
      let idade = hoje.getFullYear() - data.getFullYear();
      const m = hoje.getMonth() - data.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < data.getDate())) idade--;
      return idade > 0 ? `${idade} anos` : '';
    };

    return {
      nomeCliente: paciente?.nome || '',
      dataNascimento: paciente?.dataNascimento || '',
      idadeCalculada: calcularIdadeInicial(paciente?.dataNascimento),
      sexo: (paciente?.genero === 'Masculino' ? 'Masculino' : paciente?.genero === 'Outro' ? 'Outro' : 'Feminino'),
      cep: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      celular: paciente?.telefone || '',
      email: paciente?.email || '',
      profissao: '',
      estadoCivil: 'Solteiro(a)',
      comoConheceu: 'Redes sociais',
      queixaPrincipal: paciente?.queixaPrincipal || '',
      declaracaoVerdadeAceita: true,
      consentimentoLgpd: true,
      cidadeData: `${new Date().toLocaleDateString('pt-BR')}`
    };
  }, [paciente, fichaExistente]);

  const [ficha, setFicha] = useState<FichaAvaliacaoCapilarData>(estadoInicial);
  const [etapaAtual, setEtapaAtual] = useState<number>(1);
  const [secaoComplementarAberta, setSecaoComplementarAberta] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const [ultimoRascunhoHora, setUltimoRascunhoHora] = useState<string | null>(null);
  const [respostaId, setRespostaId] = useState<string | undefined>(fichaExistente?.id);
  const [statusFicha, setStatusFicha] = useState<'rascunho' | 'finalizada'>(fichaExistente?.status || 'rascunho');
  const [modalSucessoAberto, setModalSucessoAberto] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Canvas de Assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDesenhandoRef = useRef(false);

  // Etapas disponíveis (se Sexo !== Feminino, etapa 5 é removida)
  const etapasDefinidas = useMemo(() => {
    const lista = [
      { id: 1, chave: 'dados', titulo: 'Dados do Cliente', icone: User, subtitulo: 'Identificação e contato' },
      { id: 2, chave: 'queixa', titulo: 'Queixa Principal', icone: FileText, subtitulo: 'Relato do paciente' },
      { id: 3, chave: 'saude', titulo: 'Histórico de Saúde', icone: Heart, subtitulo: 'Cirurgias e doenças' },
      { id: 4, chave: 'habitos', titulo: 'Hábitos e Sono', icone: Activity, subtitulo: 'Rotina e estilo de vida' },
      ...(ficha.sexo === 'Feminino' ? [{ id: 5, chave: 'feminina', titulo: 'Saúde Feminina', icone: Moon, subtitulo: 'Ciclo e gestações' }] : []),
      { id: 6, chave: 'cabelo', titulo: 'Cabelo e Rotina', icone: Scissors, subtitulo: 'Químicas e higienização' },
      { id: 7, chave: 'avaliacao', titulo: 'Avaliação da Profissional', icone: Stethoscope, subtitulo: 'Conduta e exames' },
      { id: 8, chave: 'revisao', titulo: 'Revisão e Assinatura', icone: CheckCircle2, subtitulo: 'Termo e PDF' }
    ];
    return lista;
  }, [ficha.sexo]);

  const totalEtapas = etapasDefinidas.length;
  const indiceEtapaAtual = etapasDefinidas.findIndex(e => e.id === etapaAtual);
  const etapaValidaAtual = indiceEtapaAtual >= 0 ? etapasDefinidas[indiceEtapaAtual] : etapasDefinidas[0];
  const progressoPercentual = Math.round(((indiceEtapaAtual + 1) / totalEtapas) * 100);

  // Recuperar rascunho salvo do localStorage na inicialização se não houver ficha salva
  useEffect(() => {
    if (!fichaExistente && paciente?.id && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(`trico_rascunho_ficha_${paciente.id}`);
        if (raw) {
          const rascunho = JSON.parse(raw);
          if (rascunho && rascunho.nomeCliente) {
            setFicha(prev => ({ ...prev, ...rascunho }));
            setUltimoRascunhoHora('Recuperado da sessão anterior');
          }
        }
      } catch {}
    }
  }, [paciente?.id, fichaExistente]);

  // Salvar rascunho no localStorage automaticamente a cada alteração
  useEffect(() => {
    if (typeof window !== 'undefined' && paciente?.id) {
      try {
        window.localStorage.setItem(`trico_rascunho_ficha_${paciente.id}`, JSON.stringify(ficha));
      } catch {}
    }
  }, [ficha, paciente?.id]);

  // Cálculo dinâmico da idade ao alterar data de nascimento
  const handleDataNascimentoChange = (dataNasc: string) => {
    let idadeCalculada = '';
    if (dataNasc) {
      const data = new Date(dataNasc);
      if (!isNaN(data.getTime())) {
        const hoje = new Date();
        let idade = hoje.getFullYear() - data.getFullYear();
        const m = hoje.getMonth() - data.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < data.getDate())) idade--;
        if (idade >= 0) idadeCalculada = `${idade} anos`;
      }
    }
    setFicha(prev => ({ ...prev, dataNascimento: dataNasc, idadeCalculada }));
  };

  // Cálculo automático de horas de sono
  const calcularHorasSono = (dorme: string, acorda: string): string => {
    if (!dorme || !acorda) return '';
    try {
      const [hD, mD] = dorme.split(':').map(Number);
      const [hA, mA] = acorda.split(':').map(Number);
      if (isNaN(hD) || isNaN(hA)) return '';
      let minutosDorme = hD * 60 + (mD || 0);
      let minutosAcorda = hA * 60 + (mA || 0);
      if (minutosAcorda <= minutosDorme) minutosAcorda += 24 * 60;
      const difMin = minutosAcorda - minutosDorme;
      const horas = Math.floor(difMin / 60);
      const minutos = difMin % 60;
      return minutos > 0 ? `${horas}h ${minutos}min de sono` : `${horas} horas de sono`;
    } catch {
      return '';
    }
  };

  // Consulta automática de CEP via ViaCEP
  const handleCepChange = async (cepBruto: string) => {
    const limpo = cepBruto.replace(/\D/g, '').slice(0, 8);
    let formatado = limpo;
    if (limpo.length > 5) {
      formatado = `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
    }
    setFicha(prev => ({ ...prev, cep: formatado }));

    if (limpo.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFicha(prev => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            estado: data.uf || prev.estado
          }));
        }
      } catch (err) {
        console.warn('Erro ao consultar ViaCEP (preenchimento manual liberado):', err);
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  // Canvas de Assinatura: inicialização e eventos touch/mouse
  useEffect(() => {
    if (etapaAtual === 8 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Restaurar assinatura prévia se existir
        if (ficha.assinaturaClienteBase64) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = ficha.assinaturaClienteBase64;
        }
      }
    }
  }, [etapaAtual]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const iniciarDesenho = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDesenhandoRef.current = true;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const desenhar = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDesenhandoRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finalizarDesenho = () => {
    if (!isDesenhandoRef.current) return;
    isDesenhandoRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const base64 = canvas.toDataURL('image/png');
      setFicha(prev => ({ ...prev, assinaturaClienteBase64: base64 }));
    }
  };

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setFicha(prev => ({ ...prev, assinaturaClienteBase64: undefined }));
  };

  // Salvar no Firestore (como rascunho ou finalizada)
  const salvarFichaBanco = async (novoStatus: 'rascunho' | 'finalizada'): Promise<RespostaAnamnese | null> => {
    if (!ficha.nomeCliente.trim()) {
      setErroValidacao('O Nome do cliente é obrigatório.');
      setEtapaAtual(1);
      return null;
    }

    setSalvandoRascunho(true);
    setErroValidacao(null);

    try {
      const dadosFichaJson = JSON.stringify(ficha);
      const sessoesJson = JSON.stringify(ficha.sessoes || []);

      const respostaSalva = await saveRespostaAnamnese({
        id: respostaId,
        modeloId: MODELO_FICHA_AVALIACAO_CAPILAR_ID,
        modeloTitulo: 'Ficha de Avaliação Capilar',
        pacienteId: paciente?.id || 'paciente_avulso',
        pacienteNome: ficha.nomeCliente.trim(),
        userId: profissional?.uid,
        status: novoStatus,
        respostas: [
          { perguntaId: 'p_dados_cliente', perguntaTitulo: 'Dados do Cliente', tipo: 'texto_curto', valor: ficha.nomeCliente },
          { perguntaId: 'p_queixa_principal', perguntaTitulo: 'Queixa Principal', tipo: 'paragrafo', valor: ficha.queixaPrincipal || '' },
          { perguntaId: 'p_avaliacao_conduta', perguntaTitulo: 'Conduta Sugerida', tipo: 'paragrafo', valor: ficha.tratamentoSugerido || '' }
        ],
        dadosFichaJson,
        sessoesJson,
        assinaturaUrl: ficha.assinaturaClienteBase64,
        anotacoesEspecialista: ficha.anotacoesProfissional || '',
        dataPreenchimento: new Date().toISOString()
      });

      setRespostaId(respostaSalva.id);
      setStatusFicha(novoStatus);
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setUltimoRascunhoHora(`Salvo às ${hora}`);
      onFichaSalva(respostaSalva);

      // Limpar rascunho local se finalizada
      if (novoStatus === 'finalizada' && paciente?.id && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(`trico_rascunho_ficha_${paciente.id}`);
        } catch {}
      }

      return respostaSalva;
    } catch (err: any) {
      console.error('Erro ao salvar ficha:', err);
      setErroValidacao('Erro ao gravar ficha no banco de dados.');
      return null;
    } finally {
      setSalvandoRascunho(false);
    }
  };

  const handleSalvarRascunhoManual = async () => {
    await salvarFichaBanco('rascunho');
  };

  const handleAvancarEtapa = async () => {
    // Validar nome na etapa 1
    if (etapaAtual === 1 && !ficha.nomeCliente.trim()) {
      setErroValidacao('Por favor, informe o nome do cliente para prosseguir.');
      return;
    }
    setErroValidacao(null);

    // Salvar rascunho automaticamente a cada troca de etapa
    salvarFichaBanco('rascunho');

    // Achar próxima etapa válida
    const indexAtual = etapasDefinidas.findIndex(e => e.id === etapaAtual);
    if (indexAtual >= 0 && indexAtual < etapasDefinidas.length - 1) {
      setEtapaAtual(etapasDefinidas[indexAtual + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleVoltarEtapa = () => {
    const indexAtual = etapasDefinidas.findIndex(e => e.id === etapaAtual);
    if (indexAtual > 0) {
      setEtapaAtual(etapasDefinidas[indexAtual - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinalizarEGerarPdf = async () => {
    const salvo = await salvarFichaBanco('finalizada');
    if (salvo) {
      setModalSucessoAberto(true);
    }
  };

  // Helper para perguntas de Sim/Não com campo "Qual?"
  const renderPerguntaSimNaoComQual = (
    titulo: string,
    estadoObj: { sim: boolean; qual?: string } | undefined,
    onChange: (novo: { sim: boolean; qual?: string }) => void,
    placeholderQual: string = 'Especifique qual(is)...',
    rotuloQual: string = 'Qual?'
  ) => {
    const valorSim = estadoObj?.sim === true;

    return (
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 transition-all hover:border-teal-300 dark:hover:border-teal-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
            {titulo}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onChange({ sim: true, qual: estadoObj?.qual || '' })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                valorSim
                  ? 'bg-teal-700 text-white shadow-xs scale-102'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => onChange({ sim: false, qual: undefined })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                estadoObj?.sim === false
                  ? 'bg-slate-700 text-white shadow-xs scale-102'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Não
            </button>
          </div>
        </div>

        {/* Campo Qual condicional */}
        {valorSim && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 animate-fadeIn space-y-1">
            <label className="text-[11px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wider block">
              {rotuloQual}
            </label>
            <input
              type="text"
              value={estadoObj?.qual || ''}
              onChange={(e) => onChange({ sim: true, qual: e.target.value })}
              placeholder={placeholderQual}
              className="w-full px-3 py-2 text-xs rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-950/20 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}
      </div>
    );
  };

  // Helper para múltipla escolha em Chips
  const renderChipsMultiplaEscolha = (
    opcoes: string[],
    selecionados: string[] = [],
    onToggle: (opcao: string) => void
  ) => {
    return (
      <div className="flex flex-wrap gap-2 pt-1">
        {opcoes.map(op => {
          const ativo = selecionados.includes(op);
          return (
            <button
              key={op}
              type="button"
              onClick={() => onToggle(op)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                ativo
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700'
              }`}
            >
              {ativo && '✓ '}
              {op}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#040e0d] text-slate-900 dark:text-slate-100 pb-20">
      {/* BARRA SUPERIOR FIXA: TÍTULO, PROGRESSO & AÇÕES */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#071918]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onFechar}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Fechar formulário e voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md">
                    Passo 2 do Fluxo Clínico
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    Etapa {indiceEtapaAtual + 1} de {totalEtapas}
                  </span>
                  {ficha.nomeCliente && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900 border border-teal-500/30 px-2.5 py-0.5 rounded-lg shadow-xs">
                      👤 {ficha.nomeCliente}
                    </span>
                  )}
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Ficha de Avaliação Capilar
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {ultimoRascunhoHora && (
                <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
                  {ultimoRascunhoHora}
                </span>
              )}

              <button
                type="button"
                onClick={handleSalvarRascunhoManual}
                disabled={salvandoRascunho}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-teal-400 flex items-center gap-1.5 transition-colors"
                title="Salvar rascunho agora para continuar depois"
              >
                <Save className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">{salvandoRascunho ? 'Salvando...' : 'Salvar Rascunho'}</span>
              </button>
            </div>
          </div>

          {/* Barra de Progresso Suave */}
          <div className="mt-3">
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressoPercentual}%` }}
              />
            </div>
          </div>

          {/* Navegação Rápida pelas Etapas (Scroll Horizontal) */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {etapasDefinidas.map((et, idx) => {
              const Icone = et.icone;
              const ativa = et.id === etapaAtual;
              const concluida = idx < indiceEtapaAtual;

              return (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => {
                    salvarFichaBanco('rascunho');
                    setEtapaAtual(et.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                    ativa
                      ? 'bg-teal-700 text-white shadow-xs'
                      : concluida
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:text-slate-800'
                  }`}
                >
                  <Icone className="w-3.5 h-3.5" />
                  <span>{et.titulo}</span>
                  {concluida && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO WIZARD */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Banner do Título da Etapa */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-300">
              Etapa {indiceEtapaAtual + 1} de {totalEtapas}
            </span>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <etapaValidaAtual.icone className="w-5 h-5 text-teal-300" />
              <span>{etapaValidaAtual.titulo}</span>
            </h2>
            <p className="text-xs text-teal-100/80">
              {etapaValidaAtual.subtitulo}
            </p>
          </div>
        </div>

        {erroValidacao && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erroValidacao}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 1: DADOS DO CLIENTE */}
        {/* =================================================================== */}
        {etapaAtual === 1 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Nome do Cliente (Obrigatório) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-xs">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                <span>Nome Completo do Cliente *</span>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 font-normal">Obrigatório</span>
              </label>
              <input
                type="text"
                required
                value={ficha.nomeCliente}
                onChange={(e) => setFicha(prev => ({ ...prev, nomeCliente: e.target.value }))}
                placeholder="Ex: Maria Eduarda Silva"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Nascimento e Sexo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Data de Nascimento
                  </label>
                  {ficha.idadeCalculada && (
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono">
                      {ficha.idadeCalculada}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={ficha.dataNascimento || ''}
                  onChange={(e) => handleDataNascimentoChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-xs">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Sexo Biológico
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Feminino', 'Masculino', 'Outro'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFicha(prev => ({ ...prev, sexo: s }))}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                        ficha.sexo === s
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-teal-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Endereço & ViaCEP */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
                  Endereço & Localização
                </h3>
                {buscandoCep && (
                  <span className="text-[11px] text-teal-600 animate-pulse font-medium">
                    Consultando CEP...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    CEP (Busca Automática)
                  </label>
                  <input
                    type="text"
                    value={ficha.cep || ''}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Logradouro / Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={ficha.endereco || ''}
                    onChange={(e) => setFicha(prev => ({ ...prev, endereco: e.target.value }))}
                    placeholder="Rua, Av, nº, complemento"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={ficha.bairro || ''}
                    onChange={(e) => setFicha(prev => ({ ...prev, bairro: e.target.value }))}
                    placeholder="Bairro"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={ficha.cidade || ''}
                    onChange={(e) => setFicha(prev => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Cidade"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={ficha.estado || ''}
                    onChange={(e) => setFicha(prev => ({ ...prev, estado: e.target.value.toUpperCase() }))}
                    placeholder="UF"
                    maxLength={2}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Contato & Profissão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-xs">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Celular / WhatsApp
                </label>
                <input
                  type="text"
                  value={ficha.celular || ''}
                  onChange={(e) => setFicha(prev => ({ ...prev, celular: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-xs">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  E-mail
                </label>
                <input
                  type="email"
                  value={ficha.email || ''}
                  onChange={(e) => setFicha(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="cliente@email.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-xs">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Profissão / Ocupação
                </label>
                <input
                  type="text"
                  value={ficha.profissao || ''}
                  onChange={(e) => setFicha(prev => ({ ...prev, profissao: e.target.value }))}
                  placeholder="Ex: Engenheira, Advogado..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-xs">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Estado Civil
                </label>
                <select
                  value={ficha.estadoCivil || 'Solteiro(a)'}
                  onChange={(e) => setFicha(prev => ({ ...prev, estadoCivil: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="União estável">União estável</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                </select>
              </div>
            </div>

            {/* Como nos Conheceu */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5 shadow-xs">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Como nos conheceu?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['Redes sociais', 'Indicação', 'Revista ou jornal', 'Outdoor ou fachada', 'Outro'] as const).map(canal => (
                  <button
                    key={canal}
                    type="button"
                    onClick={() => setFicha(prev => ({ ...prev, comoConheceu: canal }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      ficha.comoConheceu === canal
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-teal-400'
                    }`}
                  >
                    {canal}
                  </button>
                ))}
              </div>

              {ficha.comoConheceu === 'Outro' && (
                <div className="pt-2 animate-fadeIn">
                  <input
                    type="text"
                    value={ficha.comoConheceuOutro || ''}
                    onChange={(e) => setFicha(prev => ({ ...prev, comoConheceuOutro: e.target.value }))}
                    placeholder="Por favor, especifique como nos conheceu..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-950/20 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Seção Recolhida: Dados Complementares (Opcional) */}
            <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
              <button
                type="button"
                onClick={() => setSecaoComplementarAberta(!secaoComplementarAberta)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Dados Complementares (Opcional)
                  </span>
                  <span className="text-[10px] text-slate-400">CPF, Tipo Sanguíneo e Etnia</span>
                </div>
                {secaoComplementarAberta ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {secaoComplementarAberta && (
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3.5 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        CPF (com máscara)
                      </label>
                      <input
                        type="text"
                        value={ficha.cpf || ''}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                          let m = v;
                          if (v.length > 9) m = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
                          else if (v.length > 6) m = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
                          else if (v.length > 3) m = `${v.slice(0, 3)}.${v.slice(3)}`;
                          setFicha(prev => ({ ...prev, cpf: m }));
                        }}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Etnia
                      </label>
                      <input
                        type="text"
                        value={ficha.etnia || ''}
                        onChange={(e) => setFicha(prev => ({ ...prev, etnia: e.target.value }))}
                        placeholder="Ex: Branca, Parda, Preta, Amarela, Indígena"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Tipo Sanguíneo
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Não sei'] as const).map(tipo => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setFicha(prev => ({ ...prev, tipoSanguineo: tipo }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            ficha.tipoSanguineo === tipo
                              ? 'bg-rose-700 text-white border-rose-700'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {tipo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 2: QUEIXA */}
        {/* =================================================================== */}
        {etapaAtual === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  Qual sua queixa principal?
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Descreva detalhadamente o motivo da consulta, tempo de evolução percebido, sintomas no couro cabeludo e impacto no dia a dia.
                </p>
              </div>

              <textarea
                rows={8}
                value={ficha.queixaPrincipal || ''}
                onChange={(e) => setFicha(prev => ({ ...prev, queixaPrincipal: e.target.value }))}
                placeholder="Ex: Queda excessiva ao lavar e escovar iniciada há cerca de 4 meses, com afinamento evidente no topo e coceira constante..."
                className="w-full p-4 text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 leading-relaxed resize-none"
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 3: HISTÓRICO DE SAÚDE */}
        {/* =================================================================== */}
        {etapaAtual === 3 && (
          <div className="space-y-3 animate-fadeIn">
            {renderPerguntaSimNaoComQual(
              'Teve doenças graves?',
              ficha.doencasGraves,
              (v) => setFicha(prev => ({ ...prev, doencasGraves: v }))
            )}

            {renderPerguntaSimNaoComQual(
              'Fez alguma cirurgia?',
              ficha.cirurgias,
              (v) => setFicha(prev => ({ ...prev, cirurgias: v }))
            )}

            {/* COVID e Vacina */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Já teve COVID-19?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFicha(prev => ({
                      ...prev,
                      covid: { teveCovid: true, tomouVacina: prev.covid?.tomouVacina ?? true, doses: prev.covid?.doses || '3' }
                    }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                      ficha.covid?.teveCovid
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setFicha(prev => ({
                      ...prev,
                      covid: { teveCovid: false, tomouVacina: prev.covid?.tomouVacina ?? false, doses: prev.covid?.doses }
                    }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                      ficha.covid?.teveCovid === false
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Não
                  </button>
                </div>
              </div>

              {/* Vacina e doses */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tomou a vacina? Quantas doses?
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={ficha.covid?.doses || ''}
                    onChange={(e) => setFicha(prev => ({
                      ...prev,
                      covid: {
                        teveCovid: prev.covid?.teveCovid ?? false,
                        tomouVacina: Number(e.target.value) > 0,
                        doses: e.target.value
                      }
                    }))}
                    placeholder="Doses"
                    className="w-24 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-center"
                  />
                  <span className="text-xs text-slate-400">doses</span>
                </div>
              </div>
            </div>

            {renderPerguntaSimNaoComQual(
              'Tem histórico de doença familiar (calvície ou doenças autoimunes)?',
              ficha.doencaFamiliar,
              (v) => setFicha(prev => ({ ...prev, doencaFamiliar: v }))
            )}

            {renderPerguntaSimNaoComQual(
              'Tem histórico de queloide ou má cicatrização?',
              ficha.queloide,
              (v) => setFicha(prev => ({ ...prev, queloide: v })),
              'Onde ou em quais procedimentos?'
            )}

            {renderPerguntaSimNaoComQual(
              'Está fazendo algum tratamento médico atualmente?',
              ficha.tratamentoAtual,
              (v) => setFicha(prev => ({ ...prev, tratamentoAtual: v }))
            )}

            {renderPerguntaSimNaoComQual(
              'Tem algum problema endócrino (tireoide, diabetes, etc.)?',
              ficha.problemaEndocrino,
              (v) => setFicha(prev => ({ ...prev, problemaEndocrino: v }))
            )}

            {renderPerguntaSimNaoComQual(
              'Tem algum problema cardíaco ou hipertensão?',
              ficha.problemaCardiaco,
              (v) => setFicha(prev => ({ ...prev, problemaCardiaco: v }))
            )}

            {/* Marcapasso (apenas Sim/Não) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2.5">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Usa marcapasso?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFicha(prev => ({ ...prev, marcapasso: true }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                    ficha.marcapasso
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setFicha(prev => ({ ...prev, marcapasso: false }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                    ficha.marcapasso === false
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            {renderPerguntaSimNaoComQual(
              'Tem prótese (dentária, mamária, pinos metálicos etc.)?',
              ficha.protese,
              (v) => setFicha(prev => ({ ...prev, protese: v }))
            )}

            {renderPerguntaSimNaoComQual(
              'Toma algum tipo de medicação ou vitamina de uso contínuo?',
              ficha.medicacaoContinua,
              (v) => setFicha(prev => ({ ...prev, medicacaoContinua: v })),
              'Nome das medicações e dosagens...'
            )}

            {renderPerguntaSimNaoComQual(
              'Tem alguma alergia (medicamentosa ou cosmética)?',
              ficha.alergias,
              (v) => setFicha(prev => ({ ...prev, alergias: v })),
              'Substâncias causadoras de alergia...'
            )}

            {renderPerguntaSimNaoComQual(
              'Tem problemas digestivos (refluxo, gastrite, azia)?',
              ficha.problemasDigestivos,
              (v) => setFicha(prev => ({ ...prev, problemasDigestivos: v }))
            )}

            {renderPerguntaSimNaoComQual(
              'Tem problemas intestinais (constipação, SII, disbiose)?',
              ficha.problemasIntestinais,
              (v) => setFicha(prev => ({ ...prev, problemasIntestinais: v }))
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 4: HÁBITOS */}
        {/* =================================================================== */}
        {etapaAtual === 4 && (
          <div className="space-y-4 animate-fadeIn">
            {renderPerguntaSimNaoComQual(
              'Pratica exercício físico?',
              ficha.exercicioFisico ? { sim: ficha.exercicioFisico.sim, qual: ficha.exercicioFisico.qualFrequencia } : undefined,
              (v) => setFicha(prev => ({ ...prev, exercicioFisico: { sim: v.sim, qualFrequencia: v.qual } })),
              'Qual modalidade e quantas vezes na semana?'
            )}

            {/* Bebida Alcoólica */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                Consome bebida alcoólica?
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['Não', 'Socialmente', 'Frequentemente'] as const).map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setFicha(prev => ({ ...prev, bebidaAlcoolica: op }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      ficha.bebidaAlcoolica === op
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuma */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2.5">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Fuma (cigarro tradicional ou eletrônico/vape)?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFicha(prev => ({ ...prev, fuma: true }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                    ficha.fuma
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setFicha(prev => ({ ...prev, fuma: false }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                    ficha.fuma === false
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>

            {renderPerguntaSimNaoComQual(
              'Usa drogas recreativas?',
              ficha.drogasRecreativas,
              (v) => setFicha(prev => ({ ...prev, drogasRecreativas: v }))
            )}

            {renderPerguntaSimNaoComQual(
              'Já teve alguma IST (Infecção Sexualmente Transmissível)?',
              ficha.ist,
              (v) => setFicha(prev => ({ ...prev, ist: v }))
            )}

            {/* Sono com cálculo automático de horas */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Rotina de Sono
                </span>
                {ficha.sono?.horasCalculadas && (
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono">
                    {ficha.sono.horasCalculadas}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário habitual que dorme
                  </label>
                  <input
                    type="time"
                    value={ficha.sono?.dormeAs || '23:00'}
                    onChange={(e) => {
                      const dorme = e.target.value;
                      const acorda = ficha.sono?.acordaAs || '07:00';
                      const horas = calcularHorasSono(dorme, acorda);
                      setFicha(prev => ({ ...prev, sono: { dormeAs: dorme, acordaAs: acorda, horasCalculadas: horas } }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário habitual que acorda
                  </label>
                  <input
                    type="time"
                    value={ficha.sono?.acordaAs || '07:00'}
                    onChange={(e) => {
                      const acorda = e.target.value;
                      const dorme = ficha.sono?.dormeAs || '23:00';
                      const horas = calcularHorasSono(dorme, acorda);
                      setFicha(prev => ({ ...prev, sono: { dormeAs: dorme, acordaAs: acorda, horasCalculadas: horas } }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 5: SAÚDE FEMININA (SÓ APARECE QUANDO SEXO = FEMININO) */}
        {/* =================================================================== */}
        {etapaAtual === 5 && ficha.sexo === 'Feminino' && (
          <div className="space-y-3.5 animate-fadeIn">
            {renderPerguntaSimNaoComQual(
              'Tem alteração menstrual ou ciclo irregular?',
              ficha.alteracaoMenstrual,
              (v) => setFicha(prev => ({ ...prev, alteracaoMenstrual: v }))
            )}

            {renderPerguntaSimNaoComQual(
              'Tem filhos?',
              ficha.temFilhos ? { sim: ficha.temFilhos.sim, qual: ficha.temFilhos.quantos } : undefined,
              (v) => setFicha(prev => ({ ...prev, temFilhos: { sim: v.sim, quantos: v.qual } })),
              'Quantos filhos?',
              'Quantos?'
            )}

            {renderPerguntaSimNaoComQual(
              'Teve perda gestacional?',
              ficha.perdaGestacional ? { sim: ficha.perdaGestacional.sim, qual: ficha.perdaGestacional.data } : undefined,
              (v) => setFicha(prev => ({ ...prev, perdaGestacional: { sim: v.sim, data: v.qual } })),
              'Data aproximada / observação',
              'Data / Detalhe'
            )}

            {/* Data da Última Gravidez */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Data da última gravidez (se aplicável)
              </label>
              <input
                type="date"
                value={ficha.dataUltimaGravidez || ''}
                onChange={(e) => setFicha(prev => ({ ...prev, dataUltimaGravidez: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
              />
            </div>

            {renderPerguntaSimNaoComQual(
              'A queixa de queda apareceu durante ou após a gravidez?',
              ficha.queixaNaGravidez,
              (v) => setFicha(prev => ({ ...prev, queixaNaGravidez: v }))
            )}

            {/* SOP (apenas Sim/Não) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2.5">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tem SOP (Síndrome do Ovário Policístico)?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFicha(prev => ({ ...prev, sop: true }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                    ficha.sop
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setFicha(prev => ({ ...prev, sop: false }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] ${
                    ficha.sop === false
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 6: CABELO E ROTINA */}
        {/* =================================================================== */}
        {etapaAtual === 6 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Químicas em Chips */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3">
              <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Químicas realizadas nos últimos 3 a 12 meses
              </label>
              {renderChipsMultiplaEscolha(
                ['Progressiva', 'Alisamento', 'Relaxamento', 'Coloração', 'Descoloração/Luzes', 'Henna', 'Permanente/Cacheamento', 'Nenhuma'],
                ficha.quimicas,
                (opcao) => {
                  setFicha(prev => {
                    const atuais = prev.quimicas || [];
                    if (opcao === 'Nenhuma') return { ...prev, quimicas: ['Nenhuma'] };
                    const semNenhuma = atuais.filter(o => o !== 'Nenhuma');
                    const existe = semNenhuma.includes(opcao);
                    const novo = existe ? semNenhuma.filter(o => o !== opcao) : [...semNenhuma, opcao];
                    return { ...prev, quimicas: novo };
                  });
                }
              )}

              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Outras químicas / quando fez:
                </label>
                <input
                  type="text"
                  value={ficha.quimicasOutras || ''}
                  onChange={(e) => setFicha(prev => ({ ...prev, quimicasOutras: e.target.value }))}
                  placeholder="Ex: Botox capilar em Dezembro, mechas há 6 meses..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            {/* Hábitos e Adornos em Chips */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3">
              <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Hábitos diários, adornos e tração capilar
              </label>
              {renderChipsMultiplaEscolha(
                ['Rabo de cavalo ou coque apertado', 'Tranças', 'Mega hair / apliques', 'Boné ou chapéu', 'Faixa ou tiara', 'Prende o cabelo molhado', 'Nenhum'],
                ficha.habitosAdornos,
                (opcao) => {
                  setFicha(prev => {
                    const atuais = prev.habitosAdornos || [];
                    if (opcao === 'Nenhum') return { ...prev, habitosAdornos: ['Nenhum'] };
                    const semNenhum = atuais.filter(o => o !== 'Nenhum');
                    const existe = semNenhum.includes(opcao);
                    const novo = existe ? semNenhum.filter(o => o !== opcao) : [...semNenhum, opcao];
                    return { ...prev, habitosAdornos: novo };
                  });
                }
              )}

              <div className="pt-2">
                <input
                  type="text"
                  value={ficha.habitosAdornosLivre || ''}
                  onChange={(e) => setFicha(prev => ({ ...prev, habitosAdornosLivre: e.target.value }))}
                  placeholder="Outros hábitos específicos..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            {/* Higienização e Secagem */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                Higienização & Finalização
              </h3>

              {/* Frequência de lavagem */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Frequência de lavagem do cabelo:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['Todo dia', 'A cada 2 dias', '2x por semana', '1x por semana', 'Menos'] as const).map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFicha(prev => ({ ...prev, frequenciaLavagem: freq }))}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                        ficha.frequenciaLavagem === freq
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperatura da água */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Temperatura da água ao lavar:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Fria', 'Morna', 'Quente'] as const).map(temp => (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => setFicha(prev => ({ ...prev, temperaturaAgua: temp }))}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        ficha.temperaturaAgua === temp
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secagem e chapinha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Modo de secagem habitual:
                  </label>
                  <select
                    value={ficha.secagem || 'Natural'}
                    onChange={(e) => setFicha(prev => ({ ...prev, secagem: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="Natural">Secagem Natural</option>
                    <option value="Secador">Secador (ar quente)</option>
                    <option value="Difusor">Difusor</option>
                    <option value="Toalha esfregando">Toalha esfregando com força</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Uso de chapinha ou babyliss:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Nunca', 'Às vezes', 'Frequente'] as const).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setFicha(prev => ({ ...prev, chapinhaBabyliss: u }))}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                          ficha.chapinhaBabyliss === u
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Observações adicionais de rotina:
                </label>
                <input
                  type="text"
                  value={ficha.higienizacaoLivre || ''}
                  onChange={(e) => setFicha(prev => ({ ...prev, higienizacaoLivre: e.target.value }))}
                  placeholder="Ex: Usa xampu anticaspa 1x/semana, dorme com cabelo úmido às vezes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 7: AVALIAÇÃO DA PROFISSIONAL */}
        {/* =================================================================== */}
        {etapaAtual === 7 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Anotações e Achados Clínicos da Profissional
              </label>
              <textarea
                rows={4}
                value={ficha.anotacoesProfissional || ''}
                onChange={(e) => setFicha(prev => ({ ...prev, anotacoesProfissional: e.target.value }))}
                placeholder="Observações do exame tricoscópico, padrão de miniaturização, eritema perifolicular, densidade..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-teal-500 leading-relaxed"
              />
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Tratamento Sugerido / Conduta Inicial
              </label>
              <textarea
                rows={4}
                value={ficha.tratamentoSugerido || ''}
                onChange={(e) => setFicha(prev => ({ ...prev, tratamentoSugerido: e.target.value }))}
                placeholder="Protocolo em cabine sugerido, periodicidade de sessões, cuidados domiciliares..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-teal-500 leading-relaxed"
              />
            </div>

            {renderPerguntaSimNaoComQual(
              'Coleta para microscopia / biópsia?',
              ficha.coletaMicroscopia ? { sim: ficha.coletaMicroscopia.sim, qual: ficha.coletaMicroscopia.dataEnvio } : undefined,
              (v) => setFicha(prev => ({ ...prev, coletaMicroscopia: { sim: v.sim, dataEnvio: v.qual } })),
              'Data do envio e laboratório...',
              'Data do envio'
            )}

            {renderPerguntaSimNaoComQual(
              'Indicação de nutracêuticos / fórmulas orais?',
              ficha.indicacaoNutraceuticos ? { sim: ficha.indicacaoNutraceuticos.sim, qual: ficha.indicacaoNutraceuticos.sugerido } : undefined,
              (v) => setFicha(prev => ({ ...prev, indicacaoNutraceuticos: { sim: v.sim, sugerido: v.qual } })),
              'Compostos ou marcas indicadas...',
              'Fórmula / Nutracêutico Sugerido'
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* ETAPA 8: REVISÃO, DECLARAÇÃO E ASSINATURA */}
        {/* =================================================================== */}
        {etapaAtual === 8 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Resumo por Etapa com botão Editar */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Resumo das Informações Registradas
              </h3>

              {etapasDefinidas.slice(0, -1).map(et => (
                <div 
                  key={et.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <et.icone className="w-4 h-4 text-teal-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {et.titulo}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {et.chave === 'dados' && `${ficha.nomeCliente || '—'} • ${ficha.celular || 'Sem celular'}`}
                        {et.chave === 'queixa' && (ficha.queixaPrincipal ? `${ficha.queixaPrincipal.slice(0, 45)}...` : 'Sem queixa')}
                        {et.chave === 'saude' && 'Histórico clínico e doenças preenchido'}
                        {et.chave === 'habitos' && `${ficha.bebidaAlcoolica ? `Álcool: ${ficha.bebidaAlcoolica}` : 'Hábitos registrados'}`}
                        {et.chave === 'feminina' && 'Histórico ginecológico e gestações'}
                        {et.chave === 'cabelo' && `${(ficha.quimicas || []).join(', ') || 'Rotina e químicas'}`}
                        {et.chave === 'avaliacao' && 'Conduta e anotações clínicas'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      salvarFichaBanco('rascunho');
                      setEtapaAtual(et.id);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Declaração Jurídica */}
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal-900 dark:text-teal-200">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Declaração de Veracidade das Informações</span>
              </div>
              <p className="text-[11px] leading-relaxed italic text-slate-600 dark:text-slate-300">
                "As declarações aqui contidas representam a expressão da verdade, não cabendo ao profissional qualquer responsabilidade por dados omitidos ou enganosos."
              </p>
              <div className="pt-2">
                <input
                  type="text"
                  value={ficha.cidadeData || ''}
                  onChange={(e) => setFicha(prev => ({ ...prev, cidadeData: e.target.value }))}
                  placeholder="Cidade e Data (Ex: São Paulo, 03 de Outubro de 2026)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Canvas de Assinatura Digital do Cliente */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  Assinatura do Cliente (Desenhe com o dedo ou mouse)
                </label>
                <button
                  type="button"
                  onClick={limparAssinatura}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              </div>

              <div className="w-full bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden relative touch-none">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  className="w-full h-36 cursor-crosshair block"
                  onMouseDown={iniciarDesenho}
                  onMouseMove={desenhar}
                  onMouseUp={finalizarDesenho}
                  onMouseLeave={finalizarDesenho}
                  onTouchStart={iniciarDesenho}
                  onTouchMove={desenhar}
                  onTouchEnd={finalizarDesenho}
                />
                {!ficha.assinaturaClienteBase64 && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400">
                    ✍️ Assine aqui na tela
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox de Consentimento LGPD */}
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 cursor-pointer hover:border-teal-300 transition-colors">
              <input
                type="checkbox"
                checked={ficha.consentimentoLgpd ?? true}
                onChange={(e) => setFicha(prev => ({ ...prev, consentimentoLgpd: e.target.checked }))}
                className="mt-0.5 w-4 h-4 text-teal-600 rounded-sm border-slate-300 focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                Autorizo o uso destes dados exclusivamente para meu atendimento capilar, em conformidade com as diretrizes clínicas e a LGPD.
              </span>
            </label>
          </div>
        )}

        {/* BARRA FIXA DE NAVEGAÇÃO: VOLTAR / PRÓXIMO / FINALIZAR */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleVoltarEtapa}
            disabled={indiceEtapaAtual === 0}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          {etapaAtual < 8 ? (
            <button
              type="button"
              onClick={handleAvancarEtapa}
              className="px-6 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:scale-[1.01]"
            >
              <span>Próxima Etapa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalizarEGerarPdf}
              disabled={salvandoRascunho}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg hover:scale-[1.01]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{salvandoRascunho ? 'Finalizando...' : 'Finalizar e Gerar PDF'}</span>
            </button>
          )}
        </div>
      </main>

      {/* MODAL DE SUCESSO E DOWNLOAD / COMPARTILHAMENTO DO PDF */}
      {modalSucessoAberto && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-8 sm:pt-14 p-4 bg-black/75 backdrop-blur-sm overflow-y-auto overscroll-contain animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-teal-200 dark:border-teal-800 space-y-5 text-center mb-8 sm:mb-12">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Ficha Finalizada com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                As respostas de <strong>{ficha.nomeCliente}</strong> foram gravadas no prontuário. Você já pode baixar ou compartilhar o PDF completo agora.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => baixarPdfFicha({ ficha, profissional, sessoes: ficha.sessoes })}
                className="py-3 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => compartilharPdfFicha({ ficha, profissional, sessoes: ficha.sessoes })}
                className="py-3 px-4 rounded-2xl border border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar</span>
              </button>
            </div>

            {onAvancarParaTricoscopia && (
              <button
                type="button"
                onClick={() => {
                  setModalSucessoAberto(false);
                  const pac = paciente || { id: fichaExistente?.pacienteId || 'pac_temp', nome: ficha.nomeCliente };
                  onAvancarParaTricoscopia(pac as Paciente);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01]"
              >
                <Camera className="w-4 h-4" />
                <span>Avançar para Passo 3: Registrar Fotos na Bancada ➜</span>
              </button>
            )}

            {onEncaminharParaRelatorioPaciente && (
              <button
                type="button"
                onClick={() => {
                  setModalSucessoAberto(false);
                  const pac = paciente || { id: fichaExistente?.pacienteId || 'pac_temp', nome: ficha.nomeCliente };
                  onEncaminharParaRelatorioPaciente(pac as Paciente);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-2 border border-teal-200 dark:border-teal-800 transition-colors shadow-xs"
                title="Acessar fotos, laudos, consultas e histórico no prontuário do paciente"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Encaminhar para o Relatório do Paciente (Fotos & Consultas)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setModalSucessoAberto(false);
                onFechar();
              }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Concluir e Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
