# TEST_REPORT.md — Informe de Ejecución y Cobertura de Pruebas
**Proyecto:** Psico Notes Clinical  
**Versión:** v6.6.0-security-audit-remediation  
**Fecha:** 22 de Octubre de 2026  
**Responsables:** Arquitecto de Software, Seguridad & Ingeniero QA Automatización  
**Entorno de Ejecución:** Node.js v22.23.3 (Windows PowerShell) · Base de Datos Dual (PostgreSQL Fail-Safe / JSON Embebido Resiliente)

---

## 1. Resumen Ejecutivo de la Suite de Pruebas

| Métrica | Valor | Estado |
|---|---|---|
| **Total de Pruebas Ejecutadas** | **93** | ✅ Cobertura Completa |
| **Pruebas Superadas (PASS)** | **93** | ✅ 100.0% Éxito |
| **Pruebas Fallidas (FAIL)** | **0** | Ningún fallo detectado |
| **Tasa de Éxito** | **100.0%** | Sin regresiones funcionales |
| **Tiempo de Ejecución Suite** | **~6.8 segundos** | Óptimo en entorno local |
| **Verificación Estática (Linting)** | **APROBADO** | `tsc --noEmit` código 0 (0 errores) |
| **Empaquetado de Producción** | **APROBADO** | `vite build` generado en 871 ms |

---

## 2. Detalle de Pruebas por Dominio Clínico y Técnico

### 2.1 Criptografía, Seguridad Médica y Control de Acceso (28 Casos: TC-SEC-01 a TC-SEC-28)
- ✅ `[TC-SEC-01]` Cifrado y Descifrado Web Crypto AES-GCM 256-bit (7ms)
- ✅ `[TC-SEC-02]` Anonimización y desidentificación de datos sensibles PHI (3ms)
- ✅ `[TC-SEC-03]` Políticas de Seguridad OWASP y Bloqueo de Archivos Sensibles (1ms)
- ✅ `[TC-SEC-04]` Validación de Lista Blanca CORS y rechazo de orígenes no autorizados (1ms)
- ✅ `[TC-SEC-05]` Protección del Portal del Paciente y Cero Fuga PII en Respuesta de Auth (0ms)
- ✅ `[TC-SEC-06]` Aislamiento Multitenant de Expedientes y Control de Acceso por Terapeuta (151ms)
- ✅ `[TC-SEC-07]` Acceso no autenticado a endpoints clínicos protegidos responde HTTP 401 (2617ms)
- ✅ `[TC-SEC-08]` Prevención de acceso cruzado BOLA/IDOR a datos de pacientes ajenos (HTTP 403) (232ms)
- ✅ `[TC-SEC-09]` Aislamiento de alertas de crisis y rechazo de ACK cruzado (HTTP 403) (283ms)
- ✅ `[TC-SEC-10]` Prevención de sobreescritura cruzada de expedientes en sincronización batch (HTTP 403) (94ms)
- ✅ `[TC-SEC-11]` Cero fuga de resetCode en forgot-password y prevención de enumeración (OWASP) (299ms)
- ✅ `[TC-SEC-12]` Teleconsulta genera salas criptográficas de alta entropía (>=192 bits) y rechaza no autenticados (416ms)
- ✅ `[TC-SEC-13]` Validación estricta de tokens: firma manipulada, token vencido y spoofing de ID (HTTP 401/403) (78ms)
- ✅ `[TC-SEC-14]` Aislamiento de buzón criptográfico Zero-Knowledge sync/push y sync/pull (HTTP 403) (27ms)
- ✅ `[TC-SEC-15]` Bloqueo estricto de acceso no autenticado a /data/psiconotes_relacional.json (HTTP 403) (14ms)
- ✅ `[TC-SEC-16]` Prevención de notas clínicas inventadas por IA cuando falta API Key (HTTP 503) (14ms)
- ✅ `[TC-SEC-17]` Aislamiento BOLA/IDOR para expedientes huérfanos sin therapist_id asignado (HTTP 403) (208ms)
- ✅ `[TC-SEC-18]` Prevención de bypass de registro por ID y verificación de cero fuga de password_hash (273ms)
- ✅ `[TC-SEC-19]` Persistencia atómica y generación automática de respaldo .bak en operaciones clínicas (67ms)
- ✅ `[TC-SEC-20]` Protección del proxy /api/v1/clinical/ai-query y rechazo sin autenticación (HTTP 401/503) (18ms)
- ✅ `[TC-SEC-21]` Rechazo de claves Gemini enviadas por el cliente en encabezados o cuerpo (24ms) *(Nuevo Fase 2)*
- ✅ `[TC-SEC-22]` Ausencia de claves API privadas en código fuente frontend y almacenamiento (68ms) *(Nuevo Fase 2)*
- ✅ `[TC-SEC-23]` Acceso no autenticado a archivos privados estrictamente denegado con HTTP 403 (566ms) *(Nuevo Fase 2)*
- ✅ `[TC-SEC-24]` Fallo de PostgreSQL en producción sin fallback inseguro (295ms) *(Nuevo Fase 2)*
- ✅ `[TC-SEC-25]` Fallo de persistencia sin confirmación falsa de éxito (1ms) *(Nuevo Fase 2)*
- ✅ `[TC-SEC-26]` Rechazo de acceso a pacientes de otro terapeuta en todas las operaciones (198ms) *(Nuevo Fase 2)*
- ✅ `[TC-SEC-27]` Registro y login sin exposición de password_hash en respuestas JSON (226ms) *(Nuevo Fase 2)*
- ✅ `[TC-SEC-28]` Recuperación de contraseña, expiración de códigos y revocación de sesiones (551ms) *(Nuevo Fase 2)*

### 2.2 Psicometría y Evaluación Clínica (4 Casos)
- ✅ `[TC-PSY-01]` Calificación psicométrica PHQ-9 y corte de severidad (0ms)
- ✅ `[TC-PSY-02]` Detección proactiva de riesgo suicida en ítem 9 de PHQ-9 (0ms)
- ✅ `[TC-PSY-03]` Calificación automática GAD-7 y umbrales clínicos (0ms)
- ✅ `[TC-PSY-04]` Cálculos de Límites Psicométricos de Severidad para PHQ-9 y GAD-7 (0ms)

### 2.3 IA Clínica y Estructuración SOAP (2 Casos)
- ✅ `[TC-AI-01]` Verificación de integridad estructural en síntesis SOAP (302ms)
- ✅ `[TC-CHAR-01]` Tablero Gráfico Longitudinal y Copiloto IA SOAP (Síntesis y Analytics) (319ms)

### 2.4 Portal del Paciente y Autocuidado (5 Casos)
- ✅ `[TC-POR-01]` Validación del Autoregistro de Pensamientos ABC (0ms)
- ✅ `[TC-POR-02]` Activación del Protocolo SOS y estado de alerta de crisis (0ms)
- ✅ `[TC-POR-03]` Generación de Credenciales de Acceso al Portal, Sincronización y Acceso Directo por Token (2ms)
- ✅ `[TC-POR-04]` Botiquín de Calma (Respiración 4-7-8, Anclaje 5-4-3-2-1 y Registro Clínico) (585ms)
- ✅ `[TC-PORTAL-05]` Apertura Robusta del Portal Terapéutico Digital del Paciente (Enlace Nativo y Mitigación de Bloqueo) (64ms)

### 2.5 Ciclo Vital, Historia Clínica y Consentimiento (12 Casos)
- ✅ `[TC-VITAL-01]` Inferencia y Clasificación por Etapa del Ciclo Vital (Niñez, Adolescencia, Adultez) (1ms)
- ✅ `[TC-VITAL-02]` Validación de Acompañamiento en la Niñez (Tutoría, Escuela, Hitos del Neurodesarrollo) (0ms)
- ✅ `[TC-VITAL-03]` Marco Ético de Confidencialidad y Asentimiento en la Adolescencia (0ms)
- ✅ `[TC-VITAL-04]` Filtrado Reactivo por Etapa Vital (Todos, Niñez, Adolescencia, Adultez) (1ms)
- ✅ `[TC-HIST-01]` Anamnesis Integral Infantil (Perinatal, Parto, Hitos 0-3a y Ficha Biparental) (6ms)
- ✅ `[TC-HIST-02]` Entrevista Confidencial y Perspectiva Propia en la Adolescencia (0ms)
- ✅ `[TC-HIST-03]` Áreas de Vida Adulta y Hábitos Psicobiológicos (Modelo Protocolizado) (0ms)
- ✅ `[TC-HIST-04]` Hoja de Evolución Oficial Protocolizada (Dual SOAP y Membrete Dinámico) (1ms)
- ✅ `[TC-HIST-05]` Ingesta y Parser Inteligente de Pre-consulta Digital (Google Forms) (4ms)
- ✅ `[TC-HIST-06]` Llenado Directo de Pre-consulta en la App e Integración al Expediente (2ms)
- ✅ `[TC-HIST-07]` Reporte de Atención por Sesión de Terapia (Cálculo correlativo y mapeo oficial) (0ms)
- ✅ `[TC-CON-01]` Consentimiento Informado Digital en Portal (Firma Táctil y Trazabilidad) (0ms)

### 2.6 Persistencia, Sincronización y Base de Datos (6 Casos)
- ✅ `[TC-DB-01]` Validación de Persistencia y Estructura de Base de Datos Relacional (69ms)
- ✅ `[TC-DB-02]` Flujo Integral de Tareas, Autoregistro ABC y Monitoreo de Ánimo (385ms)
- ✅ `[TC-DB-03]` Persistencia y Sincronización Fiscal SENIAT (DB-002) (565ms)
- ✅ `[TC-CLOUD-01]` Registro y Autenticación Centralizada de Terapeuta en Base de Datos (103ms)
- ✅ `[TC-CLOUD-02]` Respaldo y Snapshot Integral en la Nube (Multi-Dispositivo) (201ms)
- ✅ `[TC-CLOUD-03]` Fusión Inteligente de Colecciones sin Pérdida de Datos (PC + Móvil Merge) (2ms)

### 2.7 Agenda, Finanzas y Expediente Operativo (32 Casos Adicionales)
- ✅ `[TC-FIN-01]`, `[TC-FIN-02]`, `[TC-FIN-03]`, `[TC-FIN-04]`, `[TC-FIN-05]`, `[TC-FIN-06]` (Cálculos de Balance, Pagos, IGTF y Céntimos)
- ✅ `[TC-BTN-01]`, `[TC-BTN-02]`, `[TC-BTN-03]`, `[TC-BTN-04]`, `[TC-BTN-05]` (Ergonomía de Botones y Acciones Rápidas)
- ✅ `[TC-CAL-01]` Calendario Clínico Multi-Vista (Día, Semana, Mes, Año)
- ✅ `[TC-CAL-02]` Gestión y Transición de Estados de Citas Clínicas
- ✅ `[TC-SYNC-01]` Cola de Sincronización Fuera de Línea (Offline Queue y Resiliencia PWA)
- ✅ `[TC-PRIV-01]` Sistema de Bloqueo por Inactividad Médica y Confidencialidad PHI
- ✅ `[TC-REP-01]` Generación de Epicrisis Oficial y Código Criptográfico QR
- ✅ `[TC-STAT-01]` Analítica Clínica Agregada (Distribución Diagnóstica y Remisión Sintomática)
- ✅ `[TC-AUTH-01]` Flujo Seguro de Recuperación y Restablecimiento de Contraseña
- ✅ `[TC-MOB-01]` Arquitectura de Navegación Móvil, Drawer & Bottom Bar Touch Ergonomics
- ✅ `[TC-CLI-01]` Evaluación Estructurada C-SSRS y Directorio Localizado de Crisis
- ✅ `[TC-CLI-02]` Consentimiento Informado con Teleconsulta e IA Asistida
- ✅ `[TC-NOTE-01]` Inmutabilidad de Reportes Firmados y Gestión de Adendums
- ✅ `[TC-UX-01]` Flujo Rápido de Evolución de Sesión desde la Cita
- ✅ `[TC-UX-02]` Optimización Táctil y Prevención de Solapamiento en Modales Móviles
- ✅ `[TC-PILOT-01]` Simulación de Caso Clínico Piloto y Trazabilidad Multidisciplinar
- ✅ `[TC-TEEN-01]` Protocolo Estructurado de Historia Clínica Adolescente
- ✅ `[TC-CHILD-01]` Protocolo Estructurado de Historia Clínica Infantil
- ✅ `[TC-ADULT-01]` Protocolo Estructurado de Ficha Adulto
- ✅ `[TC-SCALE-01]` Motor Dinámico y Almacenamiento de Escalas Psicométricas
- ✅ `[TC-EXP-01]` Ficha Rápida del Expediente Clínico (Estatus, Fechas de Ingreso y Egreso)
- ✅ `[TC-EXP-02]` Ubicación Superior Inmediata y Sticky de las Pestañas del Expediente
- ✅ `[TC-FILE-01]` Resiliencia ante Apertura Directa de Archivo Local (`file://` y mitigación CORS)

### 2.8 Portal de Pacientes KID — Psico Kids Space (4 Casos)
- ✅ `[TC-KID-01]` Portal Pacientes Kid: Registro de actividades lúdicas (clima, avatar, dibujo) y obtención por token (512ms)
- ✅ `[TC-KID-02]` Portal Pacientes Kid: Prevención BOLA/IDOR en lectura clínica por parte de terapeutas (549ms)
- ✅ `[TC-KID-03]` Portal Pacientes Kid: Activación automática para menores de 13 años (<13a) y cero exposición en adultos (8ms)
- ✅ `[TC-KID-04]` Portal Pacientes Kid: Reflejo inmediato de actividades infantiles en pestaña del terapeuta (38ms)

---

## 3. Detalle de Pruebas de Integración de Seguridad (TC-SEC-21 a TC-SEC-28)

| Identificador | Nombre del Caso de Prueba | Escenario Validado | Status HTTP Esperado / Obtenido | Resultado |
|---|---|---|---|---|
| **TC-SEC-21** | Rechazo de claves Gemini enviadas por el cliente | Inyección de `x-gemini-key` en headers y `geminiApiKey` en body hacia `/soap-synthesize` y `/ai-query`. | Si falta `GEMINI_API_KEY` en server: `503 Service Unavailable` sin aceptar ni almacenar clave cliente. | ✅ PASÓ |
| **TC-SEC-22** | Ausencia de claves privadas en frontend y storage | Búsqueda estricta en código fuente de `app.js`, `ai-clinical.js`, `index.html` de llamadas directas a `generativelanguage.googleapis.com` o lectura de `localStorage` con claves de API. Verificación de borrador cifrado. | Cero llamadas cliente directas; borrador activo de nota en `localStorage` cifrado con Web Crypto AES-GCM 256-bit. | ✅ PASÓ |
| **TC-SEC-23** | Acceso no autenticado a archivos privados | Intentos de acceso a `/server.js`, `/db.js`, `/Dockerfile`, `/src/App.tsx`, `/data/psiconotes_relacional.json`, traversal `/%2e%2e/server.js`, `..%2fdb.js`, logs y backups. | `403 Forbidden` para todos los archivos privados; `200 OK` para `manifest.json`, `index.html`, `portal.html`, `/assets/*`. | ✅ PASÓ |
| **TC-SEC-24** | Fallo de PostgreSQL en producción sin fallback inseguro | En `NODE_ENV=production`, intento de inicializar base de datos sin `DATABASE_URL` o con URL de PostgreSQL inalcanzable. | Lanza excepción fatal / error explícito; no conmuta a archivo JSON embebido sin autorización (`ALLOW_LOCAL_DB_IN_PROD=true`). | ✅ PASÓ |
| **TC-SEC-25** | Fallo de persistencia sin confirmación falsa de éxito | Simulación de error de I/O en escritura (`fs.writeFileSync`). | La capa de persistencia re-lanza el error (`rethrow`), impidiendo que el backend responda con éxito engañoso `200 OK`. | ✅ PASÓ |
| **TC-SEC-26** | Rechazo de acceso a pacientes de otro terapeuta | Creación de paciente asignado al Terapeuta A. El Terapeuta B intenta consultar el expediente vía `/api/v1/patients/:id` y `/api/v1/portal/data/:id`. | `403 Forbidden` en todos los accesos no autorizados. | ✅ PASÓ |
| **TC-SEC-27** | Cero exposición de `password_hash` en registro y login | Solicitud de registro exitoso y posterior login con credenciales válidas. | Objeto `therapist` retornado no incluye `password_hash` ni `passwordHash`. Ambas propiedades eliminadas de la carga útil. | ✅ PASÓ |
| **TC-SEC-28** | Recuperación de contraseña, expiración de códigos y revocación de sesiones | Generación de código forgot-password, prueba de caducidad tras 15 minutos, restablecimiento de contraseña y revocación inmediata de sesiones activas (`401` posterior al reset y logout). | Código expirado rechazado con `400`; tokens antiguos invalidados tras cambio de contraseña; endpoint `POST /logout` revoca la sesión. | ✅ PASÓ |

---

## 4. Pruebas de Calidad Estática y Empaquetado

### 4.1 Verificación Estática TypeScript (`npm run lint` / `tsc --noEmit`)
- **Comando:** `node .\node_modules\typescript\bin\tsc --noEmit`
- **Código de salida:** `0` (Exitoso)
- **Errores detectados:** `0`
- **Diagnóstico:** Se corrigió la signatura `async saveDraft()` en `app.js` para asegurar compatibilidad total con llamadas asíncronas a `encryptData()`, manteniendo cero errores de tipos estáticos en el proyecto.

### 4.2 Verificación de Empaquetado de Producción (`npm run build` / `vite build`)
- **Comando:** `node .\node_modules\vite\bin\vite.js build`
- **Código de salida:** `0` (Exitoso en 871 ms)
- **Artefactos generados:**
  - `dist/index.html` (118.02 kB │ gzip: 23.35 kB)
  - `dist/portal.html` (62.39 kB │ gzip: 12.85 kB)
  - `dist/assets/main-24A3l7Hg.css` (109.01 kB │ gzip: 17.90 kB)
  - `dist/assets/portal-4kkEgF1E.css` (48.66 kB │ gzip: 9.66 kB)
  - `dist/assets/icon-192-BzaaM_Fc.png` (1.08 kB)
- **Auditoría de Bundling:** Cero referencias a secretos de entorno en los assets generados.
