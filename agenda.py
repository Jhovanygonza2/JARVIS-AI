import os
import datetime
import pyttsx3
import speech_recognition as sr
import webbrowser
import wikipedia
import pywhatkit
import random
import json
import requests
from gtts import gTTS
from playsound import playsound

# ===================== CONFIG =====================
VOICE_ENGINE = "gtts"  # "pyttsx3" o "gtts"
engine = pyttsx3.init()
voices = engine.getProperty("voices")
engine.setProperty("voice", voices[0].id)
engine.setProperty("rate", 170)
engine.setProperty("volume", 1)

API_KEY = "TU_API_KEY"
CIUDAD_POR_DEFECTO = "Ciudad de México"

# Archivo de citas
CITAS_FILE = "citas_barberia.json"

# Cargar citas guardadas
if os.path.exists(CITAS_FILE):
    with open(CITAS_FILE, "r", encoding="utf-8") as f:
        CITAS = json.load(f)
else:
    CITAS = {}

# ===================== FUNCIONES DE VOZ =====================
def hablar(texto):
    print(f"Asistente: {texto}")
    if VOICE_ENGINE == "pyttsx3":
        engine.say(texto)
        engine.runAndWait()
    else:
        try:
            tts = gTTS(text=texto, lang="es", slow=False)
            archivo = "voz_google.mp3"
            tts.save(archivo)
            playsound(archivo)
            os.remove(archivo)
        except:
            pass

def escuchar():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("🎤 Escuchando...")
        r.adjust_for_ambient_noise(source)
        audio = r.listen(source)

    try:
        comando = r.recognize_google(audio, language="es-MX")
        print(f"Usuario: {comando}")
        return comando.lower()
    except:
        return ""

# ===================== GUARDAR CITAS =====================
def guardar_citas():
    with open(CITAS_FILE, "w", encoding="utf-8") as f:
        json.dump(CITAS, f, indent=4, ensure_ascii=False)

# ===================== CREAR CITA =====================
def crear_cita():
    hablar("¿Cuál es el nombre del cliente?")
    cliente = escuchar()
    if not cliente:
        hablar("No entendí el nombre.")
        return

    hablar("¿Para qué fecha es la cita? Ejemplo: 15 de febrero del 2025.")
    fecha = escuchar()

    # Interpretar fecha
    try:
        fecha_obj = datetime.datetime.strptime(fecha, "%d de %B del %Y")
        fecha_str = fecha_obj.strftime("%Y-%m-%d")
    except:
        hablar("No entendí la fecha, repítela por favor.")
        return

    hablar("¿A qué hora será la cita? Dímelo en formato de 24 horas. Ejemplo: quince treinta.")
    hora = escuchar()

    # Interpretar hora
    try:
        hora_obj = datetime.datetime.strptime(hora, "%H:%M")
        hora_str = hora_obj.strftime("%H:%M")
    except:
        try:
            hora_obj = datetime.datetime.strptime(hora, "%H %M")
            hora_str = hora_obj.strftime("%H:%M")
        except:
            hablar("No entendí la hora.")
            return

    if fecha_str not in CITAS:
        CITAS[fecha_str] = []

    # Guardar cita
    CITAS[fecha_str].append({
        "cliente": cliente,
        "hora": hora_str
    })

    guardar_citas()
    hablar(f"Cita agendada para {cliente} el día {fecha} a las {hora_str}.")

# ===================== VER CITAS HOY =====================
def citas_hoy():
    hoy = datetime.date.today().strftime("%Y-%m-%d")

    if hoy not in CITAS or len(CITAS[hoy]) == 0:
        hablar("No tienes citas programadas para hoy.")
        return

    hablar("Estas son tus citas de hoy:")
    for c in sorted(CITAS[hoy], key=lambda x: x["hora"]):
        hablar(f"{c['cliente']} a las {c['hora']}")

# ===================== VER CITAS DE OTRA FECHA =====================
def citas_por_fecha():
    hablar("¿Qué fecha deseas consultar?")
    fecha = escuchar()

    try:
        fecha_obj = datetime.datetime.strptime(fecha, "%d de %B del %Y")
        fecha_str = fecha_obj.strftime("%Y-%m-%d")
    except:
        hablar("No entendí la fecha.")
        return

    if fecha_str not in CITAS or len(CITAS[fecha_str]) == 0:
        hablar("No tienes citas ese día.")
        return

    hablar(f"Citas para el día {fecha}:")
    for c in sorted(CITAS[fecha_str], key=lambda x: x["hora"]):
        hablar(f"{c['cliente']} a las {c['hora']}")

# ===================== CANCELAR CITA =====================
def cancelar_cita():
    hablar("¿Para qué fecha deseas cancelar una cita?")
    fecha = escuchar()

    try:
        fecha_obj = datetime.datetime.strptime(fecha, "%d de %B del %Y")
        fecha_str = fecha_obj.strftime("%Y-%m-%d")
    except:
        hablar("No entendí la fecha.")
        return

    if fecha_str not in CITAS or len(CITAS[fecha_str]) == 0:
        hablar("No hay citas ese día.")
        return

    hablar("Dime el nombre del cliente cuya cita deseas cancelar.")
    cliente = escuchar()

    nuevas = [c for c in CITAS[fecha_str] if c["cliente"] != cliente]

    if len(nuevas) == len(CITAS[fecha_str]):
        hablar("No encontré una cita para ese cliente.")
        return

    CITAS[fecha_str] = nuevas
    guardar_citas()
    hablar(f"La cita de {cliente} ha sido cancelada.")

# ===================== FUNCIONES DE CLIMA =====================
def obtener_clima(ciudad):
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={ciudad}&appid={API_KEY}&units=metric&lang=es"
        datos = requests.get(url).json()

        if datos["cod"] != 200:
            return "No pude obtener el clima."

        clima = datos["weather"][0]["description"]
        temp = datos["main"]["temp"]
        return f"El clima en {ciudad} es {clima} con {temp} grados."
    except:
        return "Error consultando el clima."

# ===================== ASISTENTE PRINCIPAL =====================
def asistente():
    hablar("Bienvenido a la Barbería. ¿Qué deseas hacer?")

    while True:
        comando = escuchar()

        if not comando:
            continue

        # ---- CITAS ----
        if "crear cita" in comando or "agendar cita" in comando:
            crear_cita()

        elif "ver citas de hoy" in comando or "citas hoy" in comando:
            citas_hoy()

        elif "ver citas" in comando or "mostrar citas" in comando:
            citas_por_fecha()

        elif "cancelar cita" in comando:
            cancelar_cita()

        # ---- CLIMA ----
        elif "clima" in comando:
            hablar("¿Qué ciudad deseas consultar?")
            ciudad = escuchar()
            hablar(obtener_clima(ciudad))

        # ---- SALIR ----
        elif "salir" in comando or "adiós" in comando:
            hablar("Hasta luego, que tengas un buen día en la barbería.")
            break

# ===================== RUN =====================
if __name__ == "__main__":
    asistente()
