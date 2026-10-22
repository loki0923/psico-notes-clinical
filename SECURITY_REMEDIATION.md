# SECURITY_REMEDIATION.md — Remediación y Hardening de Seguridad Crítica
**Proyecto:** Psico Notes Clinical  
**Versión:** v6.1.0-hardened  
**Fecha:** 21 de Octubre de 2026  
**Responsables:** Arquitecto de Software & Ingeniero de Seguridad de Aplicaciones Web  
**Estado:** Fase 1 Completada y Verificada

---

## 1. Resumen de Remediaciones Implementadas (Fase 1)

En esta fase se han subsanado todos los riesgos críticos (P0) identificados en la Fase 0, garantizando la confidencialidad, integridad y disponibilidad de la información clínica de los pacientes y los datos de acceso de los terapeutas.

| Identificador | Vulnerabilidad Mitigada | Nivel | Archivo Modificado | Estado |
|---|---|---|---|---|
| **SEC-REM-01** | Descarga no autenticada de `data/psiconotes_relacional.json` | **P0 (Crítico)** | `server.js:240-270` | ✅ Resuelto y Verificado (TC-SEC-15) |
| **SEC-REM-02** | Fabricación de contenido clínico falso por IA sin API Key | **P0 (Crítico)** | `server.js:639-650` | ✅ Resuelto y Verificado (TC-SEC-16) |
| **SEC-REM-03** | Fuga BOLA/IDOR para pacientes huérfanos sin `therapist_id` | **P0 (Crítico)** | `db.js:717`, `server.js:494` | ✅ Resuelto y Verificado (TC-SEC-17) |
| **SEC-REM-04** | Bypass de login y fuga de `password_hash` en registro | **P0 (Crítico)** | `server.js:772-815` | ✅ Resuelto y Verificado (TC-SEC-18) |
| **SEC-REM-05** | Destrucción de base de datos por corrupción de escritura | **P0 (Crítico)** | `db.js:14-85` | ✅ Resuelto y Verificado (TC-SEC-19) |
| **SEC-REM-06** | Notas clínicas en texto plano en `localStorage` | **P1 (Alto)** | `app.js:725-730` | ✅ Resuelto y Verificado |
| **SEC-REM-07** | Clave de sesión hardcodeada en producción | **P1 (Alto)** | `server.js:24-35` | ✅ Resuelto y Verificado |
| **SEC-REM-08** | Error de sintaxis en `app.js` bloqueando compilación TS | **P2 (Medio)** | `app.js:988-998` | ✅ Resuelto y Verificado (`tsc --noEmit`) |

---

## 2. Detalle Técnico de los Cambios

### 2.1 Bloqueo Estricto de Descarga de PHI (`server.js`)
- **Problema previo:** `express.static(__dirname)` exponía la carpeta `data/` y no restringía la extensión `.json`.
- **Solución implementada:** Se configuró un cortafuegos en middleware que intercepta toda petición que intente acceder a rutas normalizadas que contengan `/data`, `/revision`, o archivos con extensiones `.json`, `.sql`, `.env`, `.log`, `.bak`, `.tmp`, `.md`.
- **Protección de rutas de API:** Las peticiones legítimas a endpoints REST `/api/*` son excluidas del cortafuegos estático y gestionadas por sus controladores con autenticación Bearer.
- **Evidencia de verificación:** `TC-SEC-15` ejecuta solicitudes `GET /data/psiconotes_relacional.json` y valida que respondan `403 Forbidden`.

### 2.2 Eliminación de Contenido Clínico Ficticio por IA (`server.js`)
- **Problema previo:** Al no existir `GEMINI_API_KEY`, el servidor simulaba una respuesta exitosa (`200 OK`) devolviendo texto clínico inventado.
- **Solución implementada:** Si la clave API no está presente en el servidor o en las cabeceras, el endpoint responde inmediatamente con `503 Service Unavailable`, informando que el servicio no está configurado y marcando la respuesta con `source: 'unavailable'`.
- **Evidencia de verificación:** `TC-SEC-16` valida que la ausencia de API key devuelva 503 y verifique que no existan campos inventados de examen mental o evolución.

### 2.3 Aislamiento Multi-Tenant y Prevención BOLA/IDOR (`db.js`, `server.js`)
- **Problema previo:** En `db.js`, la función `getPatientsByTherapist` incluía pacientes donde `!p.therapist_id`. En `server.js`, la validación de propiedad permitía el acceso si `data.patient.therapist_id` era nulo.
- **Solución implementada:**
  1. `getPatientsByTherapist` ahora exige `Boolean(p.therapist_id) && p.therapist_id === therapistId`.
  2. `GET /api/v1/portal/data/:patientId` rechaza con `403 Forbidden` si `!data.patient.therapist_id || data.patient.therapist_id !== req.therapistId`.
  3. `syncPatientsBatch` y `saveTherapistCloudSync` asignan obligatoriamente el `therapist_id` autenticado a cualquier nuevo paciente.
- **Evidencia de verificación:** `TC-SEC-17` inserta un paciente huérfano y comprueba que ningún terapeuta arbitrario pueda leer sus datos ni listarlo.

### 2.4 Hardening de Autenticación y Cero Fuga de Credenciales (`server.js`)
- **Problema previo:** El registro permitía recuperar sesiones si coincidía el `id` del terapeuta aunque la contraseña fuera incorrecta, y retornaba el objeto con `password_hash`.
- **Solución implementada:**
  1. Se eliminó la condición `(id && existing.id === id)`. El registro sólo permite reconectar si coincide estrictamente el hash de la contraseña; de lo contrario responde `409 Conflict`.
  2. Se purgan los campos `password_hash` y `passwordHash` antes de enviar cualquier respuesta JSON tanto en reconexión como en nuevos registros.
- **Evidencia de verificación:** `TC-SEC-18` simula el ataque de suplantación pasando el ID de la víctima con credencial falsa (rechazado con 409) y valida la ausencia de `password_hash` en respuestas 200.

### 2.5 Persistencia Atómica Resiliente y Respaldo Continuo (`db.js`)
- **Problema previo:** `fs.writeFileSync` directo sobre el archivo JSON objetivo corría riesgo de corrupción ante fallos de energía o terminación de proceso. Si `JSON.parse` fallaba al inicio, se inicializaba un almacén vacío que destruía los datos anteriores.
- **Solución implementada:**
  1. Se implementó escritura atómica: escribir a `psiconotes_relacional.json.tmp` y luego ejecutar `fs.renameSync`.
  2. Previo a cada sustitución, se copia el estado actual a `psiconotes_relacional.json.bak`.
  3. En `_loadLocalStore`, si el archivo principal está corrupto, se intenta restaurar automáticamente desde el respaldo `.bak`. Si persiste el error, se crea un volcado de emergencia con timestamp (`psiconotes_corrupt_<ts>.json`) para análisis forense sin destruir datos.
- **Evidencia de verificación:** `TC-SEC-19` valida que toda operación de guardado genere el respaldo atómico `.bak` y mantenga la integridad del archivo principal.

### 2.6 Purga de Almacenamiento Inseguro en Cliente (`app.js`)
- **Problema previo:** `app.js:728` escribía una copia de las notas clínicas completas en texto plano en la clave `psico_portal_notes_backup` de `localStorage`.
- **Solución implementada:** Se eliminó la escritura en texto plano y se forzó la eliminación explícita de la clave residual (`localStorage.removeItem('psico_portal_notes_backup')`).

### 2.7 Hardening de Secretos de Producción (`server.js`)
- **Problema previo:** Si no se definía `SESSION_SECRET`, se usaba una clave predeterminada insegura sin impedir la ejecución.
- **Solución implementada:** Si `process.env.NODE_ENV === 'production'`, el servidor valida que `SESSION_SECRET` esté definido, que no sea la clave por defecto y que tenga al menos 32 caracteres; de lo contrario, el proceso se detiene inmediatamente con `process.exit(1)`.

---

## 3. Pruebas de Regresión y Validación
- Total de pruebas ejecutadas: **71 pruebas**.
- Pruebas superadas: **71 / 71 (100% de éxito)**.
- Linting estático: `node .\node_modules\typescript\bin\tsc --noEmit` completó sin errores (código de salida 0).
- Verificación en vivo: Los contratos de autenticación, portal de pacientes, escalas psicométricas y cálculo financiero se mantienen intactos.
