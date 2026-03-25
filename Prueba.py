import os
import datetime
import pyttsx3
import speech_recognition as sr
import webbrowser
import wikipedia
import random
import pywhatkit
from gtts import gTTS
import pygame
import time

# ======================================
# CONFIGURACIÓN
# ======================================

VOICE_ENGINE = "gtts"

engine = pyttsx3.init()
voices = engine.getProperty("voices")
engine.setProperty("voice", voices[0].id)
engine.setProperty("rate", 170)

wikipedia.set_lang("es")

pygame.mixer.init()

# ======================================
# RESPUESTAS
# ======================================

SALUDOS = [
    "Hola, ¿en qué puedo ayudarte?",
    "Hola, dime qué necesitas.",
    "Aquí estoy para ayudarte."
]

DESPEDIDAS = [
    "Hasta luego.",
    "Nos vemos.",
    "Que tengas un buen día."
]

# ======================================
# HABLAR
# ======================================

def hablar(texto):

    print("Asistente:", texto)

    if VOICE_ENGINE == "pyttsx3":
        engine.say(texto)
        engine.runAndWait()

    else:
        archivo = "voz.mp3"

        tts = gTTS(text=texto, lang="es")
        tts.save(archivo)

        pygame.mixer.music.load(archivo)
        pygame.mixer.music.play()

        while pygame.mixer.music.get_busy():
            time.sleep(0.1)

        pygame.mixer.music.stop()
        pygame.mixer.music.unload()

        if os.path.exists(archivo):
            os.remove(archivo)

# ======================================
# ESCUCHAR (MEJORADO)
# ======================================

def escuchar():

    r = sr.Recognizer()

    with sr.Microphone() as source:

        print("🎤 Ajustando micrófono...")

        r.energy_threshold = 300
        r.pause_threshold = 0.8
        r.dynamic_energy_threshold = True

        r.adjust_for_ambient_noise(source, duration=1)

        print("🎤 Escuchando...")

        try:
            audio = r.listen(source, timeout=5, phrase_time_limit=7)
        except:
            return ""

    try:

        texto = r.recognize_google(audio, language="es-MX")

        texto = texto.lower().strip()

        print("Usuario:", texto)

        return texto

    except sr.UnknownValueError:
        hablar("No entendí lo que dijiste.")
        return ""

    except sr.RequestError:
        hablar("Error con el servicio de reconocimiento.")
        return ""

# ======================================
# ABRIR PROGRAMAS
# ======================================

def abrir_programa(nombre):

    nombre = nombre.strip()

    if "youtube" in nombre:
        hablar("Abriendo YouTube")
        webbrowser.open("https://youtube.com")
        return

    if "google" in nombre:
        hablar("Abriendo Google")
        webbrowser.open("https://google.com")
        return

    if "spotify" in nombre:
        hablar("Abriendo Spotify")
        webbrowser.open("https://spotify.com")
        return

    if "whatsapp" in nombre:
        hablar("Abriendo WhatsApp")
        webbrowser.open("https://web.whatsapp.com")
        return

    hablar("Intentando abrir el programa")

    try:
        os.system(nombre)
    except:
        hablar("No pude abrir ese programa")

# ======================================
# WHATSAPP
# ======================================

def enviar_whatsapp():

    hablar("¿A qué número quieres enviar el mensaje?")

    numero = escuchar()

    hablar("¿Cuál es el mensaje?")

    mensaje = escuchar()

    if numero != "" and mensaje != "":
        hablar("Enviando mensaje")

        try:
            pywhatkit.sendwhatmsg_instantly(numero, mensaje)
        except:
            hablar("No pude enviar el mensaje")

# ======================================
# YOUTUBE
# ======================================

def buscar_youtube():

    hablar("¿Qué quieres buscar en YouTube?")

    busqueda = escuchar()

    if busqueda != "":
        hablar("Buscando en YouTube")
        pywhatkit.playonyt(busqueda)

# ======================================
# WIKIPEDIA
# ======================================

def buscar_wikipedia(comando):

    tema = comando.replace("wikipedia", "").strip()

    try:

        resumen = wikipedia.summary(tema, sentences=2)

        hablar(resumen)

    except:
        hablar("No encontré información")

# ======================================
# ASISTENTE
# ======================================

def asistente():

    hablar(random.choice(SALUDOS))

    while True:

        comando = escuchar()

        if comando == "":
            continue

        # limpiar palabras
        comando = comando.replace("por favor", "")
        comando = comando.replace("podrías", "")
        comando = comando.replace("quiero", "")

        # abrir apps
        if "abre" in comando or "abrir" in comando:

            nombre = comando.replace("abrir", "").replace("abre", "")
            abrir_programa(nombre)

        # hora
        elif "hora" in comando:

            hora = datetime.datetime.now().strftime("%H:%M")

            hablar(f"Son las {hora}")

        # buscar google
        elif "buscar" in comando:

            busqueda = comando.replace("buscar", "")

            hablar("Buscando en Google")

            webbrowser.open(f"https://google.com/search?q={busqueda}")

        # youtube
        elif "youtube" in comando:

            buscar_youtube()

        # wikipedia
        elif "wikipedia" in comando:

            buscar_wikipedia(comando)

        # whatsapp
        elif "mensaje" in comando or "whatsapp" in comando:

            enviar_whatsapp()

        # salir
        elif "salir" in comando or "adios" in comando:

            hablar(random.choice(DESPEDIDAS))
            break

        else:

            hablar("No tengo una respuesta para eso todavía.")

# ======================================
# EJECUTAR
# ======================================

if __name__ == "__main__":

    asistente()