import React, { useState, useEffect } from 'react';
import { 
  X, 
  Percent, 
  Users, 
  Gift, 
  Sparkles, 
  Check, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck,
  Tag,
  Clock,
  Calendar,
  HelpCircle
} from 'lucide-react';
import type { ConfigIndicacoes, RegraInfluenciador, ItemHistoricoIndicacao } from '../types/indicacoes.ts';
import { buscarConfigIndicacoes, salvarConfigIndicacoes, buscarTodasIndicacoes } from '../services/indicacoesService.ts';

interface ModalConfigurarIndicacoesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalConfigurarIndicacoes: React.FC<ModalConfigurarIndicacoesProps> = ({
  isOpen,
  onClose
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'influenciadores' | 'historico'>('geral');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [erroMsg, setErroMsg] = useState('');

  // Estados de configuração
  const [porcentagemPadrao, setPorcentagemPadrao] = useState<number>(10);
  const [cupomPadrao, setCupomPadrao] = useState<string>('TRICO10');
  const [diasBonusPadrao, setDiasBonusPadrao] = useState<number>(30);
  const [influenciadores, setInfluenciadores] = useState<RegraInfluenciador[]>([]);
  const [historico, setHistorico] = useState<ItemHistoricoIndicacao[]>([]);

  // Modal / Formulário de novo influenciador
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [infNome, setInfNome] = useState('');
  const [infEmail, setInfEmail] = useState('');
  const [infCupom, setInfCupom] = useState('');
  const [infPorcentagem, setInfPorcentagem] = useState<number>(15);
  const [infDiasBonus, setInfDiasBonus] = useState<number>(30);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen]);

  const carregarDados = async () => {
    setCarregando(true);
    setErroMsg('');
    try {
      const config = await buscarConfigIndicacoes();
      setPorcentagemPadrao(config.porcentagemPadrao || 10);
      setCupomPadrao(config.cupomPadrao || 'TRICO10');
      setDiasBonusPadrao(config.diasBonusPadrao || 30);
      setInfluenciadores(config.influenciadores || []);

      const hist = await buscarTodasIndicacoes();
      setHistorico(hist || []);
    } catch (e: any) {
      setErroMsg(e.message || 'Erro ao carregar configurações.');
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarConfigGeral = async (novosInfluenciadores = influenciadores) => {
    setSalvando(true);
    setSucessoMsg('');
    setErroMsg('');

    try {
      await salvarConfigIndicacoes({
        porcentagemPadrao: Number(porcentagemPadrao),
        cupomPadrao: cupomPadrao.trim().toUpperCase(),
        diasBonusPadrao: Number(diasBonusPadrao),
        influenciadores: novosInfluenciadores
      });

      setSucessoMsg('Configurações salvas e aplicadas com sucesso!');
      setTimeout(() => setSucessoMsg(''), 4000);
    } catch (e: any) {
      setErroMsg(e.message || 'Erro ao salvar alterações.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirFormNovoInfluenciador = () => {
    setEditandoId(null);
    setInfNome('');
    setInfEmail('');
    setInfCupom('');
    setInfPorcentagem(15);
    setInfDiasBonus(30);
    setModalNovoAberto(true);
  };

  const abrirFormEditarInfluenciador = (inf: RegraInfluenciador) => {
    setEditandoId(inf.id);
    setInfNome(inf.nome);
    setInfEmail(inf.email);
    setInfCupom(inf.codigoCupom);
    setInfPorcentagem(inf.porcentagemDesconto);
    setInfDiasBonus(inf.diasBonusIndicador);
    setModalNovoAberto(true);
  };

  const salvarInfluenciador = () => {
    if (!infNome.trim() || !infEmail.trim() || !infCupom.trim()) {
      alert('Por favor preencha nome, e-mail e código do cupom.');
      return;
    }

    let listaAtualizada: RegraInfluenciador[];
    if (editandoId) {
      listaAtualizada = influenciadores.map(inf => {
        if (inf.id === editandoId) {
          return {
            ...inf,
            nome: infNome.trim(),
            email: infEmail.trim().toLowerCase(),
            codigoCupom: infCupom.trim().toUpperCase(),
            porcentagemDesconto: Number(infPorcentagem),
            diasBonusIndicador: Number(infDiasBonus)
          };
        }
        return inf;
      });
    } else {
      const novo: RegraInfluenciador = {
        id: `inf_${Date.now()}`,
        nome: infNome.trim(),
        email: infEmail.trim().toLowerCase(),
        codigoCupom: infCupom.trim().toUpperCase(),
        porcentagemDesconto: Number(infPorcentagem),
        diasBonusIndicador: Number(infDiasBonus),
        ativo: true,
        criadoEm: new Date().toISOString()
      };
      listaAtualizada = [...influenciadores, novo];
    }

    setInfluenciadores(listaAtualizada);
    setModalNovoAberto(false);
    handleSalvarConfigGeral(listaAtualizada);
  };

  const toggleAtivoInfluenciador = (id: string) => {
    const atualizados = influenciadores.map(inf => {
      if (inf.id === id) {
        return { ...inf, ativo: !inf.ativo };
      }
      return inf;
    });
    setInfluenciadores(atualizados);
    handleSalvarConfigGeral(atualizados);
  };

  const removerInfluenciador = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta regra de influenciador?')) {
      const atualizados = influenciadores.filter(inf => inf.id !== id);
      setInfluenciadores(atualizados);
      handleSalvarConfigGeral(atualizados);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-500/20 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-50/50 to-white dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-600/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Indicações, Cupons & Influenciadores
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300">
                  Admin
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure as porcentagens de desconto na Kiwify, cupons e regras especiais para parceiros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="px-6 pt-3 border-b border-slate-200/70 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            onClick={() => setAbaAtiva('geral')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
              abaAtiva === 'geral'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Percent className="w-4 h-4" />
            Regra Geral ({porcentagemPadrao}% Desconto)
          </button>

          <button
            onClick={() => setAbaAtiva('influenciadores')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
              abaAtiva === 'influenciadores'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Influenciadores & Parceiros ({influenciadores.length})
          </button>

          <button
            onClick={() => setAbaAtiva('historico')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
              abaAtiva === 'historico'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Gift className="w-4 h-4" />
            Histórico de Conversões ({historico.length})
          </button>
        </div>

        {/* Notificações de Sucesso / Erro */}
        {sucessoMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{sucessoMsg}</span>
          </div>
        )}
        {erroMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{erroMsg}</span>
          </div>
        )}

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {carregando ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span>Carregando configurações de indicações...</span>
            </div>
          ) : abaAtiva === 'geral' ? (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/40 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                <div>
                  <strong className="block font-semibold mb-1">Como funciona a Regra Padrão:</strong>
                  Qualquer usuário comum que compartilhar seu link de indicação concederá o desconto definido abaixo no checkout da Kiwify, e receberá automaticamente 30 dias de assinatura estendida quando a compra for aprovada.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-teal-600" />
                    Porcentagem de Desconto Padrão
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={porcentagemPadrao}
                      onChange={e => setPorcentagemPadrao(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-400 text-sm font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Valor exibido para o usuário e aplicado no checkout.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-teal-600" />
                    Código do Cupom na Kiwify
                  </label>
                  <input
                    type="text"
                    value={cupomPadrao}
                    onChange={e => setCupomPadrao(e.target.value.toUpperCase())}
                    placeholder="TRICO10"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-teal-700 dark:text-teal-400 focus:ring-2 focus:ring-teal-500 outline-none uppercase"
                  />
                  <p className="text-[11px] text-slate-500">Crie este mesmo cupom no painel da Kiwify com {porcentagemPadrao}% de desconto.</p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    Bônus para o Indicador (Dias Adicionados à Assinatura)
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={diasBonusPadrao}
                      onChange={e => setDiasBonusPadrao(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-400 text-xs font-medium">dias</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Quando a indicação for aprovada, a validade do usuário indicador é estendida automaticamente por este período.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => handleSalvarConfigGeral()}
                  disabled={salvando}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {salvando ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Configuração Geral
                </button>
              </div>
            </div>
          ) : abaAtiva === 'influenciadores' ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Parceiros & Influenciadores Cadastrados
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina cupons e porcentagens personalizadas (ex: 15%, 20%, 30%) para perfis parceiros.
                  </p>
                </div>
                <button
                  onClick={abrirFormNovoInfluenciador}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Novo Influenciador
                </button>
              </div>

              {influenciadores.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center p-6 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Nenhum influenciador cadastrado ainda
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Cadastre influenciadores para criar cupons com porcentagens de desconto exclusivas para seus seguidores.
                  </p>
                  <button
                    onClick={abrirFormNovoInfluenciador}
                    className="px-4 py-2 rounded-xl bg-teal-600/10 text-teal-700 dark:text-teal-300 hover:bg-teal-600/20 text-xs font-bold transition-colors"
                  >
                    + Adicionar o Primeiro
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {influenciadores.map(inf => (
                    <div 
                      key={inf.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        inf.ativo 
                          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 shadow-sm' 
                          : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{inf.nome}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300">
                              {inf.porcentagemDesconto}% OFF
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{inf.email}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirFormEditarInfluenciador(inf)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removerInfluenciador(inf.id)}
                            title="Remover"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Tag className="w-3.5 h-3.5 text-teal-600" />
                          <span className="font-bold text-teal-700 dark:text-teal-400">{inf.codigoCupom}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">+{inf.diasBonusIndicador || 30} dias bônus</span>
                          <button
                            onClick={() => toggleAtivoInfluenciador(inf.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                              inf.ativo 
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {inf.ativo ? 'Ativo' : 'Pausado'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Histórico de Indicações Aprovadas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vendas realizadas na Kiwify que ativaram bônus de 30 dias para os indicadores
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300">
                  Total: {historico.length} adesões
                </span>
              </div>

              {historico.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center p-6 space-y-2">
                  <Gift className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-xs text-slate-500">Nenhuma indicação registrada até o momento.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                      <tr>
                        <th className="p-3">Data</th>
                        <th className="p-3">Quem Indicou</th>
                        <th className="p-3">Novo Assinante</th>
                        <th className="p-3">Plano</th>
                        <th className="p-3">Cupom</th>
                        <th className="p-3">Bônus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {historico.map(h => (
                        <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {new Date(h.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {h.indicadorNome ? `${h.indicadorNome} (${h.indicadorEmail})` : h.indicadorEmail}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {h.indicadoNome ? `${h.indicadoNome} (${h.indicadoEmail})` : h.indicadoEmail}
                          </td>
                          <td className="p-3 uppercase text-[11px] font-bold text-teal-700 dark:text-teal-400">
                            {h.planoId}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                            {h.cupomUtilizado || '-'}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                              +{h.diasConcedidos} dias
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Criar / Editar Influenciador */}
        {modalNovoAberto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editandoId ? 'Editar Influenciador' : 'Novo Influenciador / Parceiro'}
                </h3>
                <button
                  onClick={() => setModalNovoAberto(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nome do Influenciador / Parceiro
                  </label>
                  <input
                    type="text"
                    value={infNome}
                    onChange={e => setInfNome(e.target.value)}
                    placeholder="Ex: Dra. Camila Tricologia"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    E-mail do Usuário no TricoCalazans
                  </label>
                  <input
                    type="email"
                    value={infEmail}
                    onChange={e => setInfEmail(e.target.value)}
                    placeholder="camila@exemplo.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Necessário para conceder os bônus na conta dele.</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Cupom Kiwify
                    </label>
                    <input
                      type="text"
                      value={infCupom}
                      onChange={e => setInfCupom(e.target.value.toUpperCase())}
                      placeholder="CAMILA20"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      % de Desconto
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={infPorcentagem}
                      onChange={e => setInfPorcentagem(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Dias de Bônus por Venda
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={infDiasBonus}
                    onChange={e => setInfDiasBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-500">Padrão: 30 dias para cada assinatura realizada com o cupom.</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarInfluenciador}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20"
                >
                  Salvar Influenciador
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

