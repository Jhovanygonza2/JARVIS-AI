import os
import datetime
import pyttsx3
import speech_recognition as sr
import webbrowser
import wikipedia
import pywhatkit
import random
import json
from gtts import gTTS
from playsound import playsound
from cryptography.fernet import Fernet
import requests
import tkinter as tk

# ======================================================
# CONFIGURACIÓN GENERAL
# ======================================================
VOICE_ENGINE = "gtts"
engine = pyttsx3.init()
voices = engine.getProperty("voices")
engine.setProperty("voice", voices[0].id)
engine.setProperty("rate", 165)
engine.setProperty("volume", 1)

# ======================================================
# RESPUESTAS HUMANAS ESTILO ALEXA
# ======================================================
SALUDOS = [
 "Hola, ¿cómo puedo ayudarte hoy?",
 "Hola, aquí estoy lista para ayudarte.",
 "¿Qué tal? ¿En qué puedo apoyarte ahora?"
]
CONFIRMACIONES = [
 "Claro, dame un momento.",
 "Enseguida lo hago.",
 "Perfecto, ahora mismo.",
 "Con gusto."
]
ABRIR_APP_RESP = [
 "Muy bien, abriendo {app}.",
 "Perfecto, aquí tienes {app}.",
 "Listo, ya estoy abriendo {app}."
]
DESPEDIDAS = [
 "De acuerdo, estaré aquí si me necesitas.",
 "Hasta luego, cuídate mucho.",
 "Nos vemos pronto."
]
FALLOS = [
 "Mmm… eso no lo entendí muy bien.",
 "Lo siento, ¿podrías repetirlo?",
 "Creo que no escuché eso, ¿me lo dices otra vez?"
]

# ======================================================
# ARCHIVOS Y DATOS
# ======================================================
AGENDA_FILE = "agenda.json"
if os.path.exists(AGENDA_FILE):
 with open(AGENDA_FILE, "r", encoding="utf-8") as f:
 AGENDA = json.load(f)
else:
 AGENDA = []

APP_FILE = "apps.json"
if os.path.exists(APP_FILE):
 with open(APP_FILE, "r") as f:
 APPS = json.load(f)
else:
 APPS = {}

# ======================================================
# HABLAR CON NATURALIDAD
# ======================================================
def hablar(texto):
 print(f"Asistente: {texto}")
 if VOICE_ENGINE == "pyttsx3":
 engine.say(texto)
 engine.runAndWait()
 else:
 tts = gTTS(text=texto, lang="es", slow=False)
 archivo = "voz.mp3"
 tts.save(archivo)
 playsound(archivo)
 os.remove(archivo)

# ======================================================
# RECONOCIMIENTO DE VOZ
# ======================================================
def escuchar():
 r = sr.Recognizer()
 with sr.Microphone() as source:
 print("Escuchando…")
 r.adjust_for_ambient_noise(source, duration=2) # Ajuste de ruido ambiental
 audio = r.listen(source)
 try:
 texto = r.recognize_google(audio, language="es-MX")
 print(f"Usuario: {texto}")
 return texto.lower()
 except sr.UnknownValueError:
 hablar(random.choice(FALLOS))
 return ""
 except sr.RequestError as e:
 hablar(f"Error al conectar con el servicio de reconocimiento de voz: {e}")
 return ""

# ======================================================
# ABRIR APLICACIONES
# ======================================================
def abrir_app(nombre):
 nombre = nombre.lower()
 # --- ESPECIALES ---
 # WhatsApp Web
 if "whatsapp" in nombre or "whats" in nombre:
 hablar(random.choice(CONFIRMACIONES))
 webbrowser.open("https://web.whatsapp.com/")
 hablar("Listo, abriendo WhatsApp Web.")
 return
 # Spotify Web
 if "spotify" in nombre or "música" in nombre or "musica" in nombre:
 hablar(random.choice(CONFIRMACIONES))
 webbrowser.open("https://open.spotify.com/intl-es")
 hablar("Muy bien, aquí tienes Spotify.")
 return
 # YouTube
 if "youtube" in nombre:
 hablar(random.choice(CONFIRMACIONES))
 webbrowser.open("https://www.youtube.com")
 hablar("Aquí está YouTube.")
 return
 # Google / Navegador
 if "google" in nombre or "navegador" in nombre:
 hablar("De acuerdo, abriendo Google.")
 webbrowser.open("https://www.google.com")
 return
 # --- APPS INSTALADAS ---
 for app, ruta in APPS.items():
 if app in nombre:
 hablar(random.choice(ABRIR_APP_RESP).format(app=app.capitalize()))
 os.system(f'start "" "{ruta}"')
 return
 # --- APRENDER NUEVA APP ---
 hablar(f"No conozco {nombre}. ¿Quieres enseñarme dónde está instalado?")
 ruta = input(f"Ruta del programa '{nombre}': ")
 if os.path.exists(ruta):
 APPS[nombre] = ruta
 with open(APP_FILE, "w") as f:
 json.dump(APPS, f)
 hablar(f"Perfecto, he aprendido dónde está {nombre}.")
 else:
 hablar("Esa ruta no existe.")

# ======================================================
# AGENDA Y RECORDATORIOS
# ======================================================
def guardar_agenda():
 with open(AGENDA_FILE, "w", encoding="utf-8") as f:
 json.dump(AGENDA, f, ensure_ascii=False, indent=4)

def crear_evento():
 hablar("Claro, dime qué evento quieres agregar.")
 descripcion = escuchar()
 hablar("Perfecto. ¿Para qué día es?")
 fecha = escuchar()
 hablar("¿A qué hora?")
 hora = escuchar()
 AGENDA.append({
 "descripcion": descripcion,
 "fecha": fecha,
 "hora": hora
 })
 guardar_agenda()
 hablar(f"Todo listo, agregué el evento {descripcion}.")

def mostrar_agenda():
 if not AGENDA:
 hablar("Tu agenda está vacía.")
 return
 hablar("Estos son tus eventos:")
 for i, e in enumerate(AGENDA, 1):
 hablar(f"{i}. {e['descripcion']} el {e['fecha']} a las {e['hora']}")

def eliminar_evento():
 mostrar_agenda()
 hablar("¿Cuál evento deseas eliminar? Dime el número.")
 num = escuchar()
 try:
 idx = int(num) - 1
 eliminado = AGENDA.pop(idx)
 guardar_agenda()
 hablar(f"Listo, eliminé el evento {eliminado['descripcion']}.")
 except:
 hablar("No pude eliminar ese evento.")

# ======================================================
# ASISTENTE PRINCIPAL
# ======================================================
def asistente():
 hablar(random.choice(SALUDOS))
 while True:
 comando = escuchar()
 if not comando:
 continue
 # Agenda
 if "agenda" in comando or "recordatorio" in comando:
 if "agregar" in comando or "nuevo" in comando or "crear" in comando:
 crear_evento()
 elif "mostrar" in comando or "ver" in comando or "leer" in comando:
 mostrar_agenda()
 elif "eliminar" in comando or "borrar" in comando:
 eliminar_evento()
 continue
 # Abrir apps
 if "abre" in comando or "abrir" in comando or "inicia" in comando:
 nombre = comando.replace("abre", "").replace("abrir", "").replace("inicia", "")
 abrir_app(nombre.strip())
 continue
 # Hora
 if "hora" in comando:
 hora = datetime.datetime.now().strftime("%H:%M")
 hablar(f"Son las {hora}.")
 continue
 # Buscar
 if "buscar" in comando:
 query = comando.replace("buscar", "")
 hablar("Claro, buscando eso por ti.")
 webbrowser.open(f"https://www.google.com/search?q={query}")
 continue
 # Wikipedia
 if "wikipedia" in comando:
 tema = comando.replace("wikipedia", "")
 try:
 resumen = wikipedia.summary(tema, sentences=2)
 hablar(resumen)
 except:
 hablar("Lo siento, no encontré esa información.")
 continue
 # Salir
 if "salir" in comando or "adiós" in comando or "gracias" in comando:
 hablar(random.choice(DESPEDIDAS))
 break

# ======================================================
# EJECUCIÓN
# ======================================================
def mostrar_interfaz():
 root = tk.Tk()
 root.title("Asistente Virtual")
 label = tk.Label(root, text="Asistente listo para ayudarte.")
 label.pack()
 root.mainloop()

if __name__ == "__main__":
 mostrar_interfaz()
 asistente()
