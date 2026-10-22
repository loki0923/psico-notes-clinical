# 01 — Inventario Funcional, Flujos Críticos y Detección de Features Fantasma

**Proyecto:** Psico Notes Clinical v6.0 — revisión de calidad pre-producción
**Rol autor:** PM-01 (Project Manager del equipo de revisión)
**Workspace:** `C:\Users\Windows 11\OneDrive\Desktop\psico-notes-clinical`
**Fecha:** sesión de revisión (Sprint 0 de auditoría)
**Estado:** entregable de planificación — **no** es una auditoría de causa raíz (eso corresponde a FE, BE y QA)

---

## 0. Objetivo, alcance y método

### 0.1 Objetivo

Convertir el reporte del dueño (*"hay muchas funciones que no me están trabajando"*) en un **plan de verificación ejecutable**: qué funciones existen, cómo se prueban de forma objetiva, qué flujos clínicos no pueden fallar, qué se prometió y no se implementó, y con qué rúbrica se clasifica y reporta cada hallazgo por parte de los 3 agentes de revisión.

### 0.2 Alcance

| Incluido | Excluido (lo hacen FE/BE/QA) |
|---|---|
| Mapa de módulos y puntos de entrada | Depuración paso a paso de cada handler |
| Inventario funcional con criterio de aceptación | Corrección de código |
| 18 flujos end-to-end a intentar | Dictamen final de causa raíz por defecto |
| Detección de features fantasma (grep + contrato FE↔BE) | Refactor / rediseño |
| Rúbrica de severidad, priorización y esfuerzo | Estimación detallada por tarea |
| Riesgos regulatorios (PHI, consentimiento, SENIAT) | Asesoría legal formal |
| Formato único de reporte para FE/BE/QA | — |

**Regla dura respetada:** no se modificó ningún archivo de la aplicación. Todo lo escrito vive en `revision\`.

### 0.3 Método aplicado

1. Lectura del índice/TOC de `arquitectura.md` (2.421 líneas, 24 secciones) y de `plan_pruebas.md` (119 líneas, 56 casos TC).
2. Extracción del `<nav>` y de los 9 contenedores `data-view` / `*View` de `index.html` (1.939 líneas).
3. Cabeceras y exports de los 16 módulos JS del cliente (`.js` en raíz).
4. Cruce estático de los **28 endpoints** de `server.js` contra los `fetch()` reales del frontend.
5. Cruce de los **154 handlers inline** (`onclick`/`onchange`/`onsubmit`) de `index.html` contra las definiciones en JS.
6. Cruce de los **383 `getElementById()`** del cliente contra los **656 `id`** definidos en HTML+JS (detección de ids huérfanos).
7. Verificación de contratos en vivo contra el servidor que ya corre en `http://127.0.0.1:4173` (sin detenerlo, sin modificarlo).

### 0.4 Convención de confianza (obligatoria en todos los reportes)

- **Alta** — comprobado por lectura de código o por respuesta real del servidor en esta sesión.
- **Media** — inferido de un cruce estático consistente, no ejecutado en navegador.
- **Baja** — sospecha fundada; requiere reproducción de QA para confirmarse.

> **Limitación declarada:** no hay navegador automatizable (sin Playwright/Puppeteer/jsdom y no se pueden instalar). Ningún hallazgo de UI de este documento afirma "no funciona al hacer clic"; afirma "no tiene implementación detectable" o "no tiene consumidor". La reproducción en navegador es tarea de QA (§7.4).

---

## 1. Mapa de módulos → propósito → punto de entrada

### 1.1 Capa cliente (SPA terapeuta) — `index.html` (1.939 líneas)

| ID | Módulo | Propósito | Entrada en UI (`archivo:línea`) | Implementación | Persistencia / API |
|---|---|---|---|---|---|
| M01 | **Boot y Auth** | Registro, login, logout, recuperación por PIN, sesión | `index.html:22` (`authScreen`), `:29` (`loginForm`), `:52` (`forgotPasswordForm`), `:149` (`registerForm`) | `app.js:143` (boot `DOMContentLoaded`), `:186` (`startAppForCurrentUser`), `:733` (`hashPassword`), `:1142` (`handleLogout`) | `POST /api/v1/auth/register|login|forgot-password|reset-password` (`server.js:751,800,832,864`); `localStorage.psico_users/psico_session/psico_session_token` |
| M02 | **Shell y navegación** | Sidebar, bottom-nav móvil, breadcrumb, atajos, tema | `index.html:200-276` (`<nav>`), `:720-736` (bottom nav), `:317` (top bar) | `app.js:1378` (`navigateTo`), `:1433`/`:1447` (drawer), `:1454` (`switchMobileView`), `:6445-6468` (atajos de teclado, `case 'b'` en `:6457`) | — |
| M03 | **Mi Consulta (Dashboard)** | KPIs, alertas clínicas, prioritarios, agenda del día, recordatorios | `index.html:359` (`dashboardView`), `:409` (widget recordatorios), `:1507` (drawer) | `app.js:1488` (`updateDashboard`), `:1626` (`renderClinicalAlerts`), `:1636` (`generateClinicalAlerts`), `:1695` (`calculatePriorityPatients`), `:6546` (`checkPortalCrisisAlerts`) | `AppState` + `localStorage`; API de crisis **no** consumida (§4 PF-01) |
| M04 | **Pacientes / Expediente** | Alta, edición, filtros por etapa vital, ficha, tabs, estatus, alta clínica | `index.html:461` (`patientsView`), `:743` (`patientModal`), `:1090` (`patientDetailModal`) | `app.js:2169` (`renderPatients`), `:2268` (`handlePatientSubmit`), `:2357` (`editPatient`), `:2455` (`viewPatient`), `:2572` (`switchPatientTab`), `:1961` (`getPatientCategory`) | `AppState.patients`; `POST /api/v1/patients/sync` (`server.js:556`) |
| M05 | **Historia clínica** | Historia protocolizada adulto/niñez/adolescencia, genograma, pre-consulta in-app, import Google Forms, PDF oficial | `index.html:248` (nav "Llenar Pre-consulta"); tab Historia en expediente | `historia-clinica.js:761` (`openFullHistoryEditor`), `:973` (`handleSaveFullHistory`), `:423` (`renderTabHistoriaIntegral`), `:1068` (genograma), `:1291`/`:1490`/`:1494` (PDF), `:1901` (`openInAppPreconsultaForm`), `:1698` (import GF) | `AppState.patients[].history`; sin endpoint propio |
| M06 | **Reportes de Atención / SOAP** | Nota por sesión, formato dual, plantillas, firma, inmutabilidad, adendums, PDF | `index.html:583` (`notesView`), `:589` (botón nuevo reporte), `:1180` (`noteModal`) | `app.js:5187` (`openReporteAtencionModal`), `:5542` (`handleNoteSubmit`), `:5605-5641` (inmutabilidad/adendum), `:5248` (`renderNotes`), `:5287` (`switchNoteFormat`), `:5307` (plantillas), `:5416` (`NoteDraftManager`), `:1849` (`evolveAppointmentSession`) | `AppState.notes`; sync vía `clinical/sync` |
| M07 | **Escalas psicométricas** | Catálogo (PHQ-9, GAD-7, etc.), aplicación, scoring, riesgo, editor de escalas, historial | `index.html:625` (`scalesView`, contenedor vacío → render JS), `:1409` (`scaleModal`), `:1849` (`scaleEditorModal`) | `scales.js:232` (`renderScalesView`), `:696` (`openScaleEditorModal`); `app.js:5791` (`saveScaleResult`), `:3114` (`renderTabEscalasEnhanced`) | `AppState.notes[].scaleResult`; `POST /api/v1/portal/evaluations` **sin consumidor** |
| M08 | **Agenda / Calendario** | Citas, vistas día/semana/mes/año, estados, evolución, ICS/Google Calendar | `index.html:515` (`appointmentsView`), `:1104` (`appointmentModal`) | `app.js:4616`/`:4719`/`:4802`/`:4898` (4 vistas), `:4972` (`renderAppointments`), `:5040` (`handleAppointmentSubmit`), `:5018` (`setAppointmentStatus`), `:5091` (`completeAppointment`), `:6012-6032` (Google/ICS) | `AppState.appointments`; sync vía `clinical/sync` |
| M09 | **Finanzas** | Transacciones, categorías, tarifas, metas, balance | `index.html:601` (`financeView` → `financeContent`), `:1451-1502` (5 modales) | `finance.js:118` (`renderFinanceView`), `:711` (`openTransactionModal`); `app.js:1574` (metas), `:1621` (tarifas) | `localStorage.psico_finance_*_<userId>` (`finance.js:5`) |
| M10 | **Facturación SENIAT** | Config fiscal, emisión, IVA/IGTF, numeración correlativa, impresión | `index.html:606` (`billingView`), `:1423` (`billingModal`) | `adm.js:91` (config), `:158` (lista), `:235` (creador), `:306` (totales), `:336` (submit), `:390` (print), `:60` (`syncBillingWithServer`) | `localStorage.psico_billing_*`; `GET/POST /api/v1/billing/config|invoices` (`server.js:888-931`) |
| M11 | **Búsqueda global** | Buscar pacientes y notas | `index.html:628` (`searchView`), `:637` (`#globalSearch`) | `app.js:6078` (`handleGlobalSearch`), `:1375` (listener), `:6090` (`handleSearchResult`) | `AppState` |
| M12 | **Métricas** | Estadísticas de consulta y epidemiología | `index.html:648` (`statsView`) | `app.js:6092` (`updateStats`) | `AppState` |
| M13 | **IA clínica** | Copiloto, SOAP asistido, hipótesis DSM-5-TR/CIE-11, psicoeducación por IA | `index.html:294` (botón `preloadAIModel`), `:1537` (`aiCopilotModal`), `:1606` (`apiKeyModal`) | `ai-clinical.js:46` (`callGemini`), `:21` (`loadApiKey`); `app.js:5840` (copiloto), `:5873` (chat), `:5906` (dx), `:5932` (SOAP), `:3377` (`openSoapAiModal`) | **Llave del navegador** vía `localStorage.psico_gemini_api_key`; proxy `POST /api/v1/clinical/soap-synthesize` (`server.js:616`) **sin consumidor** |
| M14 | **Anonimizador PHI** | Desidentificación previa al LLM y restauración | Invocado desde IA (no tiene UI propia) | `phi-anonymizer.js` (`PhiAnonymizer`) | — |
| M15 | **Dictado por voz** | Notas por voz (Web Speech API) | `index.html:1281` (nota), `:3536` (`toggleSoapVoiceDictation`) | `voice-dictation.js` (`VoiceDictation`) | — |
| M16 | **Psicoeducación TCC/ACT/DBT** | Hojas de trabajo, asignación al portal, generación IA | `index.html:252` (nav) | `psychoed.js:64` (`openWorksheetModal`), `:359` (`assignToPortalTask`) | `localStorage.psico_portal_data_<patientId>` (§4 PF-08) |
| M17 | **Vademécum** | Consulta psicofarmacológica | `index.html:256` (nav) | `vademecum.js:82` (`openVademecumModal`) | Estático |
| M18 | **Protocolo de crisis** | C-SSRS, directorio de emergencias, actuación, cierre | Automático desde alertas; banner dashboard | `crisis-protocol.js:120` (`showCrisisProtocol`), `:141` (`renderCrisisModalContent`), `:120-141` (directorio VE) | `AppState` + `POST /api/v1/portal/crisis` (`server.js:444`) |
| M19 | **Consentimiento informado + firma** | Texto por etapa vital, firma táctil, PDF, persistencia | `app.js:2525` (botón en expediente) | `consentimiento.js:10` (`openInformedConsentModal`), `:117` (pad), `:168` (`generateSignedInformedConsent`) | `AppState.patients[].informedConsent` (`:249`); **sin endpoint** |
| M20 | **Portal del paciente (PWA)** | Login por token, tareas, ánimo, ABC, escalas, SOS, botiquín de calma | `index.html:331`-área / `app.js:3664` (`openPortalAccessModal`), `:1754` (`portalAccessModal`), `:1801` (`qrModal`) | `app.js:3899`/`:3913` (lanzar), `:3957` (QR), `:4035` (token); `portal.html` + `portal.js` (1.634 líneas) | `POST /api/v1/portal/auth|mood|cbt|crisis` + `GET /portal/me` |
| M21 | **Teleconsulta** | Videollamada, apuntes, transferencia a SOAP | `index.html:331` (botón), `:1632` (`telehealthModal`) | `app.js:6475` (`openTelehealthModal`), `:6515` (transferir a SOAP) | Jitsi público; `POST /api/v1/telehealth/session` (`server.js:663`) **sin consumidor** |
| M22 | **Informes oficiales** | Epicrisis, derivación, constancia, membrete, firma, QR | `index.html:260` (nav) | `reports.js:6` (`openReportGeneratorModal`), `:128` (generación), `:141-143` (firma+código), `:216` (QR) | `localStorage.psico_therapist_signature`; QR contra `api.qrserver.com` |
| M23 | **Backup** | Exportar/restaurar JSON | `index.html:285-293` (sidebar footer) | `backup.js:5` (`exportBackupFile`), `:33` (`importBackup`), `:75` (`openBackupModal`) | Descarga de archivo |
| M24 | **Recordatorios de sesión** | Próximas sesiones, notas faltantes, confirmaciones, personalizados | `index.html:337` (campana), `:1507` (drawer) | `session-reminders.js:682` (`initSessionReminders`), `ReminderState` (`:8`) | `localStorage` |
| M25 | **Seguridad de pantalla** | Bloqueo manual y por inactividad (HIPAA) | `index.html:279` (candado) | `app.js:31` (`ClinicalSecurity`), `:42-138`, `:1183` (firma del terapeuta) | `sessionStorage.psico_session_locked` |
| M26 | **Sync nube multi-dispositivo** | Push/pull de datos, fusión, estado | `index.html:328` (botón nube) | `app.js:321` (`CloudSyncManager`), `:470` (`pushToCloud`), `:4040` (`syncPortalDataForPatient`) | `GET/POST /api/v1/clinical/sync` (`server.js:954,979`) |

### 1.2 Capa servidor

| ID | Módulo | Propósito | Entrada | Notas |
|---|---|---|---|---|
| M27 | **API Gateway** | 28 rutas `/api/v1/*` (auth, portal, patients, billing, audit, telehealth, IA, sync) | `server.js:277-1007` | `requireTherapistAuth` HMAC (`server.js:80`), CORS whitelist (`:142`), rate limit (`:296`), firewall de archivos (`:236-252`) |
| M28 | **Persistencia** | Doble motor: PostgreSQL (`DATABASE_URL`) o JSON embebido | `db.js:1-861`, `schema.sql` | Hoy corre en motor embebido (`/api/health` → `Embedded Relational Engine`) |
| M29 | **PWA / Service Worker** | Caché del shell, exclusión de API | `sw.js:1-76`, registro en `index.html:1931-1936` | `manifest.json`, iconos |

### 1.3 Portal del paciente (`portal.html`, 24.908 B)

Un solo `<script src="portal.js">`; vistas internas por `data-view` propio (inicio, tareas, ánimo, ABC, escalas, crisis, botiquín). Punto de entrada del terapeuta: `app.js:3664` → `:3913` (`launchPatientPortal`), QR en `:3957`.

---

## 2. Inventario funcional con criterio de aceptación verificable

Notación: **ID** · funcionalidad esperada · **criterio de aceptación** (lo que QA debe poder observar). La columna *Impl.* indica si PM encontró implementación detectable: ✅ sí · ⚠️ parcial · ❓ no localizada.

### M01 — Boot y Auth (8)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-01 | Registro de terapeuta | Completar `registerForm` con nombre, especialidad, colegiatura, email y contraseña → aparece el dashboard con el nombre en `#sidebarUserName`; recargar mantiene la sesión | ✅ |
| F-02 | Login | Credenciales válidas → dashboard en <2 s; `localStorage.psico_session` y `psico_session_token` presentes | ✅ |
| F-03 | Rechazo de credenciales inválidas | Contraseña errónea → mensaje de error visible en `#loginError`, sin entrar al dashboard, sin excepción en consola | ✅ |
| F-04 | Logout | Clic en salir → vuelve a `#authScreen`; `psico_session`, `psico_session_token` y datos en memoria limpios | ✅ |
| F-05 | Recuperación por PIN de 6 dígitos | Solicitar código → la respuesta HTTP **no** contiene el código → ingresar PIN + nueva clave → login con la nueva clave y la anterior rechazada | ✅ |
| F-06 | Persistencia de sesión | Recargar (F5) con sesión activa → dashboard directo, sin pedir credenciales | ✅ |
| F-07 | Perfil profesional y firma | Guardar nombre/especialidad/colegiatura/teléfono/institución y dibujar la firma → el membrete de los PDF de informes muestra esos datos y la firma | ✅ |
| F-08 | Bloqueo por inactividad (15 min) | Con `ClinicalSecurity` activo, tras el umbral aparece overlay de bloqueo; al desbloquear se restaura la vista previa | ⚠️ |

### M02 — Shell y navegación (7)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-09 | Navegación de 9 vistas | Clic en cada item del sidebar → cambia el contenido, el item queda `.active` y el breadcrumb dice el título correcto | ✅ |
| F-10 | Drawer móvil | En viewport <768 px, botón hamburguesa abre sidebar con backdrop; clic en backdrop lo cierra | ✅ |
| F-11 | Bottom-nav móvil | Los 4 items inferiores cambian de vista y sincronizan el `.active` del sidebar | ✅ |
| F-12 | Atajos de teclado | `1..6` navegan a las vistas mapeadas, `b` va a Búsqueda y enfoca el input, `g+d` va a dashboard (sin disparar dentro de un textarea) | ⚠️ |
| F-13 | Tema claro/oscuro | Alternar y recargar → la preferencia persiste | ✅ |
| F-14 | Badges de conteo | `#patientCount`, `#appointmentCount`, `#notesCount` coinciden con la cantidad real de registros tras crear/borrar | ✅ |
| F-15 | Estado de sync | El botón de nube muestra "Nube al día"/"Sincronizando"/"Sin conexión" y refleja un fallo de red | ✅ |

### M03 — Dashboard (9)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-16 | KPIs de consulta | Pacientes activos, sesiones de hoy e ingresos del mes coinciden con los datos sembrados | ✅ |
| F-17 | Panel de alertas clínicas | Con una nota de riesgo alto sembrada, aparece la alerta y al hacer clic abre el expediente del paciente correcto | ✅ |
| F-18 | Pacientes prioritarios | Lista ordenada por prioridad (riesgo, PHQ-9 ≥19, >21 días sin sesión) | ✅ |
| F-19 | Widget de recordatorios | Muestra próximas sesiones y notas faltantes; el badge de la campana coincide con el número del drawer | ✅ |
| F-20 | Recordatorio personalizado | Crear recordatorio (título, paciente, fecha, prioridad) → aparece en el drawer y persiste tras recargar | ✅ |
| F-21 | Banner de crisis en vivo | Un SOS registrado se ve como banner y "Atender crisis" abre el protocolo del paciente | ⚠️ (mismo navegador, ver PF-01) |
| F-22 | Mini gráficos de tendencia | Los gráficos del dashboard renderizan con datos y no quedan vacíos | ⚠️ |
| F-23 | Agenda del día | La lista de citas de hoy refleja `AppState.appointments` y al hacer clic abre la cita | ✅ |
| F-24 | Bienestar promedio | El indicador de ánimo coincide con el promedio de las últimas notas | ✅ |

### M04 — Pacientes y expediente (10)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-25 | Alta de paciente por etapa vital | Al elegir fecha de nacimiento, la categoría (niño/adolescente/adulto) se infiere y se muestran/ocultan los bloques condicionales | ✅ |
| F-26 | Validación de obligatorios | Guardar sin nombre o sin fecha → bloqueo con mensaje, sin crear registro a medias | ✅ |
| F-27 | Edición sin pérdida de datos | Abrir un paciente con diagnóstico, medicación y notas cargados, guardar sin tocar nada y reabrir → **los tres campos siguen iguales** | ❓ (ver PF-02) |
| F-28 | Filtro por etapa y búsqueda | Buscar por nombre, colegio, tutor, teléfono o diagnóstico → la lista se filtra sin perder pacientes | ⚠️ (diagnóstico nunca cargado, PF-02) |
| F-29 | Expediente con pestañas | Las 8 pestañas (Resumen, Notas, Historia, Timeline, Objetivos, Escalas, Apoyo, Portal) renderizan contenido real y no una excepción de consola | ✅ |
| F-30 | Ficha rápida de estatus | Estatus (activo/en pausa/alta), fecha de ingreso, egreso e intervención visibles y con color por estatus | ✅ |
| F-31 | Cambio rápido de estatus | Cambiar estatus desde la lista actualiza la ficha y persiste tras recargar | ✅ |
| F-32 | Baja de paciente | Eliminar pide confirmación y no deja notas/citas huérfanas visibles | ⚠️ |
| F-33 | Token de portal automático | Al crear paciente se genera `portalToken` con formato `PN-XXXXXXXX` y queda usable en el portal | ✅ (ver §6 R-05 por entropía) |
| F-34 | Informe del paciente | Botón de exportación abre una ventana con datos del paciente, plan y notas y dispara impresión | ✅ |

### M05 — Historia clínica (10)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-35 | Editor de historia completo | Abrir editor desde el expediente → secciones por etapa, acordeones desplegables y pestañas del editor funcionando | ✅ |
| F-36 | Guardar historia | Guardar → el tab Historia del expediente muestra los datos y sobreviven a recargar | ✅ |
| F-37 | Genograma | Abrir modal de genograma, cargar familiares y guardar → se recupera al reabrir | ✅ |
| F-38 | Pre-consulta in-app | "Llenar Pre-consulta" abre formulario interno, guarda directo al expediente del paciente, sin redirección a Google Forms | ✅ |
| F-39 | Link de pre-consulta | Generar y copiar link / mensaje de WhatsApp con el enlace correcto | ⚠️ |
| F-40 | Importar Google Forms | Pegar respuestas tabuladas → parser mapea campos a la historia y permite guardar | ⚠️ |
| F-41 | PDF de historia oficial | Exportar → PDF con membrete, colegiatura y datos completos; sin caracteres corruptos | ✅ |
| F-42 | PDF de hoja de evolución | Exportar nota existente → PDF con la hoja protocolizada | ✅ |
| F-43 | Consentimiento reflejado | Consentimiento parental/asentimiento firmado se muestra como "Firmado" en la ficha y en el PDF de historia | ⚠️ |
| F-44 | Inferencia de etapa vital | Fechas de nacimiento límite (<12, 12-17, ≥18) mapean a la etapa correcta | ✅ |

### M06 — Reportes de Atención / SOAP (12)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-45 | Crear reporte de atención | Completar el formulario completo (sesión N, objetivos, técnicas, descripción, hallazgos, resultados, plan, riesgo, ánimo) → se guarda y aparece en la lista | ✅ |
| F-46 | Formato dual SOAP ↔ reporte | Cambiar de formato conserva el texto ya escrito en ambos sentidos | ⚠️ |
| F-47 | Plantillas SOAP | Aplicar una plantilla rellena los 4 bloques con texto clínico coherente | ✅ |
| F-48 | Firma de nota | Firmar → badge "Firmado", `signedBy`/`signedAt`/`signedRegistry` poblados y visibles en el PDF | ✅ |
| F-49 | Inmutabilidad + adendum | Editar una nota firmada y guardar → el contenido original no cambia; el cambio queda como adendum fechado y atribuido | ✅ |
| F-50 | Borrador y recuperación | Escribir y cerrar sin guardar → al reabrir aparece banner de recuperación con el texto; descartar lo borra | ⚠️ (`checkNoteDraft` no existe, `app.js:1870`) |
| F-51 | Tareas intersesión | Agregar tareas en la nota → se listan en el expediente y llegan al portal | ⚠️ |
| F-52 | Editar / eliminar nota | Editar precarga la nota; eliminar pide confirmación y desaparece de la lista y del dashboard | ✅ |
| F-53 | Lista y filtro de notas | Buscar por título/paciente/contenido filtra en vivo; los badges de estado son correctos | ✅ |
| F-54 | Evolucionar desde cita | Desde una cita, "Evolucionar" abre la nota con paciente, fecha y número de sesión prellenados | ⚠️ (el campo `noteSessionNumber` no existe, `app.js:1868`) |
| F-55 | PDF de nota | Exportar la nota a PDF con membrete y firma del terapeuta | ✅ |
| F-56 | Escala adjunta a la nota | Aplicar una escala y guardarla → el resultado queda asociado a la nota del día | ✅ |

### M07 — Escalas (8)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-57 | Catálogo de escalas | La vista Escalas lista las escalas disponibles y permite elegir paciente | ✅ |
| F-58 | Aplicación y scoring | Responder PHQ-9 → puntaje exacto 0-27 y categoría correcta; GAD-7 → 0-21 | ✅ |
| F-59 | Detección de riesgo | PHQ-9 con ítem 9 > 0 → flag de riesgo y oferta de abrir protocolo de crisis | ✅ |
| F-60 | Historial y gráfico longitudinal | Aplicar 2+ veces → el gráfico muestra la serie por fecha | ⚠️ |
| F-61 | Resultado en expediente | El resultado aparece en el tab Escalas y en la nota | ✅ |
| F-62 | Escalas personalizadas | Crear escala en el editor → queda disponible para aplicar | ⚠️ |
| F-63 | Escala respondida desde el portal | El paciente responde en su portal → el resultado aparece en el expediente del terapeuta | ❓ (ver PF-07) |
| F-64 | Imprimir resultado | Exportar resultado de escala a PDF/impresión | ✅ |

### M08 — Agenda (10)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-65 | Crear cita | Alta con paciente, fecha, hora, duración, tipo y modalidad → aparece en la grilla de la vista activa | ✅ |
| F-66 | Cuatro vistas de calendario | Día / Semana / Mes / Año conmutan sin perder la fecha seleccionada | ✅ |
| F-67 | Clic en slot | Clic en un hueco del calendario abre el modal con fecha y hora prellenadas | ✅ |
| F-68 | Estados de cita | Pendiente/confirmada/completada/cancelada/no asistió se reflejan con color y se persisten | ✅ |
| F-69 | Completar cita | "Completar" cambia estado y ofrece crear la nota de evolución | ✅ |
| F-70 | Borrar cita | Confirmación + desaparece de todas las vistas | ✅ |
| F-71 | Sugerencia de slots | Botón de sugerencia propone horarios libres coherentes | ⚠️ |
| F-72 | Google Calendar / ICS | Descargar `.ics` abre en calendario y contiene paciente, fecha y sala correctos | ✅ |
| F-73 | Detección de solapamientos | Crear dos citas en el mismo horario → advertencia o bloqueo | ❓ |
| F-74 | Recordatorio de cita | La cita de hoy genera recordatorio en el drawer y badge | ✅ |

### M09 — Finanzas (7)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-75 | Registrar transacción | Ingreso/egreso con concepto, monto, categoría, fecha → aparece en el listado y en el balance | ✅ |
| F-76 | Categorías editables | Crear/renombrar categoría → disponible en el selector de transacción | ✅ |
| F-77 | Tarifas por tipo | Definir tarifa y tarifa por defecto → se usa al facturar/registrar | ⚠️ |
| F-78 | Metas mensuales | Fijar meta de monto → barra de progreso coherente con los ingresos del mes | ✅ |
| F-79 | Balance del período | El balance suma y resta correctamente y coincide con el detalle | ✅ |
| F-80 | Aislamiento por terapeuta | Con dos usuarios en el mismo navegador, cada uno ve solo sus finanzas | ✅ (claves por `userId`) |
| F-81 | Exportar resumen | Exportación/impresión del resumen financiero | ⚠️ |

### M10 — Facturación SENIAT (8)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-82 | Configuración fiscal | Guardar razón social, RIF, dirección, teléfono, prefijo y próximo número → persiste y se usa en la factura | ✅ |
| F-83 | Emitir factura | Seleccionar paciente → autocompleta nombre/RIF → concepto y monto → se genera número `PREFIJO000001` | ✅ |
| F-84 | IVA / IGTF | Honorarios exentos de IVA; IGTF 3% **solo** si el método es USD → total correcto | ✅ |
| F-85 | Numeración correlativa | Dos facturas seguidas → números consecutivos, sin repetir, incluso tras recargar | ⚠️ (localStorage por usuario; ver §6 R-07) |
| F-86 | Lista y reimpresión | Listar facturas, reimprimir una y eliminar con confirmación | ✅ |
| F-87 | Impresión legal | La factura impresa incluye membrete, RIF, número, desglose y leyenda de exención de IVA | ✅ |
| F-88 | Persistencia en servidor | Emitir factura con sesión activa → `GET /api/v1/billing/invoices` la devuelve | ❓ |
| F-89 | Totales del período | Suma facturada del período coincide con la lista | ⚠️ |

### M11-M12 — Búsqueda y Métricas (5)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-90 | Búsqueda global | Escribir un nombre → resultados agrupados (pacientes/notas/citas) en <300 ms | ✅ |
| F-91 | Abrir resultado | Clic en resultado de paciente abre expediente; en nota, abre la nota | ✅ |
| F-92 | Métricas de consulta | Totales de pacientes, sesiones y distribución por etapa coinciden con los datos | ✅ |
| F-93 | Epidemiología | Distribución diagnóstica y remisión PHQ-9/GAD-7 calculadas sobre notas reales | ⚠️ (depende de `diagnosis`, PF-02) |
| F-94 | Filtros de período | Cambiar el rango recalcula todas las métricas | ⚠️ |

### M13-M17 — IA, PHI, voz, psicoeducación, vademécum (11)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-95 | Configurar API key de IA | Guardar clave en `apiKeyModal` → persiste y `hasKey()` es verdadero | ✅ |
| F-96 | Copiloto contextual | Con un paciente seleccionado, preguntar → respuesta con contexto del paciente | ⚠️ (requiere clave propia) |
| F-97 | SOAP desde apuntes | Pegar apuntes → devuelve JSON con `subjetivo/objetivo/analisis/plan` y se aplica al formulario | ⚠️ |
| F-98 | Hipótesis diagnóstica | Generar hipótesis DSM-5-TR/CIE-11 con fundamento y sin inventar datos del paciente | ⚠️ |
| F-99 | Psicoeducación por IA | Generar ficha personalizada para el paciente | ⚠️ |
| F-100 | Error controlado sin clave/cuota | Sin clave o con 429 → mensaje claro al usuario, sin excepción no capturada, sin perder lo escrito | ⚠️ |
| F-101 | Anonimización PHI | El texto enviado al LLM no contiene nombre, teléfono, email ni documento; al volver se restauran | ✅ (función pura) |
| F-102 | Dictado por voz | Permiso de micrófono, transcripción que se inserta en el campo activo, y degradación si el navegador no soporta Web Speech | ⚠️ |
| F-103 | Hojas de trabajo | Abrir hoja TCC/ACT/DBT, completarla y guardarla | ✅ |
| F-104 | Asignar hoja al portal | Enviar hoja → aparece como tarea en el portal del paciente | ⚠️ (ver PF-08) |
| F-105 | Vademécum | Buscar "sertralina" → dosis, indicaciones y advertencia de no sustituir criterio médico | ✅ |

### M18 — Protocolo de crisis (6)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-106 | C-SSRS interactivo | Responder los ítems → nivel de riesgo y recomendación coherentes | ✅ |
| F-107 | Directorio localizado | Muestra teléfonos de emergencia de Venezuela con horarios | ✅ |
| F-108 | Registro de actuación | Cargar acciones tomadas, referido y seguimiento → se persisten | ✅ |
| F-109 | Cierre con registro | Cerrar el protocolo deja rastro en el expediente y en las alertas | ⚠️ |
| F-110 | SOS del portal visible y reconocible | Un SOS enviado desde **otro dispositivo** aparece en el dashboard y puede reconocerse (ACK) | ❓ (PF-01) |
| F-111 | Acceso desde alertas | Alerta de escala/nota abre el protocolo con el paciente precargado | ✅ |

### M19 — Consentimiento informado (5)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-112 | Texto por etapa vital | El modal muestra el documento de adulto, parental (niño) o adolescente según el paciente | ✅ |
| F-113 | Firma táctil | Dibujar en el canvas y guardar → se embebe la imagen en el PDF | ✅ |
| F-114 | Persistencia en expediente | Tras firmar, el expediente indica consentimiento firmado con fecha y firmante, y sobrevive a recargar | ✅ |
| F-115 | PDF oficial firmado | PDF con cláusulas, firma, profesional y fecha; sin datos faltantes | ✅ |
| F-116 | Consentimiento firmado en el portal | El paciente firma en su móvil → el terapeuta ve el consentimiento firmado en el expediente | ❓ (PF-09) |

### M20 — Portal del paciente (9)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-117 | Acceso con token | Abrir `portal.html?token=PN-XXXXXXXX` → entra directo sin pedir PIN, sin exponer datos de otros pacientes | ✅ |
| F-118 | Login por PIN | Sin token en URL, ingresar token/PIN a mano → entra y la sesión persiste | ✅ |
| F-119 | Tareas | Ver tareas asignadas y marcarlas completadas → el estado se conserva al recargar | ⚠️ |
| F-120 | Registro de ánimo | Registrar ánimo → confirmación visible y aparece en el historial | ✅ |
| F-121 | Autoregistro ABC | Guardar situación, creencia y emoción (0-100%) → se recupera al reabrir | ⚠️ |
| F-122 | Autoevaluaciones | Responder PHQ-9/GAD-7 en el portal → resultado visible para el terapeuta | ❓ (PF-07) |
| F-123 | Botón SOS | Pulsar SOS → confirmación + líneas de emergencia + alerta para el terapeuta | ⚠️ (alerta no llega, PF-01) |
| F-124 | Botiquín de calma | Ejercicios 4-7-8 y 5-4-3-2-1 ejecutables con temporizador | ✅ |
| F-125 | Modo offline | Sin red, la acción se encola y se envía al recuperar conexión | ✅ (`PortalOfflineQueue`, `portal.js:94`) |

### M21-M26 — Teleconsulta, informes, backup, recordatorios, seguridad, sync (12)

| ID | Funcionalidad | Criterio de aceptación verificable | Impl. |
|---|---|---|---|
| F-126 | Teleconsulta operativa | Abrir teleconsulta → sala de video funcional, con nombre de sala no adivinable desde fuera | ⚠️ (PF-06) |
| F-127 | Link y transferencia | Copiar link y transferir apuntes a la nota SOAP del paciente correcto | ✅ |
| F-128 | Info oficial | Generar epicrisis/derivación con membrete, firma y formato imprimible | ✅ |
| F-129 | QR de autenticidad | Escanear el QR del informe → abre una página que **verifica** el código | ❓ (PF-05) |
| F-130 | Backup export | Descargar JSON con pacientes, citas, notas, planes y usuario | ✅ |
| F-131 | Backup import | Restaurar en navegador limpio → los datos quedan idénticos; archivo inválido se rechaza sin corromper | ⚠️ |
| F-132 | Recordatorios: filtros | Los filtros del drawer (todas, sin nota, por empezar, sin confirmar, custom) devuelven conjuntos coherentes | ✅ |
| F-133 | Recordatorios: posponer/descartar | Posponer un recordatorio lo oculta por el tiempo indicado y no reaparece antes | ✅ |
| F-134 | Bloqueo manual | `ClinicalSecurity.lockApp()` bloquea y exige credencial/PIN para volver | ✅ |
| F-135 | Sync push | Tras un cambio, el estado pasa a "sincronizando" y luego "al día" | ✅ |
| F-136 | Sync pull / fusión | Abrir el mismo usuario en dos navegadores → ambos ven los mismos pacientes sin duplicados | ⚠️ |
| F-137 | Reintento en 401/403 | Token vencido → refresca sesión, reintenta, no pierde el cambio | ✅ |

**Total inventariado: 137 funcionalidades** en 26 módulos de cliente + API + persistencia + PWA.

---

## 3. 18 flujos críticos end-to-end (guion para QA)

Formato: **ID — nombre** · pasos · resultado esperado · impacto si falla (clínico `C`, legal `L`, negocio `N`).

| ID | Flujo | Pasos | Resultado esperado | Impacto si falla |
|---|---|---|---|---|
| **E2E-01** | Alta de terapeuta → login → dashboard | Registro completo → logout → login con las mismas credenciales → recargar | Dashboard operativo; sesión persistente; nombre y colegiatura en sidebar | N (no se puede usar el producto) |
| **E2E-02** | Alta de paciente → expediente → historia → reapertura | Crear paciente adulto → abrir expediente → llenar historia clínica → guardar → cerrar sesión → volver a entrar → reabrir | Todos los campos de la historia intactos; diagnóstico y medicación **no** alterados | C+L (pérdida de expediente) |
| **E2E-03** | Cita → evolución → firma → PDF | Crear cita de hoy → "Completar" → "Evolucionar" → redactar SOAP → firmar → PDF | Nota firmada, sesión correlativa correcta, PDF con firma y membrete | C+L (documento clínico inimpugnable) |
| **E2E-04** | PHQ-9 con riesgo → protocolo de crisis | Aplicar PHQ-9 con ítem 9 = 2 → aceptar alerta de riesgo → recorrer C-SSRS → registrar actuación → cerrar | Protocolo abre con el paciente correcto, registra acciones y queda huella en el expediente | C+L (responsabilidad por omisión) |
| **E2E-05** | Consentimiento informado con firma | Abrir consentimiento de un paciente niño → revisar cláusulas → firmar en canvas → guardar → imprimir → reabrir expediente | PDF firmado; expediente marca "Firmado" con fecha; sobrevive a recarga | L (consentimiento inválido) |
| **E2E-06** | Portal: token → otro dispositivo → SOS → alerta al terapeuta | Generar/copiar token → abrir portal en **otro navegador o móvil** → entrar → registrar ánimo → enviar SOS → volver a la app del terapeuta | El terapeuta ve la alerta, la reconoce y abre el protocolo del paciente | C+L (el flujo estrella del producto) |
| **E2E-07** | Factura fiscal SENIAT | Configurar RIF/prefijo/numeración → emitir factura USD → verificar IGTF 3% → emitir segunda factura → reimprimir | Números correlativos, totales correctos, impresión con leyenda legal | N+L (incumplimiento fiscal) |
| **E2E-08** | Finanzas → balance → metas | Registrar 3 ingresos y 1 egreso → crear categoría → fijar meta mensual | Balance exacto y progreso de meta coherente | N |
| **E2E-09** | IA SOAP con anonimización | Pegar apuntes con nombre y teléfono → sintetizar SOAP → aplicar al formulario | JSON SOAP válido; sin PHI en el prompt; error claro si no hay clave | C+L (fuga de PHI si no anonimiza) |
| **E2E-10** | Búsqueda global | Buscar apellido → abrir resultado de paciente → volver → abrir resultado de nota | Resultados correctos y navegación sin perder la búsqueda | N |
| **E2E-11** | Métricas y epidemiología | Con datos sembrados, abrir Métricas → cambiar período | Totales exactos; distribución diagnóstica no vacía | N (decisiones clínicas) |
| **E2E-12** | Backup y restauración | Exportar backup → borrar datos del navegador → importar el archivo | Datos restaurados 1:1 (pacientes, notas firmadas, firmas, config fiscal) | C+L+N |
| **E2E-13** | Multidispositivo (PC ↔ móvil) | Login en navegador A → crear paciente → login en navegador B → recargar ambos | Mismo conjunto de pacientes, sin duplicados ni pérdida; estado "al día" | N+C |
| **E2E-14** | Teleconsulta | Abrir teleconsulta de un paciente → copiar link → unirse desde otro dispositivo → transferir apuntes a SOAP | Video operativo, sala inaccesible para terceros, notas en la nota correcta | C+L (intimidad de la sesión) |
| **E2E-15** | Psicoeducación → portal → devolución | Abrir hoja TCC → asignar al portal → entrar al portal del paciente → completarla | La hoja aparece como tarea y la respuesta vuelve al terapeuta | C |
| **E2E-16** | Informe oficial → verificación por QR | Generar epicrisis con firma → escanear el QR → abrir la URL | Página que confirma la autenticidad del documento | L (documento falsificable) |
| **E2E-17** | Recuperación de contraseña | Solicitar código → verificar que la respuesta no lo expone → ingresar PIN → nueva clave → login | Flujo completo; PIN vence; la clave vieja deja de servir | N+L (secuestro de cuenta) |
| **E2E-18** | Bloqueo por inactividad y logout | Dejar la app inactiva el umbral → intentar operar → desbloquear → logout | Pantalla bloqueada, sin acceso a PHI, restauración limpia | L (HIPAA/confidencialidad) |

### 3.1 Prioridad sugerida de ejecución QA

1. **Semana 1 (bloqueantes):** E2E-01, E2E-02, E2E-03, E2E-05, E2E-17.
2. **Semana 1 (seguridad/PHI):** E2E-06, E2E-14, E2E-18 + verificación de `/data/psiconotes_relational.json` (§6 R-01).
3. **Semana 2 (negocio):** E2E-07, E2E-12, E2E-13.
4. **Semana 2 (clínicos secundarios):** E2E-04, E2E-09, E2E-15, E2E-16.
5. **Semana 3:** E2E-08, E2E-10, E2E-11.

---

## 4. Features fantasma detectadas por PM-01

Criterio de inclusión: la funcionalidad está **prometida** en `index.html`, `arquitectura.md`, `plan_pruebas.md` o en la cabecera de un módulo, y **no tiene implementación real** o no tiene ningún consumidor. Cada fila incluye evidencia y confianza. **Todas estas filas son hallazgos propios de este documento; FE/BE/QA deben confirmarlos o refutarlos con reproducción.**

### 4.1 Tabla de features fantasma

| ID | Feature prometida | Dónde se promete | Evidencia de que no existe / no está conectada | Confianza |
|---|---|---|---|---|
| **PF-01** | Alerta **SOS en vivo** del portal visible en el dashboard del terapeuta (multi-dispositivo) | `arquitectura.md:763+` (Fase 6), `plan_pruebas.md:36` (TC-POR-02), `plan_pruebas.md:74` (TC-SEC-09) | `app.js:1641` lee `db.localStore.crisis_alerts` pero **`db.js` no se carga en el navegador** (`index.html:1918-1930` no lo incluye). `app.js:6546` (`checkPortalCrisisAlerts`) solo lee `localStorage['psico_portal_data_<id>']` del **mismo** navegador. El endpoint `GET /api/v1/portal/crisis-alerts` (`server.js:493`) **no tiene ningún `fetch` en el frontend** (verificado por grep en los 11 JS del cliente). La API existe; el terapeuta nunca la llama | **Alta** |
| **PF-02** | Campo de **diagnóstico clínico** del paciente | `index.html:509` (placeholder "Buscar por nombre, diagnóstico…"), `arquitectura.md:2140+` (ficha rápida), `reports.js:105,185` | `app.js:2320-2327` lee `#patientDiagnosis`, `#patientDiagnosis2`, `#patientMedication`, `#patientMedical`, `#patientFamilyHistory`, `#patientNotes`, `#patientEmergency`, `#patientEmergencyRelation`, `#patientSchoolName`, `#patientDevelopmentalMilestones`: **los 10 ids no existen** en `index.html` ni se generan dinámicamente (cruce de 343 `getElementById` vs 656 ids). `historia-clinica.js` no contiene la cadena "diagnosis/diagnóstico" (0 coincidencias). Resultado: `diagnosis` siempre vale el literal por defecto de `app.js:2320` y **cada edición lo reescribe**; los informes imprimen "En proceso de formulación clínica" (`reports.js:105`) y la búsqueda por diagnóstico (`app.js:2197`) nunca coincide | **Alta** |
| **PF-03** | **Proxy seguro de Gemini** en el servidor (la llave no debe estar en el navegador) | `server.js:3`, `server.js:616` (`POST /api/v1/clinical/soap-synthesize`), `arquitectura.md:207+` (contratos), `/api/health` lo anuncia como feature (`server.js:285`) | El endpoint **no tiene consumidor**: la IA llama directo a `https://generativelanguage.googleapis.com/...?key=${this.apiKey}` desde el navegador (`ai-clinical.js:77`) con la clave que el usuario pega en `#geminiApiKeyInput` (`index.html:1619`) y se guarda en `localStorage` (`ai-clinical.js:36`). Sin `.env` no hay `GEMINI_API_KEY`, por lo que el proxy está muerto y **todas las funciones de IA fallan** con "API Key no configurada" (`ai-clinical.js:48`) en una instalación nueva | **Alta** |
| **PF-04** | **Verificación por QR** de autenticidad de informes (TC-REP-01) | `plan_pruebas.md:57`, `arquitectura.md:964`, `reports.js:213-216` | El QR apunta a `portal.html?cert=PNC-XXXX-YYYY` (`reports.js:142-143`) pero `portal.js` solo entiende `token` y `code` (`portal.js:200-201`); no hay endpoint de verificación en `server.js` (28 rutas, ninguna `verify/cert`). El QR abre el portal de login: **no verifica nada** | **Alta** |
| **PF-05** | **Trazabilidad de firma con IP, fecha y hash** del consentimiento (TC-CON-01) | `plan_pruebas.md:58` ("Trazabilidad de firma, IP, fecha y términos legales"), `arquitectura.md:930+` | `consentimiento.js:249-257` persiste `signedAt`, firmante, categoría y la imagen, pero **no IP**, no `userAgent`, no hash del documento, y **no existe endpoint** que registre el consentimiento en el servidor. Queda solo en `AppState.patients[].informedConsent` del navegador | **Alta** (evidencia de ausencia de IP/hash y de endpoint) |
| **PF-06** | **Teleconsulta cifrada con salas de alta entropía (192 bits)** | `plan_pruebas.md:77` (TC-SEC-12), `server.js:663` (`POST /api/v1/telehealth/session`), `index.html:331` ("Teleconsulta Cifrada") | El frontend **no llama** al endpoint: la sala se construye en el cliente como `https://meet.jit.si/psiconotes-clinical-${Date.now() o appointmentId}` (`app.js:6482-6483`), es decir **sala pública de un servicio de terceros con nombre predecible**. `server.js:663` no tiene consumidor | **Alta** |
| **PF-07** | Consolidación en el servidor de **tareas, autoregistro ABC, ánimo y autoevaluaciones** del portal | `plan_pruebas.md:51` (TC-DB-02), `server.js:355,375,395,417,470` | Implementados: `POST /portal/mood`, `/portal/cbt`, `/portal/tasks/:id/toggle`, `/portal/evaluations`, `GET /portal/data/:patientId`. `portal.js` solo consume `auth`, `crisis`, `mood` y `me`: **`tasks/toggle`, `cbt`, `evaluations`, `data` no tienen `fetch` en el frontend**. Tareas y ABC viven en `localStorage` (`portal.js:469-480`, `psychoed.js:369-382`) | **Alta** |
| **PF-07b** | Inventario de rutas huérfanas (12 de 28) | `server.js` | Sin ningún consumidor en el cliente: `GET /api/v1/patients` (`:602`), `GET /portal/data/:patientId` (`:470`), `GET /portal/crisis-alerts` (`:493`), `POST /portal/crisis-alerts/ack/:id` (`:516`), `POST /portal/tasks/:id/toggle` (`:395`), `POST /portal/evaluations` (`:417`), `POST /portal/cbt` (`:375`), `POST /sync/push` (`:717`), `GET /sync/pull/:userId` (`:735`), `POST /telehealth/session` (`:663`), `GET /audit/logs` (`:933`), `POST /clinical/soap-synthesize` (`:616`) | **Alta** |
| **PF-08** | Asignación de **psicoeducación y tareas al portal del paciente** de forma remota | `index.html:252`, `psychoed.js:3` ("asignación directa al portal"), `app.js:5670` (`saveTasksForPortal`) | La asignación escribe `localStorage['psico_portal_data_<patientId>']` (`psychoed.js:369-382`) que solo existe en el navegador del terapeuta. En otro dispositivo el paciente no ve la tarea | **Alta** |
| **PF-09** | **Firma del consentimiento en el móvil del paciente** desde el portal | `arquitectura.md:968` ("Firma Digital Móvil del Consentimiento Informado en el Portal") | Existe la UI en `portal.js:1495+`, pero el resultado se guarda en `localStorage['psico_portal_consent_<patientId>']` (`portal.js:1504`), **sin llamada a la API**; el terapeuta no lo recibe y `GET /portal/data/:patientId` no lo devuelve | **Alta** |
| **PF-10** | **Buzón de sincronización Zero-Knowledge persistente** | `plan_pruebas.md:79` (TC-SEC-14), `/api/health` feature `zero-knowledge-sync` (`server.js:284`), `server.js:717-750` | `const syncedStorage = new Map()` (`server.js:272`): almacenamiento **en memoria del proceso**. Al reiniciar el servidor se pierde todo; no hay tabla ni archivo. Además `/api/v1/sync/push` y `/api/v1/sync/pull/:userId` **no tienen consumidor** en el frontend (la app usa `clinical/sync`) | **Alta** |
| **PF-11** | **Auditoría de accesos consultable** desde la aplicación | `arquitectura.md:933` (`GET /api/v1/audit/logs`), `server.js:933` | Endpoint implementado; **ninguna** vista ni `fetch` lo consume (0 coincidencias de `audit` en los JS/HTML del cliente). La auditoría existe solo en la base | **Alta** |
| **PF-12** | Suite de QA **"en vivo"** dentro de la app (`Tests 100%`) | `index.html:1671` (`qaTestsModal`), `app.js:6616-6640` | `runAutomatedQaTests` depende de `ClinicalTestSuite` (`app.js:6628`); esa clase solo existe en `tests.js` (Node, ~2.700 líneas), que **no se carga en el navegador** (`index.html:1918-1930`). La UI muestra "Error: Suite de pruebas no cargada en el navegador" (`app.js:6638`) | **Alta** |
| **PF-13** | **Diagnóstico secundario** y **antecedentes médicos/familiares** en la ficha | `app.js:3077` ("Diagnóstico Secundario"), `arquitectura.md:2140+` | Mismos ids inexistentes que PF-02 (`#patientDiagnosis2`, `#patientMedical`, `#patientFamilyHistory`): la ficha muestra la etiqueta con contenido vacío u oculto | **Alta** |
| **PF-14** | **Registro de sesión correlativa** desde la cita (UX-003) | `plan_pruebas.md:81` (TC-UX-01) | `app.js:1868-1869` escribe `#noteSessionNumber`, id que no existe; el número se pierde, aunque el título sí se prellena (`app.js:1867`). El "nº de sesión" que se muestra al imprimir depende del cálculo `AppState.notes.length` (`app.js:1855`), no de un correlativo persistido por paciente | **Alta** (evidencia de id huérfano) |

### 4.2 Features fantasma que **no** se confirmaron (descartadas por PM)

Para evitar que los agentes persigan ruido:

- Los **154 handlers `onclick`** de `index.html` resuelven a funciones existentes, salvo `openForgotPasswordUI` / `closeForgotPasswordUI` (definidas dentro de un objeto/closure → requieren confirmación visual, Confianza Media).
- Los **modales construidos por JS** (`fullHistoryModal`, `genogramModal`, `inAppPreconsultaModal`, `crisisModal`, `reportModal`, `psychoedModal`, `vademecumModal`, `consentModal`, `soapAiModal`, `confirmModal`) existen realmente: se crean por `modal.id = '...'` + `innerHTML`. **No son fantasma.**
- Búsqueda global, notas, pacientes y agenda tienen listeners reales (`app.js:1370-1375`), no están "muertos".

### 4.3 Top 5 features fantasma (para el mensaje al dueño)

1. **PF-01 — Alerta SOS del portal**: el paciente pulsa SOS y el terapeuta no se entera (salvo que use el mismo navegador). Es la promesa central de seguridad del producto.
2. **PF-02/PF-13 — Diagnóstico clínico**: no hay dónde cargarlo; todos los informes dicen "En proceso de formulación clínica" y cada edición del paciente lo reescribe.
3. **PF-03 — IA**: el proxy "seguro" del servidor nunca se usa y sin llave pegada a mano **ninguna** función de IA funciona.
4. **PF-05/PF-06 — Teleconsulta "cifrada 192 bits"**: en realidad es una sala pública de Jitsi con nombre predecible.
5. **PF-04 — QR de autenticidad**: el código de los informes no verifica nada.

---

## 5. Rúbrica de severidad, priorización y esfuerzo

### 5.1 Severidad (adaptada a datos clínicos sensibles)

| Nivel | Definición | Ejemplos de disparador | SLA de corrección |
|---|---|---|---|
| **P0 — Crítico** | Exposición, pérdida o falsificación de PHI; bloqueo de un flujo clínico obligatorio; riesgo de daño al paciente; incumplimiento legal/fiscal evidente | Descarga pública de pacientes y `password_hash`; SOS no llega; consentimiento no persiste; nota firmada sobrescribible; pérdida de expediente al editar | **≤72 h, antes de cualquier piloto real** |
| **P1 — Alto** | Función central rota o parcial que obliga a workaround manual y degrada la calidad del registro clínico | Diagnóstico no capturable; IA inoperante por configuración; teleconsulta predecible; sync que pierde registros | **≤2 semanas** |
| **P2 — Medio** | Función secundaria rota o UI inconsistente que no compromete el acto clínico | QR sin verificación; auditoría sin UI; métricas incompletas; borradores que no se recuperan | **≤1 release** |
| **P3 — Bajo** | Ruido, cosmética, código muerto, ids huérfanos sin efecto funcional | `noteObservations` sin efecto; textos desactualizados; `checkNoteDraft` inexistente | **Backlog** |

**Regla de escalado:** un P1 sube a P0 si afecta a: (a) un paciente con `risk: 'alto'` o `alertRisk`, (b) cualquier documento firmado, (c) facturación ya emitida, (d) menores de edad o datos de tutores.

### 5.2 Priorización = Impacto × Probabilidad × Detectabilidad

| | Probabilidad alta | Probabilidad media | Probabilidad baja |
|---|---|---|---|
| **Impacto crítico** | E2E-06, E2E-14, `/data/*.json` → **P0 inmediato** | PF-05, PF-09 → **P0** | PF-10 (pérdida de ZK tras reinicio) → **P1** |
| **Impacto alto** | PF-01, PF-03 → **P0/P1** | PF-02, PF-07 → **P1** | PF-04 → **P2** |
| **Impacto medio** | PF-12, PF-14 → **P2/P3** | PF-11 → **P2** | PF-13 → **P2** |

- **Detectabilidad**: si el usuario no lo nota hasta que es tarde (factura mal numerada, adendum perdido) sube un nivel.
- **Facilidad de reproducción**: si se reproduce en 2 clics sube un nivel; si requiere datos raros, se queda igual pero se documenta.

### 5.3 Esfuerzo (S / M / L)

| Talla | Criterio | Ejemplos esperados |
|---|---|---|
| **S** | ≤2 h, 1 archivo, sin migración de datos | Añadir campo `#patientDiagnosis` al modal + mapear en `handlePatientSubmit`; corregir id huérfano; usar firma real en nota |
| **M** | 0,5-2 días, 2-4 archivos, requiere sincronía FE↔BE | Llamar `GET /portal/crisis-alerts` y pintar banner + ACK; conectar `/portal/tasks/*`; numeración fiscal con validación de duplicados |
| **L** | ≥3 días, cambia contrato o modelo de datos | Persistencia real del buzón ZK; consentimiento firmado en servidor con hash/IP; reescritura de la teleconsulta; unificación de `sync` vs `clinical/sync` |

### 5.4 Plantilla de decisión para el dueño

```
P0 → no usar con pacientes reales hasta corregir (o mitigar: cerrar /data/, no usar SOS, no firmar)
P1 → usable en piloto controlado con workaround documentado
P2 → usable; anotar en manual de uso
P3 → backlog
```

---

## 6. Riesgos regulatorios y de confidencialidad

### 6.1 Hallazgo verificado en esta sesión (fuera del guion, pero crítico)

**R-01 — P0 confirmado: base de datos completa descargable sin autenticación.**

- Evidencia de código: `server.js:255` sirve `express.static(__dirname)` sobre **todo** el proyecto; el firewall de `server.js:236-252` solo bloquea nombres/extensiones de `RESTRICTED_FILES`/`RESTRICTED_EXTS` (`.env`, `.sql`, `.yml`, `.log`, `server.js`, `db.js`, `tests.js`, etc.) — **no** el directorio `data/`.
- Evidencia en vivo (servidor actual en `http://127.0.0.1:4173`):
  - `GET /data/psiconotes_relational.json` → **HTTP 200**, ~547 KB.
  - Contenido (instantánea de esta sesión; el archivo cambia porque otros agentes lo están probando): **124-131 terapeutas** (nombre, email, teléfono, `password_hash`) y **236 pacientes**, con 236 apariciones de `portal_token`.
  - `GET /arquitectura.md` → HTTP 200 (documentación interna expuesta).
  - Contraste: `GET /tests.js` → HTTP 403, `GET /revision/` → 404 (el firewall sí bloquea algunos nombres).
- **Riesgo:** exfiltración masiva de PHI + toma de cuentas de terapeutas (los `portal_token` permiten entrar a portales de pacientes con `?token=`).
- **Mitigación inmediata (S, sin tocar la app):** mover `data/` fuera del árbol servido o añadir `data` a la lista de rutas bloqueadas y confirmar `404`. **Confianza Alta.**

**R-02 — P0: contraseñas con SHA-256 sin sal.**
`app.js:733-737` (`hashPassword`) aplica `crypto.subtle.digest('SHA-256', password)` sin sal ni iteraciones; `db.js:449/496-501` guarda y compara ese valor tal cual. Verificado en vivo: el `password_hash` de **46 de 131** terapeutas del archivo expuesto es exactamente `SHA-256("password")` — es decir, la contraseña es literalmente `password` y el hash se revierte en segundos. **Confianza Alta** (comparación bit a bit realizada en esta sesión) / **Media** en cuanto a si es data de demo sembrada.

**R-03 — Cifrado local con sal fija.** `app.js:244` (`PBKDF2`, `salt: 'psico_salt_v1'`, 100k iteraciones): mejor que nada, pero una sal constante permite atacar todos los dispositivos en paralelo. P1.

**R-04 — PHI en el cliente.** Pacientes, notas y firmas viven en `localStorage` sin cifrado (solo algunos helpers usan AES-GCM). Un equipo compartido en consultorio expone datos entre sesiones. Además `data/psiconotes_relational.json` y la caché del SW (`sw.js:63-74`) pueden almacenar copias. P1.

**R-05 — Token de portal predecible.** `app.js:3655`: `'PN-' + Math.random().toString(36).substr(2,8).toUpperCase()`. `Math.random` no es CSPRNG y 8 caracteres base36 ≈ 41 bits, con rate limit de 5 intentos/15 min (`server.js:296`) por IP. Aceptable contra fuerza bruta remota, débil contra un atacante local que observe el PRNG. Contrasta con el estándar de 192 bits que se autoatribuye el proyecto. P1.

### 6.2 Matriz de riesgos regulatorios

| ID | Riesgo | Estado | Norma / exposición | Nivel |
|---|---|---|---|---|
| RG-01 | Exposición de PHI por estáticos | **Confirmado** | Confidencialidad del acto médico; deontología; leyes de datos | **P0** |
| RG-02 | Consentimiento informado sin trazabilidad verificable (sin IP/hash, solo cliente) | Confirmado (PF-05) | Validez probatoria del consentimiento; menores (LOPNNA) | **P0** |
| RG-03 | Firma de notas sin sello criptográfico ni verificación de autor | Confirmado (PF-04/§4) | Autenticidad documental; peritaje | **P1** |
| RG-04 | Inmutabilidad de nota firmada: la UI la protege, pero el registro vive en `localStorage` manipulable por el propio usuario | Parcial | Cadena de custodia clínica | **P1** |
| RG-05 | Facturación SENIAT: numeración correlativa en `localStorage` por usuario y dispositivo (`adm.js:345,381`) → riesgo de duplicados/huecos al cambiar de equipo | Parcial | Providencia SNAT/2011/0071 y control de numeración | **P1** |
| RG-06 | IGTF 3% aplicado por heurística de string (`adm.js:310`: `method.includes('USD')`) | Parcial | Cálculo fiscal incorrecto si el método cambia de texto | **P1** |
| RG-07 | Retención de historia clínica: no hay política de retención, ni borrado seguro, ni exportación con caducidad | **Ausente** | Retención mínima del expediente y derecho de acceso | **P1** |
| RG-08 | Teleconsulta: tercero público (Jitsi) y sala adivinable; grabación de sesión no controlada | Confirmado (PF-06) | Secreto profesional; consentimiento de teleconsulta | **P0** |
| RG-09 | IA: PHI hacia Google sin proxy ni contrato de tratamiento; el paciente acepta "anonimización" (`consentimiento.js:242`) que depende de `PhiAnonymizer` en cliente | Parcial | Transferencia internacional de datos sensibles | **P1** |
| RG-10 | Auditoría de accesos inexistente en UI y sin retención (`audit_logs` limitado a 500 en `db.js:713`) | Parcial | Trazabilidad de acceso a PHI (HIPAA-like) | **P2** |
| RG-11 | Menores: consentimiento parental y asentimiento existen en UI y PDF, pero `guardianConsent` puede ser sobrescrito por el `<select>` del paciente (`app.js:2303`) | Sospecha (Confianza Media) | LOPNNA / protección de la infancia | **P1** |
| RG-12 | Backup descargable en claro (JSON con PHI sin cifrar) | Confirmado | Custodia de copias de respaldo | **P2** |

---

## 7. Formato único de reporte para FE, BE y QA

### 7.1 Tabla obligatoria (una fila por hallazgo)

| ID | Severidad | Función | Síntoma | Evidencia `archivo:línea` | Causa raíz | Fix | Confianza | Cómo verificar |
|---|---|---|---|---|---|---|---|---|

**Reglas de llenado**

1. **ID**: `FE-###` / `BE-###` / `QA-###` (numeración propia, sin reutilizar). Si el hallazgo nace de este inventario, citar además `PF-xx`/`E2E-xx`.
2. **Severidad**: `P0|P1|P2|P3` según §5.1. **Prohibido** dejar P0 sin SLA explícito.
3. **Función**: módulo y funcionalidad del §2 (`M04/F-27`) — así se cruzan los reportes entre agentes.
4. **Síntoma**: lo observable, en términos del usuario final (*"al guardar el expediente, el diagnóstico vuelve a 'En proceso…'"*), **no** una interpretación técnica.
5. **Evidencia**: `archivo:línea` **existente y verificable**. Si son varias, separar con `;`. Adjuntar el fragmento de ≤3 líneas.
6. **Causa raíz**: el mecanismo, no la consecuencia. Si no se puede probar → escribir `SOSPECHA:` y bajar la confianza.
7. **Fix**: concreto y acotado (archivo + qué cambiar + talla `S/M/L`). Si requiere decisión de producto, marcarlo `DECISIÓN PM`.
8. **Confianza**: `Alta|Media|Baja` con la definición del §0.4.
9. **Cómo verificar**: pasos reproducibles en ≤5 líneas, incluyendo el dato de prueba (paciente/nota/fecha sembrada) y el resultado esperado observable.

### 7.2 Ejemplo completo (patrón a copiar)

| ID | Severidad | Función | Síntoma | Evidencia | Causa raíz | Fix | Confianza | Cómo verificar |
|---|---|---|---|---|---|---|---|---|
| FE-001 | P1 | M04/F-27 Edición de paciente | Al guardar la edición de un paciente, el diagnóstico vuelve a "En proceso de formulación clínica" | `app.js:2320`; `app.js:2394-2422` | `handlePatientSubmit` lee 10 ids que no existen (`#patientDiagnosis`, `#patientNotes`, …), el operador lógico OR aplica el default y sobrescribe `AppState.patients[idx]` | Añadir los campos al `#patientModal` **o** conservar el valor previo (`diagnosis: el?.value ?? existing.diagnosis`) — **S** | Alta | Crear paciente, editarlo sin cambios, reabrir: el diagnóstico debe ser idéntico |

### 7.3 Anexo obligatorio por agente

Cada reporte debe cerrar con:

- **Tabla de cobertura:** qué funcionalidades del §2 tocó, marcando `OK / FALLA / NO PROBADO`.
- **Flujos ejecutados:** `E2E-xx` con resultado y evidencia (captura, log, respuesta HTTP).
- **Bloqueos:** qué no pudo probar y por qué (p. ej. "no hay navegador automatizable").
- **Regresiones potenciales** del fix propuesto.

### 7.4 Protocolo anti-falsos-positivos (especialmente QA)

1. Un hallazgo de UI solo es **P0/P1** si se reprodujo en navegador **dos veces** con datos distintos y quedó registro (log de consola, captura o `curl`).
2. Si el código es inalcanzable por un `typeof x !== 'undefined'` que siempre es falso, **es hallazgo** (aunque no lance error) → reportar como "código muerto con intención funcional".
3. La suite `node tests.js` **no cuenta como verificación de UI**: muchos de sus asserts comparan cadenas del propio código fuente (`tests.js:1384-1396` lee `index.html` y comprueba substrings). Un test verde no prueba que un botón funcione. **Todo hallazgo debe indicar si está cubierto o no por `tests.js` y por qué esa cobertura no basta.**
4. Diferenciar siempre **"no implementado"** de **"implementado pero desconectado"** de **"rompe al ejecutarse"**: son causas raíz distintas y fixes distintos.

---

## 8. Anexos

### 8.1 Cómo se obtuvo la evidencia (reproducible)

```powershell
# Handlers inline vs definiciones JS  → 154 handlers, 2 sin definición detectada
# getElementById vs ids existentes    → 343 refs, 12 ids huérfanos (todos "patient*" + noteObservations/noteSessionNumber)
# Rutas server vs fetch frontend      → 28 rutas, 12 sin consumidor en el cliente
# Estado del servidor (sin detenerlo)
GET http://127.0.0.1:4173/api/health                → 200 Embedded Relational Engine
GET http://127.0.0.1:4173/api/v1/patients           → 401 (correcto)
GET http://127.0.0.1:4173/data/psiconotes_relational.json → 200 (INCIDENTE PF/R-01)
GET http://127.0.0.1:4173/tests.js                  → 403 (correcto)
```

### 8.2 Contradicciones documentación vs realidad (para el dueño)

| Documento afirma | Realidad medida |
|---|---|
| "56/56 pruebas aprobadas (100%)" (`plan_pruebas.md:108,115`) | La suite compara strings del código; no hay un solo test de UI real. La "suite viva" ni existe en el cliente (PF-12) |
| "Proxy seguro de Gemini" (`server.js:3`) | El cliente llama a Google directo con la clave en `localStorage` (PF-03) |
| "Teleconsulta con identificadores de alta entropía 192 bits" (`plan_pruebas.md:77`) | Sala pública `meet.jit.si` con `Date.now()` (PF-06) |
| "QR de autenticidad" (`plan_pruebas.md:57`) | El QR no verifica nada (PF-04) |
| "Buzón cifrado Zero-Knowledge" (`plan_pruebas.md:79`) | `new Map()` en memoria (PF-10) |
| "Alerta SOS en vivo" (`plan_pruebas.md:36`) | Solo mismo navegador (PF-01) |
| "Auditoría de accesos" | Endpoint sin UI (PF-11) |
| `.env.example` con `GEMINI_API_KEY`/`DATABASE_URL` | No existe `.env`; todo corre embebido y sin IA |

### 8.3 Pendientes que PM deriva a cada agente

- **FE (frontend):** PF-02/13 (campos ausentes), PF-01/PF-07/PF-08/PF-09 (conectar API del portal), PF-04/PF-05/PF-06/PF-14, F-46/F-50/F-54/F-63/F-88/F-116/F-129, y todo el cruce de ids huérfanos.
- **BE (backend):** R-01 (exposición `data/`), R-02 (hash), PF-10 (Map en memoria), RG-05/RG-06 (fiscal), PF-03 (proxy IA y llave), endpoints sin consumidor (decidir: eliminar o conectar), rate limit y CORS por recurso.
- **QA (verificación):** los 18 flujos del §3, con foco en E2E-02, E2E-06, E2E-12, E2E-13, E2E-14 y E2E-17; y refutar/confirmar los 15 fantasmas del §4.
- **PM (yo):** consolidar los 3 reportes, deduplicar, priorizar y entregar el plan de corrección al dueño con esfuerzo S/M/L.

### 8.4 Definición de "terminado" de la revisión

La revisión se considera cerrada cuando: (1) los 18 flujos tienen veredicto con evidencia; (2) los 15 fantasmas están confirmados o refutados; (3) R-01 y R-02 están mitigados y verificados; (4) existe un backlog único priorizado P0→P3 con esfuerzo y dueño; (5) el dueño tiene un manual de 1 página con "qué sí se puede usar hoy".

---

*Fin del documento — `revision\01-pm-inventario.md` (PM-01). Este archivo es de solo planificación: no modifica la aplicación.*
