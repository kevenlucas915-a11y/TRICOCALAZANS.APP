import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Video, 
  Wifi, 
  Usb, 
  RefreshCw, 
  Check, 
  RotateCw, 
  Sliders, 
  Grid, 
  Maximize2, 
  AlertCircle,
  Sparkles,
  Info,
  HelpCircle,
  Play
} from 'lucide-react';

interface TricoscopioLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturarImagem: (dataUrl: string) => void;
}

export const TricoscopioLiveModal: React.FC<TricoscopioLiveModalProps> = ({
  isOpen,
  onClose,
  onCapturarImagem
}) => {
  const [modoConexao, setModoConexao] = useState<'usb' | 'wifi'>('usb');

  // Estados USB / MediaDevices
  const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([]);
  const [deviceIdSelecionado, setDeviceIdSelecionado] = useState<string>('');
  const [resolucao, setResolucao] = useState<'1080p' | '720p' | 'max'>('1080p');
  const [gradeVisivel, setGradeVisivel] = useState<boolean>(true);
  const [carregandoCamera, setCarregandoCamera] = useState<boolean>(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);

  // Quadro congelado temporário para aprovação antes de enviar para a bancada
  const [quadroCapturado, setQuadroCapturado] = useState<string | null>(null);

  // Estados Wi-Fi (MJPEG / IP Stream)
  const [urlStreamWifi, setUrlStreamWifi] = useState<string>('http://192.168.1.1:8080/?action=stream');
  const [streamWifiAtivo, setStreamWifiAtivo] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imgWifiRef = useRef<HTMLImageElement>(null);

  // Parar qualquer stream ativo
  const pararStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Listar todas as câmeras de vídeo conectadas (USB / UVC / Internas)
  const listarDispositivos = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setErroCamera('Seu navegador não suporta acesso a câmeras de vídeo.');
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      setDispositivos(cameras);

      if (cameras.length > 0) {
        // Tentar selecionar preferencialmente câmeras com nomes de microscópio ou USB
        const tricoscopio = cameras.find(c => 
          /microscop|tricoscop|usb|dino|uvc|endoscop|camera 2|external|hd digital/i.test(c.label)
        );
        if (tricoscopio) {
          setDeviceIdSelecionado(tricoscopio.deviceId);
        } else if (!deviceIdSelecionado) {
          setDeviceIdSelecionado(cameras[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Erro ao listar câmeras:', err);
    }
  };

  // Iniciar stream da câmera selecionada
  const iniciarCamera = async (deviceIdToUse?: string) => {
    pararStream();
    setCarregandoCamera(true);
    setErroCamera(null);
    setQuadroCapturado(null);

    const targetDeviceId = deviceIdToUse || deviceIdSelecionado;

    // Resoluções recomendadas para tricoscopia
    let widthConstraint: number = 1920;
    let heightConstraint: number = 1080;

    if (resolucao === '720p') {
      widthConstraint = 1280;
      heightConstraint = 720;
    } else if (resolucao === 'max') {
      widthConstraint = 2560;
      heightConstraint = 1440;
    }

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
        width: { ideal: widthConstraint },
        height: { ideal: heightConstraint },
        frameRate: { ideal: 30 }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // Re-listar para garantir labels atualizados após permissão concedida
      await listarDispositivos();
    } catch (err: any) {
      console.warn('Erro ao acessar câmera do tricoscópio:', err);
      // Tentar fallback genérico sem constraints de resolução rígidas
      try {
        const streamFallback = await navigator.mediaDevices.getUserMedia({
          video: targetDeviceId ? { deviceId: { exact: targetDeviceId } } : true,
          audio: false
        });
        streamRef.current = streamFallback;
        if (videoRef.current) {
          videoRef.current.srcObject = streamFallback;
          await videoRef.current.play().catch(() => {});
        }
        await listarDispositivos();
      } catch (fallbackErr: any) {
        setErroCamera(
          'Não foi possível conectar à câmera. Verifique se o aparelho está plugado e se as permissões de câmera foram concedidas no navegador.'
        );
      }
    } finally {
      setCarregandoCamera(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (modoConexao === 'usb') {
        iniciarCamera();
      }
    } else {
      pararStream();
      setQuadroCapturado(null);
    }
    return () => {
      pararStream();
    };
  }, [isOpen, modoConexao, deviceIdSelecionado, resolucao]);

  // Capturar quadro estático da câmera USB
  const handleCongelarQuadroUsb = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setQuadroCapturado(dataUrl);
  };

  // Capturar quadro estático de stream Wi-Fi (MJPEG / IP)
  const handleCongelarQuadroWifi = () => {
    if (!imgWifiRef.current) return;
    try {
      const img = imgWifiRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setQuadroCapturado(dataUrl);
    } catch {
      alert('Não foi possível capturar o stream Wi-Fi diretamente devido a restrições de segurança do endereço de rede (CORS). Recomendamos utilizar a conexão por cabo USB ou o software de câmera virtual.');
    }
  };

  // Confirmar e transferir foto para a bancada
  const handleConfirmarFoto = () => {
    if (quadroCapturado) {
      onCapturarImagem(quadroCapturado);
      pararStream();
      onClose();
    }
  };

  // Atalho de teclado: barra de espaço para capturar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.code === 'Space' && !quadroCapturado) {
        e.preventDefault();
        if (modoConexao === 'usb') {
          handleCongelarQuadroUsb();
        } else if (modoConexao === 'wifi') {
          handleCongelarQuadroWifi();
        }
      } else if (e.code === 'Enter' && quadroCapturado) {
        e.preventDefault();
        handleConfirmarFoto();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, quadroCapturado, modoConexao]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex justify-center items-start p-2.5 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden text-stone-100 my-4 sm:my-8 flex flex-col">
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Câmera ao Vivo do Tricoscópio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Transmissão em Tempo Real</span>
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Visualize o couro cabeludo ao vivo e congele o quadro perfeito para análise manual.
              </p>
            </div>
          </div>

          <button
            onClick={() => { pararStream(); onClose(); }}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Tipo de Conexão (Cabo USB vs Wi-Fi) */}
        <div className="bg-stone-950/70 p-3 sm:px-6 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setModoConexao('usb'); setQuadroCapturado(null); }}
              className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                modoConexao === 'usb'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Usb className="w-3.5 h-3.5" />
              <span>Conexão por Cabo (USB / OTG)</span>
            </button>

            <button
              onClick={() => { setModoConexao('wifi'); pararStream(); setQuadroCapturado(null); }}
              className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                modoConexao === 'wifi'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Conexão Wi-Fi / Sem Fio</span>
            </button>
          </div>

          {/* Opções de Câmera USB */}
          {modoConexao === 'usb' && !quadroCapturado && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Seletor de Câmeras detectadas */}
              <div className="flex items-center gap-1.5 bg-stone-800 px-2.5 py-1 rounded-xl border border-stone-700">
                <Video className="w-3.5 h-3.5 text-rose-400" />
                <select
                  value={deviceIdSelecionado}
                  onChange={(e) => {
                    setDeviceIdSelecionado(e.target.value);
                    iniciarCamera(e.target.value);
                  }}
                  className="bg-transparent text-stone-200 text-xs focus:outline-none max-w-[180px] sm:max-w-[220px] truncate"
                >
                  {dispositivos.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId} className="bg-stone-900 text-white">
                      {d.label || `Câmera ${i + 1}`}
                    </option>
                  ))}
                  {dispositivos.length === 0 && (
                    <option value="">Buscando câmeras...</option>
                  )}
                </select>
              </div>

              {/* Botão Atualizar Lista */}
              <button
                onClick={() => iniciarCamera()}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                title="Recarregar e detectar novos aparelhos USB"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Toggle de Grade / Retículo */}
              <button
                onClick={() => setGradeVisivel(!gradeVisivel)}
                className={`p-1.5 rounded-xl border transition-colors ${
                  gradeVisivel ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-stone-800 text-stone-400 border-stone-700'
                }`}
                title="Sobrepor retículo óptico central"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Corpo Principal do Visualizador da Câmera */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-black">
          {modoConexao === 'usb' ? (
            /* CONEXÃO CABO USB */
            <div className="relative w-full max-w-3xl aspect-[4/3] rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 shadow-2xl flex items-center justify-center group">
              {erroCamera ? (
                <div className="p-6 text-center space-y-4 max-w-lg">
                  <div className="w-14 h-14 rounded-2xl bg-rose-950/90 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto shadow-md">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Permissão de Câmera Necessária</h4>
                    <p className="text-xs text-stone-300 leading-relaxed mt-1">
                      O navegador precisa da sua autorização para exibir o vídeo do tricoscópio na tela.
                    </p>
                  </div>

                  {/* Guia Rápido dos Navegadores */}
                  <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-left space-y-2.5 text-xs text-stone-300">
                    <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-rose-400" />
                      <span>Como ativar a câmera agora:</span>
                    </p>
                    <div className="space-y-2 pl-1 text-[11px] text-stone-300">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-rose-400 shrink-0">1.</span>
                        <span>Olhe para a <strong>barra de endereço</strong> no topo do seu navegador (onde fica o link do site).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-rose-400 shrink-0">2.</span>
                        <span>Clique no ícone de <strong>Cadeado / Ajustes do Site</strong> (à esquerda do link) ou no <strong>ícone de Câmera com X vermelho</strong> (à direita).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-rose-400 shrink-0">3.</span>
                        <span>No item <strong>Câmera</strong>, mude de "Bloquear" para <strong>"Permitir"</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-rose-400 shrink-0">4.</span>
                        <span>Certifique-se de que o cabo USB do aparelho está bem encaixado na porta do computador.</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-center gap-2">
                    <button
                      onClick={() => iniciarCamera()}
                      className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Já Permiti / Tentar Novamente</span>
                    </button>
                  </div>
                </div>
              ) : quadroCapturado && quadroCapturado.trim() !== '' ? (
                /* PRÉ-VISUALIZAÇÃO DO QUADRO CONGELADO */
                <div className="relative w-full h-full">
                  <img
                    src={quadroCapturado}
                    alt="Quadro congelado"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-emerald-950/90 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 shadow-lg">
                    <Check className="w-3.5 h-3.5" />
                    <span>Quadro Congelado com Sucesso</span>
                  </div>
                </div>
              ) : (
                /* VÍDEO AO VIVO DA CÂMERA */
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />

                  {/* Linhas de Retículo e Centralização Óptica */}
                  {gradeVisivel && (
                    <div className="absolute inset-0 pointer-events-none opacity-40">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-px h-[1px] bg-rose-500" />
                      <div className="absolute inset-y-0 left-1/2 -translate-x-px w-[1px] bg-rose-500" />
                      <div className="absolute inset-0 m-auto w-36 h-36 rounded-full border border-rose-500 border-dashed" />
                      <div className="absolute inset-0 m-auto w-56 h-56 rounded-full border border-rose-500/50" />
                    </div>
                  )}

                  {/* Indicador no canto da tela */}
                  <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-stone-800 text-[11px] font-mono text-stone-300 pointer-events-none">
                    <span>Transmissão USB Ativa • Pressione Espaço para capturar</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CONEXÃO WI-FI */
            <div className="w-full max-w-2xl space-y-4">
              <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-rose-300">
                  <Wifi className="w-4 h-4 text-rose-500" />
                  <span>Como conectar tricoscópios Wi-Fi / Sem Fio:</span>
                </h3>
                <div className="space-y-2 text-xs text-stone-300 leading-relaxed">
                  <p>
                    <strong>1. Conecte-se ao Wi-Fi do aparelho:</strong> Ligue o tricoscópio e vá nas configurações de Wi-Fi do seu computador/celular. Conecte-se à rede gerada por ele (ex.: <em>WiFi-Camera-XXXX</em>, <em>Skybasic-XXXX</em> ou <em>Max-See-XXXX</em>).
                  </p>
                  <p>
                    <strong>2. Endereço de Stream IP:</strong> A grande maioria dos tricoscópios transmite o vídeo via porta local padrão. Insira o endereço abaixo para carregar a transmissão:
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={urlStreamWifi}
                    onChange={(e) => setUrlStreamWifi(e.target.value)}
                    placeholder="http://192.168.1.1:8080/?action=stream"
                    className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={() => setStreamWifiAtivo(!streamWifiAtivo)}
                    className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{streamWifiAtivo ? 'Atualizar' : 'Conectar'}</span>
                  </button>
                </div>
              </div>

              {/* Feed do Stream Wi-Fi */}
              {streamWifiAtivo && urlStreamWifi && urlStreamWifi.trim() !== '' && (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 shadow-xl flex items-center justify-center">
                  <img
                    ref={imgWifiRef}
                    src={urlStreamWifi}
                    crossOrigin="anonymous"
                    alt="Stream do Tricoscópio Wi-Fi"
                    className="w-full h-full object-contain"
                    onError={() => {
                      alert('Não foi possível carregar a imagem do endereço IP informado. Verifique se você está conectado na rede Wi-Fi da câmera.');
                      setStreamWifiAtivo(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra de Ações Inferior */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>
              {quadroCapturado 
                ? 'Foto pronta para análise! Clique em "Usar Esta Captura" para abrir na bancada.' 
                : 'Posicione a lente com foco nítido e clique no botão de captura.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {quadroCapturado ? (
              <>
                <button
                  onClick={() => { setQuadroCapturado(null); if (modoConexao === 'usb') iniciarCamera(); }}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Descartar e Tirar Outra</span>
                </button>

                <button
                  onClick={handleConfirmarFoto}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Usar Esta Captura na Bancada</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { pararStream(); onClose(); }}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>

                {modoConexao === 'usb' ? (
                  <button
                    onClick={handleCongelarQuadroUsb}
                    disabled={carregandoCamera || !!erroCamera}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📸 Congelar e Capturar Quadro (Espaço)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCongelarQuadroWifi}
                    disabled={!streamWifiAtivo}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📸 Capturar Foto do Wi-Fi</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
