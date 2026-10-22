# CHANGELOG.md — Registro de Cambios y Versiones
Todas las modificaciones notables realizadas en el proyecto Psico Notes Clinical se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [6.6.0-security-audit-remediation] — 2026-10-22 (Auditoría de Seguimiento, Remediación y 8 Pruebas de Integración)

### Seguridad y Hardening
- **Gemini API Key Exclusiva de Servidor**:
  - Eliminada en `server.js` la aceptación de `req.headers['x-gemini-key']` y cualquier inyección desde cliente en endpoints de IA (`/soap-synthesize` y `/ai-query`). Se utiliza exclusivamente `process.env.GEMINI_API_KEY`.
  - En `index.html` y `app.js`, se reemplazó el formulario de ingreso de clave en `#apiKeyModal` por un indicador de estado del servicio (`/api/v1/clinical/ai-status`).
  - Purga automática en `ai-clinical.js` de cualquier clave API preexistente en `localStorage` o `sessionStorage`.
- **Persistencia Segura y a Prueba de Fallos (`db.js`)**:
  - **Fallo Seguro en Producción**: En `NODE_ENV === 'production'`, el backend arroja error fatal y se detiene si falta `DATABASE_URL` o si PostgreSQL es inaccesible, impidiendo la degradación silenciosa a JSON.
  - **Fallo de E/S con Error Real**: En `_persistLocalStore()`, se re-lanzan los errores de escritura en disco, evitando que el servidor devuelva `200 OK` sobre escrituras fallidas.
  - **Prevención de Pérdida por Corrupción**: Si el archivo principal y su respaldo `.bak` están dañados, el sistema activa `_isCorruptState = true;` y genera un volcado de emergencia, bloqueando escrituras posteriores para no sobrescribir la base de datos con un esquema vacío.
  - **Cierre Garantizado de Conexiones**: Adquisición de cliente de PostgreSQL asegurada con `try ... finally { client.release(); }`.
- **Autenticación y Sesiones Hardened (`server.js`, `db.js`)**:
  - **Cero Fuga de Hashes**: Purgados exhaustivamente `password_hash` y `passwordHash` en respuestas de registro y login.
  - **Prevención de Secuestro de Cuentas en Registro**: Eliminado bypass por ID y añadida verificación de colisión `findTherapistById(id)` retornando `409 Conflict`.
  - **Revocación de Sesiones**: Implementada lista negra en memoria `revokedTokenHashes` y mapa de revocación por terapeuta `therapistRevocationTimestamps`.
  - **Endpoint de Cierre de Sesión**: Creado `POST /api/v1/auth/logout` con revocación inmediata del token Bearer.
  - **Invalidación Global en Reset de Clave**: Al restablecer contraseña en `POST /api/v1/auth/reset-password`, se revocan automáticamente todas las sesiones previas del terapeuta.
- **Servidor de Archivos Estáticos con Lista Blanca Estricta (`server.js`)**:
  - Sustituido `express.static(__dirname)` por enrutador de lista blanca (`ALLOWED_STATIC_FILES`) para interfaz legítima y `/assets/*`.
  - Bloqueo inmediato con `HTTP 403 Forbidden` ante intentos de acceso a `server.js`, `db.js`, `Dockerfile`, `src/*`, logs, backups, `.json` y secuencias de path traversal (`..`, `%2e%2e`).
  - Servicio correcto de `manifest.json` con `Content-Type: application/manifest+json; charset=utf-8`.
- **Cifrado de Borrador Activo de Notas Clínicas (`app.js`)**:
  - `saveDraft()` ahora es `async` y cifra `psico_active_note_draft` con AES-GCM 256 bits mediante `encryptData(draft)` antes de guardarlo en `localStorage`.
- **Saneamiento de Respaldos (`backup.js`)**:
  - `exportBackupFile()` sanea el objeto `user`, eliminando contraseñas y hashes antes de exportar.
- **Limpieza del Repositorio (`.gitignore`)**:
  - Excluidos `data/`, `*.bak`, `*.tmp`, `*.winmd` en `.gitignore`.
  - Desindexados archivos JSON de `data/` del control de versiones Git.

### Pruebas de Integración y Calidad
- **8 Nuevos Casos de Prueba de Integración (`tests.js`)**:
  - `TC-SEC-21`: Rechazo de claves Gemini enviadas por el cliente en encabezados o cuerpo.
  - `TC-SEC-22`: Ausencia de claves privadas en frontend y verificación de borrador cifrado.
  - `TC-SEC-23`: Acceso no autenticado a archivos privados denegado con HTTP 403.
  - `TC-SEC-24`: Fallo de PostgreSQL en producción sin fallback inseguro.
  - `TC-SEC-25`: Fallo de persistencia sin confirmación falsa de éxito.
  - `TC-SEC-26`: Rechazo estricto de acceso a pacientes de otro terapeuta.
  - `TC-SEC-27`: Registro y login sin exposición de `password_hash` en JSON.
  - `TC-SEC-28`: Recuperación de contraseña, expiración de códigos y revocación de sesiones.
- **Métricas de la Suite**:
  - **93/93 Pruebas Automatizadas Aprobadas (100% PASS)**.
  - `npm run lint` (`tsc --noEmit`): 0 errores.
  - `npm run build` (`vite build`): Exitoso en 871 ms.

---

## [6.5.1-kid-portal-automation] — 2026-10-21 (Activación Automática de Portal KIDS por Edad < 13a y Aislamiento en Adultos)

### Añadido y Optimizado
- **Activación Pediátrica Automática por Edad (< 13 años) en la Ficha del Terapeuta (`app.js`)**:
  - Implementación de la función médica evaluadora `isKidPatient(patient)` que calcula la edad exacta mediante `calculateAge(patient.birthdate)` o edad directa.
  - Los pacientes menores de 13 años son categorizados de manera automática como `Niñez` (`child`).
  - **Pestaña del Portal (`tab-portal`)**: Muestra banner destacado verde menta indicando que el paciente opera en etapa pediátrica y el botón principal se adapta a `🎈 Abrir Portal KIDS` (color `#2EC4B6`).
  - **Modal de Credenciales (`openPortalAccessModal`)**: Presenta la insignia `🧒 Portal KIDS (< 13 años)` y tarjeta heroica contextualizada `🎈 Psico Kids Space — Portal Interactivo`.
  - **Lanzamiento y Compartición (`launchPatientPortal`, `sharePortalViaWhatsApp`, `showPortalQrCode`, `copyPortalLink`)**: Anexan automáticamente el parámetro `&mode=kid` y componen textos dirigidos al tutor legal del menor.
- **Ocultamiento Estricto de "Modo Kids" en el Portal de Adultos y Adolescentes (`portal.html`, `portal.css`, `portal.js`)**:
  - El botón `#btnKidModeToggle` (`.btn-kid-toggle`) se configuró con `display: none !important;` tanto a nivel de plantilla HTML como en CSS.
  - La función `determineIfKid(patientData)` en `portal.js` evalúa estrictamente si el consultante es menor de 13 años. Si no lo es, activa el portal clínico estándar de adultos/adolescentes y garantiza que **no exista ningún rastro, botón o mención de "Modo Kids"**.
  - Para los niños (< 13 años), el portal inicia inmediatamente en el entorno lúdico `Psico Kids Space` sin botones confusos para saltar a pantallas de adultos.
- **Caso de Prueba Automatizado `TC-KID-03`**:
  - Valida la inferencia clínica para 8 y 12 años (activación Kid Portal), 13 años cumplidos (adolescencia, exclusión de Kid Portal), 28 años (adultez) y la presencia de la directiva de invisibilidad en `portal.html` y `portal.css`.
  - **75/75 pruebas automatizadas superadas al 100%**.

---

## [6.5.0-gamified-kids-experience] — 2026-10-21 (Rediseño Lúdico y Sensorial: Psico Kids Space Gamificado)

### Añadido y Mejorado
- **Experiencia Lúdica Dinámica Integral (Estilo Toca Boca / Duolingo Kids)**:
  - **Sintetizador de Audio Nativo Web Audio API (`KidAudioEffects`)**:
    - Generación procedimental de efectos sonoros sin dependencias ni peso externo (0 KB assets adicionales).
    - Efectos: `pop` (burbujas pomposas), `ding/star` (arpegio de estrellas), `boing` (rebote elástico en zonas corporales y avatares), `yay` (fanfarria pentatónica de victoria al enviar dibujos) y `zen` (onda sinusoidal relajante durante respiración).
    - Botón de control de sonido flotante (`🔊` / `🔇`) accesible en la cabecera lúdica con persistencia de preferencia en `localStorage`.
  - **Motor de Confeti y Partículas en Canvas (`KidConfetti`)**:
    - Sistema de partículas 2D por física de aceleración y gravedad sobre `<canvas id="kidConfettiCanvas">`.
    - Disparo de ráfagas estelares multicolores reactivas a coordenadas táctiles y de ratón (burst) al explotar burbujas, guardar avatares o completar dibujos.
  - **Rediseño Completo de Vistas Lúdicas (`portal.html`, `portal.css`, `portal.js`)**:
    - *Clima Emocional & Mapa Somático*:
      - Nubes esponjosas flotantes animadas (`@keyframes floatCloud`).
      - Tarjetas de micro-clima con animaciones activas: Giro solar (`sunSpin`), brillo arcoíris (`rainbowGlow`), gotas de lluvia oscilantes (`rainDrip`), destello de tormenta (`boltFlash`) y rotación del tornado (`tornadoTwirl`).
      - Figura de silueta corporal interactiva en SVG con puntos radiantes pulsantes (`hotspots` en cabeza, garganta, pecho, pancita, manos) y bocadillo de diálogo estilo cómic que valida con empatía las sensaciones del niño.
    - *Laboratorio de Avatares*:
      - Pedestal 3D con anillo de aura luminosa giratoria y animación de salto feliz (`@keyframes avatarHop`).
      - Generador interactivo de nombres de superhéroes y criaturas mágicas ("🎲 ¡Inventar Nombre Mágico!").
    - *Cazador de Preocupaciones*:
      - Burbujas 3D con destellos de nácar iridiscente, flotación orgánica y explosión con sonido de pop real y partículas directas al toque táctil.
    - *Lienzo Mágico*:
      - Estuche de pintura de juguete, pincel arcoíris dinámico (`setRainbowBrush()`) que cicla el espectro cromático HSL al trazar, y barra de sellos mágicos gigantes (`⭐`, `💖`, `🌈`, `🐾`, `🚀`, `🦄`, `🌻`, `🍦`).
    - *Globo de la Calma*:
      - Personaje globo con carita expresiva animada (ojos y boquita que inhalan `😮` y exhalan pacíficamente `😌`) sincronizado con el ciclo de respiración diafragmática.
    - *Consola Portátil de Navegación*:
      - Barra inferior rediseñada como consola portátil infantil (`kid-bottom-console`) con botones esféricos elevados 3D y rebote táctil activo.
- **Tipografía Lúdica Infantil**:
  - Incorporación de tipografía redondeada moderna `Fredoka` (Google Fonts) para una lectura amigable y estimulante en niños.
- **Validación y Estabilidad**:
  - 100% de la suite de pruebas superada (74/74 tests en `node tests.js`), 0 errores de TypeScript y compilación exitosa de Vite.

---

## [6.4.0-portal-kids] — 2026-10-21 (Portal Pacientes KID: Psico Kids Space)

### Añadido
- **Portal de Pacientes KID Interactivo y Lúdico (Psico Kids Space)**:
  - Selector de modo Kids en cabecera con contador dinámico de estrellas mágicas ganadas (⭐).
  - Auto-detección de pacientes pediátricos (`child` / `infantil`) y soporte de alternancia reversible hacia modo estándar.
- **5 Vistas Clínico-Lúdicas Especializadas en el Portal (`portal.html`, `portal.js`, `portal.css`)**:
  - `Mi Espacio Mágico`: Clima de mi Corazón (6 climas emocionales: Soleado ☀️, Sol con nubes 🌤️, Arcoíris 🌈, Lluvia 🌧️, Tormenta ⚡, Remolino 🌪️) combinado con Mapa Somático Corporal interactivo (🧠 Cabecita, 🗣️ Garganta, 💖 Pecho, 🌀 Pancita, ✊ Manitas).
  - `Mi Avatar Amigo`: Creador interactivo con 5 arquetipos de guías (🦊 Zorrito Valiente, 🐻 Osito Protector, 🦉 Búho Sabio, 👾 Monstruito Alegre, 🚀 Explorador Estelar), selección de Aura mágica cromática y accesorios protectores (Capa, Lentes, Corona, Estrella, Escudo).
  - `Cazador de Preocupaciones`: Juego de explosión de burbujas interactivas con flotación CSS, partículas de confetti y recordatorio de respiración profunda consciente.
  - `El Lienzo Mágico`: Lienzo HTML5 Canvas con soporte responsive táctil y de ratón, paleta cromática vibrante, goma de borrar, tamaños de pincel, sellos lúdicos y envío directo en Base64 al consultorio del terapeuta.
  - `El Globo de la Calma`: Ejercicio guiado de respiración diafragmática para niños con expansión (4s) y contracción (6s), temporizador en pantalla y desbloqueo de superpoderes de tranquilidad por ciclos.
- **Doble Navegación Inferior Responsive**: Menú estándar para adultos vs. Menú lúdico `kid-bottom-nav` para niños.
- **Persistencia Relacional y Modelo de Datos**:
  - Nueva tabla relacional `kid_portal_activities` en `schema.sql` con índices optimizados por `patient_id` y `activity_type`.
  - Soporte de almacenamiento dual PostgreSQL y local store atómico con rotación de respaldos en `db.js`.
- **Endpoints REST Seguros en el Backend Gateway (`server.js`)**:
  - `POST /api/v1/portal/kid/activity`: Registro seguro autenticado por token de paciente con otorgamiento de recompensas lúdicas.
  - `GET /api/v1/portal/kid/activity`: Consulta del espacio personal del paciente.
  - `GET /api/v1/patients/:id/kid-activity`: Consulta clínica con estricta autorización HMAC y prevención de vulnerabilidades BOLA/IDOR (`patient.therapist_id === req.therapistId`).
- **Recepción Clínica en el Panel del Terapeuta (`historia-clinica.js`)**:
  - Tarjeta integrada "🌟 Actividad Lúdica del Paciente (Portal Kids)" en la Anamnesis Integral Infantil, mostrando avatar seleccionado, estado del clima y zona corporal, burbujas liberadas y galería visual de dibujos con visor ampliado.
- **Batería de Pruebas Automatizadas**:
  - `TC-KID-01`: Registro y obtención de actividades infantiles en tiempo real.
  - `TC-KID-02`: Verificación estricta de mitigación BOLA/IDOR para expedientes pediátricos.
  - 74/74 pruebas superadas al 100%, 0 errores en TypeScript y compilación de producción Vite impecable.

---

## [6.3.0-workflows-and-ai] — 2026-10-21 (Fase 3, 4 y 5: Flujos Clínicos, IA Responsable y DevOps)

### Añadido
- **Gestión de Alertas de Crisis en Tiempo Real en el Panel del Terapeuta**: Integración reactiva de `checkPortalCrisisAlerts` contra `/api/v1/portal/crisis-alerts` y descarte seguro por ID (`dismissCrisisBanner`).
- **Teleconsulta Criptográfica de Alta Entropía**: Conexión al generador seguro de salas del backend (`/api/v1/telehealth/session` con 192 bits de entropía), garantizando salas no predecibles.
- **Inmutabilidad Estricta de Notas Clínicas Firmadas**: Las notas finalizadas quedan selladas e inmutables, requiriendo adendums fechados con trazabilidad de autor para modificaciones posteriores.
- **Aritmética Financiera con Precisión Decimal**: Introducción de la función de redondeo `roundCurrency` en `finance.js`, `adm.js` y `db.js` para cálculos de ingresos, deudas pendientes y alícuota fiscal del 3% IGTF SENIAT sin jitter de punto flotante.
- **Proxy Backend de IA Segura**: Endpoints `/api/v1/clinical/ai-query` y `/api/v1/clinical/ai-status` protegidos por autenticación HMAC de terapeuta.
- **Eliminación Definitiva de Claves de IA en el Frontend**: Se purgó la persistencia de claves de Gemini en el navegador (`localStorage.psico_gemini_api_key`), delegando la gestión de secretos exclusivamente al entorno del servidor (`GEMINI_API_KEY`).
- **Anonimización PHI Obligatoria Previa a IA**: Pre-filtrado estricto con `PhiAnonymizer` antes de enviar notas o expedientes a modelos de lenguaje, desidentificando nombres, teléfonos y fechas.
- **Manejo Ético y Degradación Elegante de IA**: Ante ausencia de `GEMINI_API_KEY` (HTTP 503), no se inventa contenido clínico artificial y se informa al terapeuta para redacción manual con advertencia ética visible.
- **Empaquetado y Despliegue Docker Hardened**: Creación de `Dockerfile` multi-stage con usuario no privilegiado (`psiconotes`), healthcheck oficial y soporte para `/api/v1/health` en `server.js`.
- **Caso de Prueba `TC-SEC-20`**: Verificación de protección y rechazo no autenticado en `/api/v1/clinical/ai-query` (72 pruebas automatizadas superadas al 100%).

---

## [6.2.0-premium-ui] — 2026-10-21 (Fase 2: Diseño Visual Premium Minimalista)

### Añadido
- **Tokens Centralizados del Sistema de Diseño Clínico** en `styles.css` y `portal.css`:
  - Fondo general sereno: `#F7F8F6`.
  - Superficies de trabajo y tarjetas: `#FFFFFF`.
  - Texto principal de alta legibilidad: `#202923` (WCAG 2.2 AAA).
  - Texto secundario: `#69736D` (WCAG 2.2 AA).
  - Verde petróleo clínico: `#285C50` (hover: `#1E463D`).
  - Acento suave y selecciones: `#E7F0EB`.
  - Bordes discretos: `#E5E9E5`.
  - Rojo clínico accesible: `#D32F2F` reservado para alertas críticas.
- **Navegación Lateral Unificada** en `index.html`: Estructurada en los 8 módulos clínicos fundamentales (`Inicio`, `Pacientes`, `Agenda`, `Sesiones y Notas`, `Evaluaciones`, `Informes`, `Finanzas`, `Ajustes`) preservando herramientas clínicas de apoyo.
- **Modo Oscuro Equilibrado**: Fondo carbón clínico `#121815`, tarjetas `#1A241F`, bordes suaves y contraste optimizado.
- **Armonización del Portal del Paciente**: `portal.css` adaptado a los mismos tokens institucionales.
- **Guía de Estilo Oficial**: Creación de `DESIGN_SYSTEM.md`.

---

## [6.1.0-hardened] — 2026-10-21 (Fase 1: Seguridad Crítica y Estabilidad)

### Añadido
- **Casos de prueba automatizados de seguridad (TC-SEC-15 a TC-SEC-19)** en `tests.js`:
  - `TC-SEC-15`: Bloqueo estricto de descargas no autenticadas en `/data/*` y archivos `.json` (HTTP 403).
  - `TC-SEC-16`: Prevención de notas clínicas inventadas por IA ante ausencia de `GEMINI_API_KEY` (HTTP 503).
  - `TC-SEC-17`: Aislamiento multitenant BOLA/IDOR para expedientes huérfanos sin `therapist_id`.
  - `TC-SEC-18`: Prevención de secuestro de cuentas en `/api/v1/auth/register` por coincidencia de ID y verificación de cero fuga de `password_hash`.
  - `TC-SEC-19`: Persistencia atómica y generación automática de respaldo preventivo `.bak`.
- **Escritura atómica de datos en `db.js`**: Implementación de guardado en archivo temporal `.tmp` con renombrado atómico (`fs.renameSync`) y generación automática de respaldo `.bak`.
- **Recuperación automática de desastres en `db.js`**: Si el archivo principal se corrompe, se restaura desde `.bak` o se preserva una copia de emergencia con timestamp para análisis forense.
- **Validación estricta de `SESSION_SECRET` en producción**: Detención inmediata del servidor (`process.exit(1)`) si se inicia en modo producción sin una clave de al menos 32 caracteres.
- **Documentación de arquitectura y seguridad**: Creación de `AUDIT_REPORT.md`, `SECURITY_REMEDIATION.md` y `TEST_REPORT.md`.

### Modificado
- `server.js`: Cortafuegos de archivos estáticos reforzado para interceptar solicitudes a `/data`, `/revision`, y extensiones sensibles (`.json`, `.bak`, `.tmp`, `.log`, `.sql`, `.env`), excluyendo las rutas de API REST (`/api/*`).
- `server.js`: El endpoint `/api/v1/clinical/soap-synthesize` ahora responde `503 Service Unavailable` con `{ error: ..., source: 'unavailable' }` cuando no hay API Key de Gemini configurada.
- `server.js`: El endpoint `/api/v1/portal/data/:patientId` exige de forma obligatoria que `data.patient.therapist_id === req.therapistId`; de lo contrario rechaza con `403 Forbidden`.
- `server.js`: En `/api/v1/auth/register`, se eliminó el bypass que permitía reconectar con ID sin verificar contraseña, y se purga el campo `password_hash` de cualquier respuesta enviada al cliente.
- `db.js`: `getPatientsByTherapist` ahora filtra estrictamente por `Boolean(p.therapist_id) && p.therapist_id === therapistId`, impidiendo que los pacientes sin terapeuta asignado sean entregados a cualquier usuario.
- `db.js`: `syncPatientsBatch` propaga e inyecta obligatoriamente el `therapist_id` autenticado a todos los pacientes procesados.
- `app.js`: Corregido error sintáctico de TypeScript en la función `handleSubmitNewPassword` (línea 994), restableciendo la ejecución exitosa de `tsc --noEmit`.
- `app.js`: Eliminado el guardado en texto plano de notas clínicas en `localStorage.setItem('psico_portal_notes_backup')`.

### Corregido
- Vulnerabilidad P0 de fuga masiva de expedientes clínicos descargables sin autenticación vía `GET /data/psiconotes_relacional.json`.
- Riesgo ético/clínico P0 de generación y persistencia de notas SOAP artificiales simuladas.
- Brecha de seguridad P0 de suplantación de identidad mediante ID en el registro de terapeutas.
- Vulnerabilidad P0 de lectura cruzada de pacientes huérfanos entre profesionales de la salud.
- Fallo de compilación estática de TypeScript en `app.js`.

---

## [6.0.0] — 2026-10-15
- Versión base inicial con soporte de expediente clínico, portal de pacientes, escalas psicométricas PHQ-9/GAD-7, protocolo de crisis y facturación básica.
