import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

print("Modelos disponibles para tu llave - test_models.py:8")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"ID del modelo: {m.name} - test_models.py:12")
except Exception as e:
    print(f"Error al listar: {e} - test_models.py:14")