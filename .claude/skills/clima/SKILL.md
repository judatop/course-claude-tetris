---
name: clima
description: Consulta el clima actual y el pronóstico corto de Montevideo, Uruguay por defecto (o de una ciudad indicada). Usar cuando el usuario pregunte por el clima, temperatura, lluvia o pronóstico, p. ej. "¿qué clima hace?", "¿va a llover hoy?", "/clima Bogotá".
allowed-tools: Bash(curl:*)
---

# Clima local

Obtiene el clima sin API key mediante `wttr.in`. Responder siempre en español.

## Argumentos

- Sin argumentos: usar siempre `LUGAR=Montevideo,Uruguay`. No detectar ubicación por IP.
- Con argumento (`$ARGUMENTS`): ciudad o lugar. Reemplazar espacios por `+` (ej. `Buenos+Aires`).

## Pasos

1. Clima actual (una línea):

   ```bash
   curl -s -m 10 "https://wttr.in/${LUGAR}?format=%l:+%c+%t+(sensación+%f),+humedad+%h,+viento+%w,+lluvia+%p&lang=es"
   ```

   Por defecto `LUGAR` = `Montevideo,Uruguay`.

2. Si el usuario pide pronóstico, o pregunta por lluvia/mañana/semana, traer 3 días:

   ```bash
   curl -s -m 10 "https://wttr.in/${LUGAR}?format=j1&lang=es"
   ```

   Del JSON usar `current_condition[0]` y `weather[0..2]` (`date`, `maxtempC`, `mintempC`, `hourly[].chanceofrain`, `hourly[].lang_es[0].value`).

3. Fallback si `wttr.in` falla o tarda (respuesta vacía, error, o texto "Unknown location"):

   ```bash
   # Montevideo por defecto: LAT=-34.9011 LON=-56.1645
   # Otra ciudad: obtener coordenadas con
   # curl -s -m 10 "https://geocoding-api.open-meteo.com/v1/search?name=CIUDAD&count=1&language=es"
   curl -s -m 10 "https://api.open-meteo.com/v1/forecast?latitude=LAT&longitude=LON&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3"
   ```

   Traducir `weather_code` (WMO): 0 despejado, 1–3 parcialmente nublado/nublado, 45/48 niebla, 51–57 llovizna, 61–67 lluvia, 71–77 nieve, 80–82 chubascos, 95–99 tormenta.

## Formato de respuesta

- Ubicación consultada (ciudad, país).
- Temperatura actual y sensación térmica en °C, condición, humedad, viento.
- Si se pidió: pronóstico de 3 días con máx/mín y probabilidad de lluvia.
- Breve y directo. Si ambas fuentes fallan, decirlo y mostrar el error.
