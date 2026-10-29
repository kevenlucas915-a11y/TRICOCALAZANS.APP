import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  Layers, 
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Lock,
  HelpCircle,
  Smartphone,
  Calendar,
  FileText,
  CreditCard,
  Settings
} from 'lucide-react';
import { PLANOS_DISPONIVEIS, PlanoConfig, CicloCobranca } from '../types/assinatura';
import { useAuth } from '../context/AuthContext';
import { CheckoutModal } from './CheckoutModal';
import { ModalConfigurarStripe } from './ModalConfigurarStripe';

export const PlanosView: React.FC = () => {
  const { usuarioAtual } = useAuth();
  const [planoSelecionadoCheckout, setPlanoSelecionadoCheckout] = useState<PlanoConfig | null>(null);
  const [cicloCheckout, setCicloCheckout] = useState<CicloCobranca>('anual');
  const [faqAberta, setFaqAberta] = useState<number | null>(0);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [modalStripeAberto, setModalStripeAberto] = useState(false);
  const [stripeConfig, setStripeConfig] = useState<{ configured: boolean; mode: string } | null>(null);

  useEffect(() => {
    fetch('/api/stripe/config')
      .then(res => res.json())
      .then(dados => setStripeConfig(dados))
      .catch(() => {});
  }, [modalStripeAberto]);

  const planoAtualId = usuarioAtual?.planoId || 'anual';
  const statusAtual = usuarioAtual?.planoStatus || 'trial';

  const formatarData = (iso?: string) => {
    if (!iso) return 'Ativo';
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return 'Ativo';
    }
  };

  const handleAbrirCheckout = (plano: PlanoConfig) => {
    setPlanoSelecionadoCheckout(plano);
    setCicloCheckout(plano.id === 'mensal' ? 'mensal' : 'anual');
  };

  const handleSucessoAssinatura = (plano: PlanoConfig, cicloEscolhido: CicloCobranca) => {
    setPlanoSelecionadoCheckout(null);
    setMensagemSucesso(`Parabéns! Sua assinatura do ${plano.nome} (${cicloEscolhido === 'anual' ? 'Anual' : 'Mensal'}) foi ativada com sucesso.`);
    setTimeout(() => setMensagemSucesso(null), 6000);
  };

  const toggleFaq = (index: number) => {
    setFaqAberta(faqAberta === index ? null : index);
  };

  const faqs = [
    {
      pergunta: 'Qual a diferença principal entre o Plano Mensal e o Plano Anual?',
      resposta: 'O Plano Anual oferece a maior economia (R$ 49,90/mês contra R$ 69,90/mês no avulso) e inclui com exclusividade o Envio de Acesso à Plataforma para os Pacientes (Portal do Paciente), permitindo que seus clientes acompanhem pelo celular suas fotos liberadas e orientações.'
    },
    {
      pergunta: 'Como funciona o cancelamento? Há fidelidade no Plano Mensal?',
      resposta: 'No Plano Mensal não há carência nem fidelidade; você pode cancelar a qualquer momento diretamente no seu painel. No Plano Anual, você garante a tarifa promocional de R$ 49,90/mês em até 12x no cartão com 1 ano completo de acesso.'
    },
    {
      pergunta: 'Os dados e fotos dos meus pacientes estão protegidos?',
      resposta: 'Sim! Seguimos rigorosamente a LGPD. Todos os dados, fotografias tricoscópicas e laudos são armazenados em nuvem de alta segurança com criptografia de ponta a ponta e backups diários.'
    },
    {
      pergunta: 'Vocês emitem Nota Fiscal (NFS-e)?',
      resposta: 'Sim! Emitimos nota fiscal automaticamente para todas as assinaturas, tanto para CPF de profissional autônomo quanto para CNPJ de clínica médica, possibilitando dedução fiscal.'
    },
    {
      pergunta: 'Posso acessar do computador, notebook ou tablet?',
      resposta: 'Sim! O TricoCalazans é 100% em nuvem e adaptado para telas de computadores, MacBooks, iPads e tablets no consultório.'
    }
  ];

  const planoMensal = PLANOS_DISPONIVEIS.find(p => p.id === 'mensal') || PLANOS_DISPONIVEIS[0];
  const planoAnual = PLANOS_DISPONIVEIS.find(p => p.id === 'anual') || PLANOS_DISPONIVEIS[1];

  return (
    <div className="space-y-8 animate-fadeIn pb-14 max-w-6xl mx-auto">
      {/* 1. MENSAGEM DE SUCESSO TOAST */}
      {mensagemSucesso && (
        <div className="p-4 rounded-2xl bg-teal-600 text-white shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-teal-200 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button 
            onClick={() => setMensagemSucesso(null)}
            className="p-1 rounded-lg hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-teal-200/50 dark:border-teal-500/20">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Crown className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Planos & Assinaturas Clínicas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Escolha o formato ideal para diagnósticos, laudos em PDF e acompanhamento dos seus pacientes.
          </p>
        </div>

        {/* Controles de Ação do Topo */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botão Configurar Stripe */}
          <button
            type="button"
            onClick={() => setModalStripeAberto(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-white/[0.05] hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-500/30 text-xs font-bold transition-all shadow-xs group"
            title="Gerenciar e configurar chaves do Stripe, Webhooks e modo de teste"
          >
            <div className="w-6 h-6 rounded-lg bg-teal-600/10 dark:bg-teal-400/10 text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <span>Configurar Stripe</span>
            {stripeConfig?.configured ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40">
                {stripeConfig.mode === 'live' ? 'Live' : 'Testes'}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40">
                Sandbox
              </span>
            )}
          </button>

          {/* Resumo do Status Atual do Profissional */}
          <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl glass-card border border-teal-200/70 dark:border-teal-500/30">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-left text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white">
                  {planoAtualId === 'anual' ? 'Plano Anual' : planoAtualId === 'mensal' ? 'Plano Mensal' : 'Plano Clínico'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  statusAtual === 'ativo' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {statusAtual === 'trial' ? 'Período Ativo' : 'Assinatura Ativa'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Vencimento: {formatarData(usuarioAtual?.planoValidade)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HERO BANNER DE AUTORIDADE CLÍNICA */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Valor Percebido Imediato nas Consultas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
            Diagnósticos mais precisos, laudos de alta autoridade e fidelização.
          </h2>
          <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
            Profissionais que entregam <strong>laudos fotográficos estruturados</strong> e acompanhamento digital justificam consultas diferenciadas e aceleram a adesão aos planos de tratamento capilar.
          </p>
        </div>
      </div>

      {/* 4. CARDS DOS 2 PLANOS (MENSAL vs ANUAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* CARD 1: PLANO MENSAL */}
        <div className="glass-card rounded-3xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden border border-slate-200/80 dark:border-white/10 hover:border-teal-500/40 p-6 sm:p-7 space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                Flexibilidade Mês a Mês
              </span>
              <span className="text-xs text-slate-400 font-medium">Sem fidelidade</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {planoMensal.nome}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {planoMensal.subtitulo}
              </p>
            </div>

            {/* Preço Mensal */}
            <div className="pt-2 pb-4 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-slate-400">R$</span>
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  69,90
                </span>
                <span className="text-xs text-slate-400 font-medium">/mês</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Cobrança mensal avulsa. Cancele quando desejar com 1 clique.
              </p>
            </div>

            {/* Diferencial do Portal */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Envio de Acesso ao Portal do Paciente: <strong>Não incluso</strong> (Exclusivo Anual)</span>
            </div>

            {/* Lista de Recursos */}
            <div className="space-y-2.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                O que está incluso:
              </span>
              {planoMensal.recursos.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  {rec.incluso ? (
                    <div className="w-4 h-4 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  )}
                  <span className={rec.incluso ? (rec.destaque ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300') : 'text-slate-400 line-through'}>
                    {rec.texto}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleAbrirCheckout(planoMensal)}
            className="w-full py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 glass-button text-slate-900 dark:text-white hover:border-teal-500 hover:scale-[1.01]"
          >
            <span>Assinar Plano Mensal (R$ 69,90/mês)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* CARD 2: PLANO ANUAL (DESTAQUE / MAIS RECOMENDADO) */}
        <div className="glass-card rounded-3xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden border-2 border-teal-600 dark:border-teal-400 shadow-2xl scale-[1.01] bg-white/95 dark:bg-slate-900/95 p-6 sm:p-7 space-y-6">
          {/* Badge de Destaque no Topo */}
          <div className="absolute top-0 right-0">
            <div className="px-4 py-1.5 rounded-bl-2xl bg-teal-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Mais Escolhido • Economize 28%</span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-bold uppercase tracking-wider">
                Melhor Custo-Benefício
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{planoAnual.nome}</span>
                <Crown className="w-5 h-5 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {planoAnual.subtitulo}
              </p>
            </div>

            {/* Preço Anual */}
            <div className="pt-2 pb-4 border-b border-teal-100 dark:border-teal-900/40">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">R$</span>
                <span className="text-4xl font-extrabold text-teal-700 dark:text-teal-400 tracking-tight">
                  49,90
                </span>
                <span className="text-xs text-slate-400 font-medium">/mês</span>
              </div>
              <p className="text-[11px] text-teal-800 dark:text-teal-300 font-semibold mt-1">
                Faturado R$ 598,80 ao ano (em até 12x de R$ 49,90 no cartão sem juros ou no PIX). Economia de R$ 240,00 no ano!
              </p>
            </div>

            {/* Destaque do Portal do Paciente */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200">
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span><strong>Envio de Acesso ao Portal do Paciente Incluso:</strong> Seus pacientes acompanham fotos e evoluções pelo celular!</span>
            </div>

            {/* Lista de Recursos */}
            <div className="space-y-2.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Tudo do Plano Mensal, mais:
              </span>
              {planoAnual.recursos.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span className={rec.destaque ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}>
                    {rec.texto}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleAbrirCheckout(planoAnual)}
            className="w-full py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white shadow-lg shadow-teal-700/25 hover:scale-[1.01]"
          >
            <span>Assinar Plano Anual (12x de R$ 49,90)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. TABELA COMPARATIVA DIRETA MENSAL vs ANUAL */}
      <div className="glass-card overflow-hidden rounded-3xl mt-8 border border-slate-200/80 dark:border-white/10">
        <div className="p-5 sm:p-6 border-b border-slate-200/60 dark:border-white/[0.08] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Comparativo Resumido: Mensal vs Anual
            </h3>
            <p className="text-xs text-slate-400">
              Veja lado a lado as funcionalidades e benefícios de cada modalidade.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-slate-400 border-b border-slate-200/60 dark:border-white/[0.08]">
              <tr>
                <th className="py-3.5 px-5 font-bold">Funcionalidade</th>
                <th className="py-3.5 px-4 font-bold text-center">Plano Mensal (R$ 69,90)</th>
                <th className="py-3.5 px-4 font-bold text-center text-teal-700 dark:text-teal-400">Plano Anual (R$ 49,90/mês)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-white/[0.05]">
              <tr>
                <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                  Atlas Clínico Tricoscópico Completo (Casos HD)
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Incluso</td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Incluso</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                  Prontuários e Pacientes Ilimitados
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Ilimitado</td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Ilimitado</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                  Anamneses Clínicas & Laudos PDF A4 sem marca
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Incluso</td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Incluso</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                  Bancada de Tricoscopia (Zoom 5x, Rotação e Filtros Ópticos)
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Incluso</td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Incluso</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                  Agenda Clínica Integrada de Consultas
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Incluso</td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">✓ Incluso</td>
              </tr>
              <tr className="bg-teal-50/30 dark:bg-teal-950/20 font-bold">
                <td className="py-3.5 px-5 text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>Envio de Acesso à Plataforma para os Pacientes (Portal do Paciente)</span>
                </td>
                <td className="py-3.5 px-4 text-center text-amber-700 dark:text-amber-400 font-semibold">
                  Bloqueado (Exclusivo Anual)
                </td>
                <td className="py-3.5 px-4 text-center text-emerald-700 dark:text-emerald-400 font-extrabold">
                  ✓ Liberado Ilimitado
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                  Economia no Investimento Anual
                </td>
                <td className="py-3.5 px-4 text-center text-slate-400">Sem desconto</td>
                <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                  R$ 240,00 economizados no ano
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                  Suporte ao Especialista
                </td>
                <td className="py-3.5 px-4 text-center text-slate-500">Padrão</td>
                <td className="py-3.5 px-4 text-center font-bold text-teal-700 dark:text-teal-400">Suporte VIP Prioritário</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. PERGUNTAS FREQUENTES (FAQ) */}
      <div className="space-y-4 pt-4">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <div className="inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Perguntas Frequentes
          </h3>
          <p className="text-xs text-slate-400">
            Transparência e segurança total para sua rotina clínica.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3 pt-2">
          {faqs.map((faq, index) => {
            const aberta = faqAberta === index;
            return (
              <div 
                key={index}
                className="glass-card rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                >
                  <span>{faq.pergunta}</span>
                  <div className={`w-6 h-6 rounded-full glass-button flex items-center justify-center shrink-0 transition-transform ${aberta ? 'rotate-90 text-teal-700' : 'text-slate-400'}`}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
                {aberta && (
                  <div className="px-5 pb-5 pt-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/40 dark:border-white/[0.04] mt-2 pt-3 animate-fadeIn">
                    {faq.resposta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. MODAL DE CHECKOUT INTEGRADO */}
      {planoSelecionadoCheckout && (
        <CheckoutModal
          plano={planoSelecionadoCheckout}
          cicloInicial={cicloCheckout}
          onClose={() => setPlanoSelecionadoCheckout(null)}
          onSucesso={handleSucessoAssinatura}
        />
      )}

      {/* 8. MODAL DE CONFIGURAÇÃO STRIPE */}
      <ModalConfigurarStripe
        isOpen={modalStripeAberto}
        onClose={() => setModalStripeAberto(false)}
        onAbrirCheckoutTeste={() => handleAbrirCheckout(planoAnual)}
      />
    </div>
  );
};
