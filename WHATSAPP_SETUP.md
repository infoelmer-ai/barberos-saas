# 📲 Guía: Conectar WhatsApp Business (Meta Cloud API) a BarberOS

Objetivo: que las confirmaciones y recordatorios de citas salgan por WhatsApp.
Al terminar, me pasas **2 datos** (`Phone Number ID` y el `token permanente`) y yo los
pongo en Vercel — se activa solo, sin tocar el código.

> Modelo inicial: **un número compartido de BarberOS**. El mensaje va marcado con el
> nombre de cada barbería en el contenido. (Número propio por barbería = fase futura.)

---

## Paso 1 — Cuenta de Meta Business
1. Entra a https://business.facebook.com con tu cuenta de Facebook.
2. Si no tienes, crea un **portafolio comercial** (Business Portfolio): nombre del negocio (ej: "BarberOS"), tu nombre, tu correo.

## Paso 2 — App de desarrollador con WhatsApp
1. Ve a https://developers.facebook.com → **My Apps** → **Create App**.
2. Tipo de app: **Business**.
3. Nombre: `BarberOS`. Vincula tu Business Portfolio del paso 1.
4. En el panel de la app → **Add Product** → busca **WhatsApp** → **Set up**.

## Paso 3 — Número de teléfono
En **WhatsApp → API Setup** verás:
- Un **número de prueba** que da Meta automáticamente (sirve para probar ya mismo).
- Para producción: **Add phone number** → registra un **número dedicado**.

> ⚠️ El número NO puede estar activo en la app normal de WhatsApp ni WhatsApp Business.
> Usa un número nuevo o uno que des de baja de WhatsApp primero. Puede ser un chip
> barato dedicado solo a esto.

Verifica el número por SMS/llamada. Al quedar registrado, copia su **Phone Number ID**
(aparece en la misma pantalla de API Setup, debajo del número). 👈 **dato 1 que necesito**

## Paso 4 — Token PERMANENTE (importante)
El token que se muestra en API Setup **expira en 24h** — no sirve para producción.
Hay que crear un **token de usuario de sistema** (no expira):

1. https://business.facebook.com/settings → **Usuarios → Usuarios del sistema**.
2. **Agregar** → nombre `barberos-api`, rol **Administrador** → crear.
3. **Asignar activos**: asígnale la **app** (BarberOS) y la **cuenta de WhatsApp**, con permiso de control total.
4. **Generar nuevo token** → selecciona la app `BarberOS` → marca los permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. **Caducidad: Nunca**. Genera y **copia el token** (empieza con `EAA...`). 👈 **dato 2 que necesito**

> Guarda el token en un lugar seguro — solo se muestra una vez.

## Paso 5 — Plantillas (2) — aprobación de Meta
Los mensajes que iniciamos nosotros requieren plantillas aprobadas.
Ve a **WhatsApp Manager → Plantillas de mensajes → Crear plantilla**.

Crea estas **dos**, categoría **Utility (Utilidad)**, idioma **Español (es)**:

### Plantilla 1 — nombre exacto: `appointment_confirmation`
Cuerpo (copia tal cual, con las variables {{1}}…{{6}}):
```
Hola {{1}} 👋 Tu cita en {{2}} quedó confirmada ✅

✂️ Servicio: {{3}}
📅 Fecha: {{4}}
⏰ Hora: {{5}}
💈 Barbero: {{6}}

¡Te esperamos! Si no podrás asistir, avísanos con anticipación.
```
Ejemplos que pide Meta: {{1}}=Juan, {{2}}=Barbería El Maestro, {{3}}=Corte de Pelo,
{{4}}=2026-06-20, {{5}}=15:00, {{6}}=Carlos Mendoza

### Plantilla 2 — nombre exacto: `appointment_reminder`
Cuerpo (con variables {{1}}…{{5}}):
```
Hola {{1}} 👋 Te recordamos tu cita en {{2}} para mañana.

📅 {{3}}  ⏰ {{4}}
💈 Barbero: {{5}}

Si no podrás asistir, avísanos. ¡Gracias!
```
Ejemplos: {{1}}=Juan, {{2}}=Barbería El Maestro, {{3}}=2026-06-20, {{4}}=15:00,
{{5}}=Carlos Mendoza

> Los **nombres** deben ser exactamente `appointment_confirmation` y `appointment_reminder`
> (minúsculas, guion bajo) — así los llama el código. Idioma **es** (Español genérico).
> La aprobación suele tardar de minutos a unas horas.

## Paso 6 — Verificación del negocio (para enviar a todos)
En modo inicial puedes enviar solo a números de prueba que agregues. Para enviar a
cualquier cliente, Meta pide **verificar el negocio**:
**Business Settings → Centro de seguridad → Verificar negocio** (piden documentos del
negocio; tarda unos días). Puedes ir avanzando lo demás mientras tanto.

---

## Paso 7 — Me pasas los 2 datos
Cuando tengas:
- ✅ **Phone Number ID** (Paso 3)
- ✅ **Token permanente** `EAA...` (Paso 4)
- ✅ Las 2 plantillas aprobadas (Paso 5)

Me los compartes (o los guardas en `.env.real`) y yo:
1. Pongo `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` en Vercel
2. Hago un envío de prueba a tu número
3. Queda activo para todas las barberías

## Costos (referencia)
- Mensajes de **utilidad** a El Salvador: ~$0.01–0.03 c/u (centavos).
- Las primeras conversaciones de servicio del mes suelen ser gratis.
- 100 confirmaciones/mes ≈ $1–3. Lo absorbes o lo pasas a la barbería.

## Notas técnicas (ya resuelto en el código)
- El teléfono del cliente se normaliza solo a formato +503 (8 dígitos).
- Cada barbería tiene un toggle de WhatsApp en su panel (pestaña **Ajustes**).
- Si una barbería no quiere WhatsApp, lo apaga ahí; el envío respeta esa preferencia.
