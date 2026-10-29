import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Lock, 
  KeyRound, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
  Send,
  Award,
  Crown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MeuPerfilViewProps {
  onVoltarParaPainel?: () => void;
  onNavegarParaPlanos?: () => void;
}

export const MeuPerfilView: React.FC<MeuPerfilViewProps> = ({ onVoltarParaPainel, onNavegarParaPlanos }) => {
  const { usuarioAtual, atualizarPerfil, alterarSenha, enviarEmailRedefinicao } = useAuth();

  // Estados dos campos do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [nomeDoEspaco, setNomeDoEspaco] = useState('');
  const [titulo, setTitulo] = useState('');
  const [registro, setRegistro] = useState('');

  // Estados de segurança (Alteração de senha)
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [mensagemSenha, setMensagemSenha] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Estados de salvamento de perfil
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [feedbackPerfil, setFeedbackPerfil] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Inicializar campos com os dados atuais do usuário
  useEffect(() => {
    if (usuarioAtual) {
      setNome(usuarioAtual.nome || '');
      setEmail(usuarioAtual.email || '');
      setTelefone(usuarioAtual.telefone || '');
      setEndereco(usuarioAtual.endereco || '');
      setNomeDoEspaco(usuarioAtual.nomeDoEspaco || usuarioAtual.clinica || '');
      setTitulo(usuarioAtual.titulo || '');
      setRegistro(usuarioAtual.registro || '');
    }
  }, [usuarioAtual]);

  // Salvar dados do perfil
  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setFeedbackPerfil({ tipo: 'erro', texto: 'O nome é obrigatório.' });
      return;
    }

    setSalvandoPerfil(true);
    setFeedbackPerfil(null);

    try {
      await atualizarPerfil({
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
        nomeDoEspaco: nomeDoEspaco.trim(),
        clinica: nomeDoEspaco.trim(), // Sincronizado para manter compatibilidade em laudos
        titulo: titulo.trim(),
        registro: registro.trim()
      });

      setFeedbackPerfil({ 
        tipo: 'sucesso', 
        texto: 'Dados de perfil, espaço e contato salvos com sucesso no sistema!' 
      });

      setTimeout(() => {
        setFeedbackPerfil(null);
      }, 4000);
    } catch (err) {
      setFeedbackPerfil({ 
        tipo: 'erro', 
        texto: 'Ocorreu um erro ao salvar as informações no sistema. Tente novamente.' 
      });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  // Alterar senha
  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemSenha(null);

    if (!novaSenha) {
      setMensagemSenha({ tipo: 'erro', texto: 'Informe a nova senha.' });
      return;
    }

    if (novaSenha.length < 6) {
      setMensagemSenha({ tipo: 'erro', texto: 'A nova senha deve possuir no mínimo 6 caracteres.' });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagemSenha({ tipo: 'erro', texto: 'As senhas informadas não coincidem.' });
      return;
    }

    setSalvandoSenha(true);
    try {
      const res = await alterarSenha(novaSenha);
      if (res.sucesso) {
        setMensagemSenha({ tipo: 'sucesso', texto: res.mensagem });
        setNovaSenha('');
        setConfirmarSenha('');
      } else {
        setMensagemSenha({ tipo: 'erro', texto: res.mensagem });
      }
    } catch {
      setMensagemSenha({ tipo: 'erro', texto: 'Erro inesperado ao alterar senha.' });
    } finally {
      setSalvandoSenha(false);
    }
  };

  // Enviar link de redefinição para o e-mail
  const handleEnviarEmailRedefinicao = async () => {
    if (!email) {
      setMensagemSenha({ tipo: 'erro', texto: 'E-mail não identificado para envio.' });
      return;
    }
    setSalvandoSenha(true);
    try {
      const res = await enviarEmailRedefinicao(email);
      setMensagemSenha({ tipo: res.sucesso ? 'sucesso' : 'erro', texto: res.mensagem });
    } catch {
      setMensagemSenha({ tipo: 'erro', texto: 'Falha ao solicitar envio de e-mail.' });
    } finally {
      setSalvandoSenha(false);
    }
  };

  if (!usuarioAtual) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="glass-card p-8 inline-block max-w-md">
          <User className="w-12 h-12 text-teal-700 dark:text-teal-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Perfil Indisponível</h2>
          <p className="text-xs text-slate-500 mt-1">Conecte-se como especialista para visualizar e editar seu perfil.</p>
        </div>
      </div>
    );
  }

  const iniciais = (nome || usuarioAtual.nome || 'Especialista')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn pb-24">
      {/* 1. TOPO: TÍTULO, SUBTÍTULO E BOTÃO VOLTAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {onVoltarParaPainel && (
              <button
                onClick={onVoltarParaPainel}
                className="glass-button p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                title="Voltar ao Painel"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Meu Perfil
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gerencie seus dados de contato, endereço do espaço clínico e credenciais de segurança.
              </p>
            </div>
          </div>
        </div>

        {/* Status de Sincronização */}
        <div className="flex items-center gap-2">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Sistema Conectado
            </span>
          </div>
        </div>
      </div>

      {/* FEEDBACK DE SALVAMENTO DE PERFIL */}
      {feedbackPerfil && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-fadeIn ${
          feedbackPerfil.tipo === 'sucesso'
            ? 'glass-card border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'glass-card border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
        }`}>
          {feedbackPerfil.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span>{feedbackPerfil.texto}</span>
        </div>
      )}

      {/* 2. CARD RESUMO DO PROFISSIONAL & ESPAÇO */}
      <div className="glass-card p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar com Gradiente e Iniciais */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white font-bold text-2xl flex items-center justify-center shadow-lg shrink-0 ring-4 ring-white/20 dark:ring-white/[0.05]">
          {iniciais}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {nome || 'Especialista'}
            </h2>
            {registro && (
              <span className="px-2 py-0.5 rounded-md glass-card text-[11px] font-mono font-medium text-teal-700 dark:text-teal-300">
                {registro}
              </span>
            )}
          </div>

          <p className="text-xs text-teal-700 dark:text-teal-300 font-semibold flex items-center justify-center sm:justify-start gap-1">
            <Award className="w-3.5 h-3.5" />
            <span>{titulo || 'Especialista em Tricoscopia & Saúde Capilar'}</span>
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{nomeDoEspaco || 'Espaço Clínico não informado'}</span>
            {endereco && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="truncate max-w-xs">{endereco}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================================================= */}
        {/* COLUNA ESQUERDA: DADOS PESSOAIS, CONTATO E ESPAÇO (2 COLUNAS NO DESKTOP) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSalvarPerfil} className="glass-card p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-teal-700 dark:text-teal-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Dados Pessoais & do Espaço Clínico
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Informações utilizadas nos prontuários, cabeçalhos de exames e laudos tricoscópicos.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Campo: Nome Completo */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                  <span>Nome Completo *</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Dra. Damiana Calazans ou Dr. Keven Lucas"
                  required
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Campo: E-mail */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                  <span>E-mail de Contato & Acesso</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@clinica.com"
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Campo: Telefone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Telefone / WhatsApp</span>
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Campo: Nome do Espaço / Clínica */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                  <span>Nome do Espaço / Clínica / Studio</span>
                </label>
                <input
                  type="text"
                  value={nomeDoEspaco}
                  onChange={(e) => setNomeDoEspaco(e.target.value)}
                  placeholder="Ex: Instituto Damiana Calazans de Tricologia & Terapia Capilar"
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Campo: Endereço do Espaço */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Endereço do Espaço Clínico</span>
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000 - Conjunto 102 - Bela Vista, São Paulo - SP"
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Campo: Título Profissional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Título Profissional</span>
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Tricologista & Terapeuta Capilar"
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Campo: Registro Profissional */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Registro Profissional (CRM / CRBM / ABT)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Opcional</span>
                </div>
                <input
                  type="text"
                  value={registro}
                  onChange={(e) => setRegistro(e.target.value)}
                  placeholder="Ex: ABT 4821 ou CRM 184920 (Deixe em branco se não possuir)"
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Botão de Salvar Alterações */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.08] flex items-center justify-end">
              <button
                type="submit"
                disabled={salvandoPerfil}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-teal-700/25 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{salvandoPerfil ? 'Salvando no Sistema...' : 'Salvar Informações no Sistema'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* COLUNA DIREITA: ASSINATURA & SEGURANÇA */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          {/* Card de Gestão de Assinatura & Plano Ativo */}
          <div className="glass-card p-5 sm:p-6 space-y-4 border border-teal-500/30 bg-teal-500/[0.02]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-amber-500">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Plano & Assinatura
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Nível de acesso e recursos liberados.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 text-[10px] font-bold uppercase tracking-wider">
                {usuarioAtual?.planoId === 'mensal' ? 'MENSAL' : 'ANUAL'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Plano Atual:</span>
                <strong className="text-slate-900 dark:text-white font-bold">
                  {usuarioAtual?.planoId === 'mensal' ? 'Plano Mensal (R$ 69,90/mês)' : 'Plano Anual (R$ 49,90/mês)'}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Status:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {usuarioAtual?.planoStatus === 'trial' ? 'Período Degustação' : 'Assinatura Ativa'}
                </span>
              </div>
              {usuarioAtual?.planoValidade && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Renovação:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {new Date(usuarioAtual.planoValidade).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            {onNavegarParaPlanos && (
              <button
                type="button"
                onClick={onNavegarParaPlanos}
                className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01]"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Gerenciar ou Alterar Plano</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <form onSubmit={handleAlterarSenha} className="glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-white/[0.08]">
              <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center text-amber-500">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Alterar Senha de Acesso
                </h3>
                <p className="text-[11px] text-slate-400">
                  Atualize sua senha de segurança do sistema.
                </p>
              </div>
            </div>

            {/* Mensagem de Feedback da Senha */}
            {mensagemSenha && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                mensagemSenha.tipo === 'sucesso'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}>
                {mensagemSenha.tipo === 'sucesso' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{mensagemSenha.texto}</span>
              </div>
            )}

            {/* Campo: Nova Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Nova Senha</span>
                <span className="text-[10px] text-slate-400 font-normal">Mínimo 6 dígitos</span>
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="w-full glass-input px-3.5 py-2.5 pr-10 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                >
                  {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Campo: Confirmar Nova Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirmar Nova Senha
              </label>
              <input
                type={mostrarSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full glass-input px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Botão de Alterar Senha */}
            <button
              type="submit"
              disabled={salvandoSenha || !novaSenha}
              className="w-full py-2.5 rounded-xl glass-button text-xs font-bold text-slate-800 dark:text-white hover:border-teal-500/50 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            >
              <KeyRound className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>{salvandoSenha ? 'Alterando Senha...' : 'Confirmar e Alterar Senha'}</span>
            </button>

            {/* Opção de Envio por E-mail */}
            {email && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.08] text-center">
                <button
                  type="button"
                  onClick={handleEnviarEmailRedefinicao}
                  disabled={salvandoSenha}
                  className="text-[11px] text-teal-700 dark:text-teal-300 hover:underline flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Send className="w-3 h-3" />
                  <span>Enviar link de redefinição para {email}</span>
                </button>
              </div>
            )}
          </form>

          {/* Dica de Segurança */}
          <div className="glass-card p-4 space-y-2 border-teal-500/20 bg-teal-500/[0.03]">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Segurança da Conta</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Os dados e relatórios da sua clínica são protegidos com criptografia. Nunca compartilhe suas credenciais com terceiros.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
