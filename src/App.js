import React, { useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Orb3D from "./Orb3D";
import "./App.css";

// ⚠️ Clave de YouTube Data API v3 (ahora desde .env)
const YT_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

function App() {
  const historialRef   = useRef(null);
  const animFrameRef   = useRef(null);
  const clockRef       = useRef(null);
  const silenceTimer   = useRef(null);   // timeout de silencio tipo Alexa
  const lastTranscript = useRef("");

  const { transcript, resetTranscript, listening } = useSpeechRecognition();

  const [historial,   setHistorial]   = useState([]);
  const [cargando,    setCargando]    = useState(false);
  const [estado,      setEstado]      = useState("INICIANDO...");
  const [resultados,  setResultados]  = useState([]);
  const [videoActivo, setVideoActivo] = useState(null);
  const [panelYT,     setPanelYT]     = useState(false);
  const [horaActual,  setHoraActual]  = useState("");
  const [fechaActual, setFechaActual] = useState("");
  const [bootDone,    setBootDone]    = useState(false);
  const analyserRef = useRef(null);

  /* ============================= */
  /* CLOCK                         */
  /* ============================= */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setHoraActual(now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setFechaActual(now.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase());
    };
    tick();
    clockRef.current = setInterval(tick, 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  /* ============================= */
  /* VOZ                           */
  /* ============================= */
  const hablar = React.useCallback((texto) => {
    window.speechSynthesis.cancel();
    const s = new SpeechSynthesisUtterance(texto);
    s.lang  = "es-MX";
    s.rate  = 0.9;
    s.pitch = 1.1;
    window.speechSynthesis.speak(s);
  }, []);

  /* ============================= */
  /* ESFERA HOLOGRÁFICA            */
  /* ============================= */
  function iniciarEsfera() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const actx    = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = actx.createAnalyser();
        actx.createMediaStreamSource(stream).connect(analyser);
        analyser.fftSize = 256;
        analyserRef.current = analyser;
      })
      .catch((err) => {
        console.error("Error al acceder al micrófono:", err);
      });
  }

  /* ============================= */
  /* YOUTUBE: BUSCAR               */
  /* ============================= */
  const responder = React.useCallback((texto) => {
    setHistorial((prev) => [...prev, { usuario: "", jarvis: texto }]);
    hablar(texto);
  }, [hablar]);

  const buscarYouTube = React.useCallback(async (query) => {
    setCargando(true);
    setEstado("BUSCANDO...");
    try {
      const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&type=video&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;
      const res  = await fetch(url);
      const json = await res.json();

      if (!json.items || json.items.length === 0) {
        responder("No encontré resultados para " + query);
        setCargando(false);
        setEstado("EN ESPERA");
        return;
      }

      const videos = json.items.map((item) => ({
        id:        item.id.videoId,
        titulo:    item.snippet.title,
        canal:     item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
      }));

      setResultados(videos);
      setPanelYT(true);
      setVideoActivo(null);
      responder(`Encontré ${videos.length} videos. ¿Cuál quieres ver?`);
    } catch {
      responder("Error al buscar en YouTube. Verifica tu API key.");
    }
    setCargando(false);
    setEstado("EN ESPERA");
  }, [responder]);

  /* ============================= */
  /* YOUTUBE: REPRODUCIR           */
  /* ============================= */
  const reproducirVideo = React.useCallback((video) => {
    setVideoActivo(video);
    setResultados([]);
    hablar("Reproduciendo " + video.titulo);
    setHistorial((prev) => [
      ...prev,
      { usuario: "▶ " + video.titulo, jarvis: "Reproduciendo ahora." },
    ]);
  }, [hablar]);

  const cerrarVideo = React.useCallback(() => {
    setVideoActivo(null);
    setPanelYT(false);
    setResultados([]);
    hablar("Video cerrado.");
  }, [hablar]);

  const conversar = React.useCallback((texto) => {
    if (texto.includes("como estas") || texto.includes("cómo estás"))
      return "Todos los sistemas operando al máximo rendimiento.";
    if (texto.includes("quien eres") || texto.includes("quién eres"))
      return "Soy Jarvis, tu asistente virtual inteligente.";
    if (texto.includes("que puedes hacer") || texto.includes("qué puedes hacer"))
      return "Puedo buscar y reproducir videos de YouTube, abrir apps, decirte la hora y conversar contigo.";
    if (texto.includes("gracias"))
      return "Con gusto. Para eso estoy aquí.";
    if (texto.includes("buenos dias") || texto.includes("buenos días"))
      return "Buenos días. Todos los sistemas en línea.";
    if (texto.includes("buenas tardes"))
      return "Buenas tardes. Listo para recibir instrucciones.";
    if (texto.includes("buenas noches"))
      return "Buenas noches. Iniciando modo de bajo consumo.";
    if (texto.includes("hola"))
      return "Hola. ¿En qué puedo ayudarte?";
    if (texto.includes("adiós") || texto.includes("adios") || texto.includes("hasta luego"))
      return "Hasta luego. Sistemas en espera.";
    if (texto.includes("chiste") || texto.includes("broma"))
      return "¿Por qué los robots nunca mienten? Porque no tienen memoria para sus mentiras.";
    if (texto.includes("clima") || texto.includes("tiempo"))
      return "No tengo datos meteorológicos. Te recomiendo buscar el clima en Google.";
    if (texto.includes("nombre"))
      return "Mi nombre es Jarvis. Sistema de asistencia virtual de próxima generación.";
    return "Entendido. ¿Hay algo más en lo que pueda asistirte?";
  }, []);

  /* ============================= */
  /* COMANDOS DE VOZ               */
  /* ============================= */
  const procesarComando = React.useCallback(async (comando) => {
    setCargando(true);
    setEstado("PROCESANDO...");

    if (
      comando.includes("video de") ||
      comando.includes("busca en youtube") ||
      comando.includes("pon música de") ||
      comando.includes("reproduce")
    ) {
      const q = comando
        .replace("video de", "")
        .replace("busca en youtube", "")
        .replace("pon música de", "")
        .replace("reproduce", "")
        .trim();
      await buscarYouTube(q || "música");
      return;
    }

    if (resultados.length > 0) {
      const nums = ["primero", "segundo", "tercero", "cuarto", "quinto"];
      const idx  = nums.findIndex((n) => comando.includes(n));
      if (idx !== -1 && resultados[idx]) {
        reproducirVideo(resultados[idx]);
        setCargando(false);
        setEstado("EN ESPERA");
        return;
      }
    }

    if (
      comando.includes("cerrar video") ||
      comando.includes("detener video") ||
      comando.includes("parar video") ||
      comando.includes("cierra el video")
    ) {
      cerrarVideo();
      setCargando(false);
      setEstado("EN ESPERA");
      return;
    }

    let respuesta = "";
    if (comando.includes("hora")) {
      respuesta = "Son las " + new Date().toLocaleTimeString("es-MX");
    } else if (comando.includes("fecha")) {
      respuesta = "Hoy es " + new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } else if (comando.includes("youtube")) {
      window.open("https://youtube.com", "_blank");
      respuesta = "Abriendo YouTube.";
    } else if (comando.includes("spotify")) {
      const q = comando.replace("spotify", "").trim();
      window.open(`https://open.spotify.com/search/${encodeURIComponent(q)}`, "_blank");
      respuesta = q ? `Buscando ${q} en Spotify.` : "Abriendo Spotify.";
    } else if (comando.includes("buscar")) {
      const q = comando.replace("buscar", "").trim();
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
      respuesta = `Buscando ${q} en Google.`;
    } else if (comando.includes("gmail") || comando.includes("correo")) {
      window.open("https://mail.google.com", "_blank");
      respuesta = "Abriendo Gmail.";
    } else if (comando.includes("drive")) {
      window.open("https://drive.google.com", "_blank");
      respuesta = "Abriendo Google Drive.";
    } else if (comando.includes("whatsapp")) {
      window.open("https://web.whatsapp.com", "_blank");
      respuesta = "Abriendo WhatsApp Web.";
    } else if (comando.includes("mapas")) {
      window.open("https://maps.google.com", "_blank");
      respuesta = "Abriendo Google Maps.";
    } else if (comando.includes("calculadora")) {
      window.open("https://www.google.com/search?q=calculadora", "_blank");
      respuesta = "Calculadora activada.";
    } else if (comando.includes("traductor")) {
      window.open("https://translate.google.com", "_blank");
      respuesta = "Traductor activado.";
    } else {
      respuesta = conversar(comando);
    }

    setHistorial((prev) => [...prev, { usuario: comando, jarvis: respuesta }]);
    hablar(respuesta);
    setCargando(false);
    setEstado("EN ESPERA");
  }, [buscarYouTube, cerrarVideo, conversar, hablar, reproducirVideo, resultados]);


  /* ============================= */
  /* EFECTOS                       */
  /* ============================= */
  // Comportamiento tipo Alexa: procesa cuando el usuario deja de hablar (~1.5s de silencio)
  useEffect(() => {
    if (transcript === "" || transcript === lastTranscript.current) return;
    lastTranscript.current = transcript;

    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    silenceTimer.current = setTimeout(() => {
      const cmd = transcript.trim();
      if (cmd !== "") {
        procesarComando(cmd.toLowerCase());
        resetTranscript();
        lastTranscript.current = "";
      }
    }, 1500);
  }, [transcript, procesarComando, resetTranscript]);

  useEffect(() => {
    if (historialRef.current)
      historialRef.current.scrollTop = historialRef.current.scrollHeight;
  }, [historial]);

  useEffect(() => {
    iniciarEsfera();
    SpeechRecognition.startListening({ continuous: true, language: "es-MX", interimResults: true });
    
    const welcomeTimeout = setTimeout(() => {
      hablar("Sistema Jarvis activado. Listo para recibir instrucciones.");
      setEstado("EN ESPERA");
      setBootDone(true);
    }, 1000);

    return () => {
      clearTimeout(welcomeTimeout);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [hablar]);

  /* ============================= */
  /* STATUS CONFIG                 */
  /* ============================= */
  const statusMode = cargando ? "proc" : listening ? "live" : "idle";
  const statusLabels = { proc: "PROCESANDO", live: "ESCUCHANDO", idle: estado };

  /* ============================= */
  /* RENDER                        */
  /* ============================= */
  return (
    <div className={`root ${bootDone ? "booted" : ""}`}>

      {/* ── Fondo decorativo ── */}
      <div className="bg-hex" aria-hidden="true" />
      <div className="bg-vignette" aria-hidden="true" />

      {/* ══════════════════════════════════
          SIDEBAR IZQUIERDO
      ══════════════════════════════════ */}
      <aside className="sidebar-left">
        <div className="sbl-logo">
          <span className="sbl-logo-letter">J</span>
          <span className="sbl-logo-dot" />
        </div>
        <div className="sbl-divider" />
        <div className="sbl-clock">
          <span className="sbl-time">{horaActual}</span>
          <span className="sbl-date">{fechaActual}</span>
        </div>
        <div className="sbl-divider" />
        <div className="sbl-indicators">
          <div className="sbl-ind">
            <span className={`sbl-led ${statusMode === "live" ? "green" : "dim"}`} />
            <span>MIC</span>
          </div>
          <div className="sbl-ind">
            <span className={`sbl-led ${statusMode === "proc" ? "amber" : "dim"}`} />
            <span>PROC</span>
          </div>
          <div className="sbl-ind">
            <span className={`sbl-led ${panelYT ? "cyan" : "dim"}`} />
            <span>YT</span>
          </div>
        </div>
        <div className="sbl-divider" />
        <div className="sbl-version">v3.0</div>
      </aside>

      {/* ══════════════════════════════════
          COLUMNA CENTRAL
      ══════════════════════════════════ */}
      <main className="col-center">

        {/* — Titulo — */}
        <header className="hud-header">
          <div className="hud-corner tl" />
          <div className="hud-corner tr" />
          <h1 className="hud-title">J·A·R·V·I·S</h1>
          <p className="hud-sub">JUST A RATHER VERY INTELLIGENT SYSTEM</p>
          <div className="hud-corner bl" />
          <div className="hud-corner br" />
        </header>

        {/* — Status pill — */}
        <div className={`status-pill st-${statusMode}`}>
          <span className="st-ring" />
          <span className="st-label">{statusLabels[statusMode]}</span>
        </div>

        {/* — Esfera — */}
        <div className="orb-wrap">
          <Orb3D 
            analyser={analyserRef.current} 
            listening={statusMode === "live"} 
            processing={statusMode === "proc"} 
          />
          {transcript && (
            <div className="orb-transcript">
              <span className="orb-cursor">▌</span>{transcript}
            </div>
          )}
        </div>

        {/* — Historial — */}
        <div className="log-panel" ref={historialRef}>
          <div className="log-header">
            <span className="log-title">REGISTRO DE COMANDOS</span>
            <span className="log-count">{historial.length} ENTRADAS</span>
          </div>
          <div className="log-body">
            {historial.length === 0 && (
              <p className="log-empty">
                Sistema listo · Di <em>"video de..."</em> para buscar en YouTube
              </p>
            )}
            {historial.map((item, i) => (
              <div key={i} className="log-entry">
                {item.usuario && (
                  <div className="log-user">
                    <span className="log-tag user-tag">TÚ</span>
                    <span className="log-text">{item.usuario}</span>
                  </div>
                )}
                <div className="log-ai">
                  <span className="log-tag ai-tag">JARVIS</span>
                  <span className="log-text ai-text">{item.jarvis}</span>
                </div>
              </div>
            ))}
            {cargando && (
              <div className="log-ai">
                <span className="log-tag ai-tag">JARVIS</span>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* ══════════════════════════════════
          SIDEBAR DERECHO / PANEL YT
      ══════════════════════════════════ */}
      <aside className={`sidebar-right ${panelYT ? "open" : ""}`}>
        {panelYT ? (
          <div className="yt-dock">
            <div className="yt-dock-header">
              <span className="yt-dock-label">YOUTUBE</span>
              <button className="yt-x" onClick={cerrarVideo}>✕</button>
            </div>

            {videoActivo && (
              <div className="yt-embed-wrap">
                <div className="yt-embed-title">{videoActivo.titulo}</div>
                <iframe
                  width="100%"
                  height="200"
                  src={`https://www.youtube.com/embed/${videoActivo.id}?autoplay=1`}
                  title={videoActivo.titulo}
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            )}

            {resultados.length > 0 && (
              <div className="yt-list">
                {resultados.map((v, i) => (
                  <div key={v.id} className="yt-row" onClick={() => reproducirVideo(v)}>
                    <span className="yt-idx">0{i + 1}</span>
                    <img src={v.thumbnail} alt={v.titulo} className="yt-thumb" />
                    <div className="yt-meta">
                      <p className="yt-vtitle">{v.titulo}</p>
                      <p className="yt-channel">{v.canal}</p>
                    </div>
                  </div>
                ))}
                <p className="yt-voice-hint">Di <b>"pon el primero"</b>, <b>"el segundo"</b>…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="sbr-idle">
            <div className="sbr-commands">
              <p className="sbr-cmd-title">COMANDOS</p>
              {[
                ["video de...",    "Buscar en YouTube"],
                ["hora / fecha",   "Consultar tiempo"],
                ["buscar...",      "Google Search"],
                ["spotify...",     "Abrir Spotify"],
                ["gmail / drive",  "Google Apps"],
                ["whatsapp",       "WhatsApp Web"],
                ["mapas",          "Google Maps"],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="sbr-cmd-row">
                  <span className="sbr-cmd-key">{cmd}</span>
                  <span className="sbr-cmd-desc">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

    </div>
  );
}

export default App;