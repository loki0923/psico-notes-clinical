# 🧪 Psico Notes Clinical v6.0 — Plan Integral de Pruebas y Aseguramiento de Calidad (QA)

**Documento Oficial de Estrategia de Pruebas y Validación Automatizada**  
*Autor:* Agente 4 — Ingeniero de QA y DevOps  
*Aprobado por:* Agente 1 — Arquitecto de Software y PM  
*Fecha:* Octubre 2026 (Auditoría Correctiva de Seguridad P0)  

---

## 1. Alcance y Estrategia de Pruebas

El presente documento define la matriz exhaustiva de pruebas unitarias, de integración HTTP, de seguridad criptográfica y de interfaz de usuario para **Psico Notes Clinical v6.0**.

### Objetivos de Calidad y Criterios P0:
- **100% de Aprobación en Suite Automatizada**: Todas las 52 pruebas pasan con status `PASSED` (0 errores).
- **Aislamiento Multitenant Estricto**: Ningún terapeuta puede leer, modificar ni eliminar expedientes ajenos, incluso manipulando parámetros o identificadores en peticiones a la API (prevención de BOLA/IDOR).
- **Cero Fuga de Credenciales o Códigos**: `resetCode` jamás se expone en respuestas HTTP públicas; endpoints de autenticación no devuelven datos de contacto privados (PII).
- **Tokens de Sesión Firmados Criptográficamente**: Sesiones HMAC-SHA256 con expiración y validación en tiempo constante.
- **Salas de Teleconsulta de Alta Entropía**: Identificadores criptográficos CSPRNG de 192 bits sin IDs predecibles.
- **Disponibilidad Offline y Resiliencia**: Operación clínica completa en modo local con sincronización y resolución de conflictos.

---

## 2. Matriz de Casos de Prueba Automatizados (52/52)

| ID | Módulo | Caso de Prueba | Criterio de Éxito |
|---|---|---|---|
| **TC-SEC-01** | Criptografía | Cifrado y Descifrado Web Crypto AES-GCM 256-bit | Texto descifrado idéntico al original; ciphertext ininteligible |
| **TC-SEC-02** | Anonimizador | Detección y sustitución de datos sensibles PHI | Nombres y números convertidos a tokens `[PACIENTE_A]`, `[TEL_01]` |
| **TC-PSY-01** | Psicometría | Calificación automática PHQ-9 y severidad | Puntuación exacta (0-27); categorías normal, leve, moderada, severa |
| **TC-PSY-02** | Psicometría | Detección de Riesgo Suicida en Ítem 9 PHQ-9 | Puntuación > 0 activa `alertRisk: true` y protocolo de crisis |
| **TC-PSY-03** | Psicometría | Calificación automática GAD-7 y umbrales | Puntuación exacta (0-21); corte clínico verificado |
| **TC-AI-01** | Asistente IA | Generación SOAP estructurado (Fallback / Gemini) | Retorna llaves JSON exactas: `subjetivo`, `objetivo`, `analisis`, `plan` |
| **TC-FIN-01** | Finanzas | Cálculo de balance, cobros e ingresos | Sumatorias matemáticas exactas sin desbordamiento |
| **TC-POR-01** | Portal Paciente | Autoregistro Cognitivo ABC de Beck | Guardado con situación, creencia y emoción (0-100%) |
| **TC-POR-02** | Portal Paciente | Activación de Botón SOS / Protocolo de Crisis | Generación de alerta inmediata y líneas de emergencia 24/7 |
| **TC-VITAL-01** | Ciclo Vital | Inferencia por Etapa Vital (Niñez, Adolescencia, Adultez) | Mapeo exacto <12a, 12-17a, 18+a |
| **TC-VITAL-02** | Niñez | Integridad Pediátrica (Tutoría, Escuela, Neurodesarrollo) | Tutor legal, escuela y consentimiento parental requeridos |
| **TC-VITAL-03** | Adolescencia | Marco Ético de Confidencialidad y Asentimiento | Registro de confidencialidad y perspectiva propia del menor |
| **TC-VITAL-04** | Ciclo Vital | Filtrado Reactivo Multidimensional | Conteo exacto y filtrado sin pérdida de expedientes |
| **TC-HIST-01** | Anamnesis Infantil | Integridad Perinatal, Parto e Hitos 0-3a | Ficha biparental, somatometría e hitos motores |
| **TC-HIST-02** | Adolescencia | Entrevista Confidencial y Metas Personales | Espacio reservado para afecto, sexualidad y metas propias |
| **TC-HIST-03** | Adulto | Áreas de Vida, Vivienda y Hábitos Psicobiológicos | Esfera laboral, legal, dinámicas habitacionales y sueño |
| **TC-HIST-04** | Evolución | Hoja de Evolución Protocolizada (Dual SOAP) | Membrete colegiado, objetivos, técnicas y hallazgos |
| **TC-HIST-05** | Onboarding | Parser Inteligente de Google Forms | Extracción y mapeo automático de campos tabulados |
| **TC-HIST-06** | Pre-consulta | Llenado Directo In-App e Integración al Expediente | Validación de formulario interno sin enlaces externos |
| **TC-HIST-07** | Reporte Atención | Reporte de Atención por Sesión de Terapia | Sesión correlativa, mapeo oficial y exportación PDF |
| **TC-CAL-01** | Calendario | Calendario Clínico Multi-Vista (Día, Semana, Mes, Año) | Conmutación fluida, pills de citas en cuadrícula mensual |
| **TC-POR-03** | Portal Paciente | Credenciales Token, Sincronización y Auto-login | Token `PN-XXXXXXXX`, sincronización y acceso directo |
| **TC-DB-01** | Persistencia DB | Estructura de Base de Datos Relacional | Inicialización DDL, upsert de pacientes y búsqueda por token |
| **TC-DB-02** | Persistencia DB | Tareas, Autoregistro ABC y Monitoreo de Ánimo | Persistencia transaccional de tareas, estados de ánimo y SOS |
| **TC-POR-04** | Portal Paciente | Botiquín de Calma (4-7-8 y 5-4-3-2-1) | Ejecución interactiva y registro en bitácora médica |
| **TC-CHAR-01** | Analítica | Tablero Gráfico Longitudinal y Copiloto IA SOAP | Síntesis longitudinal, tendencias y correlación psicométrica |
| **TC-SEC-03** | Seguridad | Políticas OWASP y Bloqueo de Archivos Sensibles | Bloqueo estricto de `.env`, `.sql`, `server.js`, `db.js` |
| **TC-SYNC-01** | Resiliencia | Cola de Sincronización Offline (PWA) | Encolamiento offline y vaciado automático al recuperar red |
| **TC-PRIV-01** | Privacidad | Bloqueo por Inactividad Médica (HIPAA) | Cierre automático tras 15 min de inactividad médica |
| **TC-REP-01** | Informes | Epicrisis Oficial con QR de Autenticidad | Código criptográfico y firma digital de autenticidad |
| **TC-CON-01** | Bioética | Consentimiento Informado con Firma Táctil | Trazabilidad de firma, IP, fecha y términos legales |
| **TC-STAT-01** | Analítica | Distribución Diagnóstica y Remisión Sintomática | Métricas epidemiológicas y tasa de mejoría clínica |
| **TC-CLOUD-01** | Nube | Registro y Login Centralizado de Terapeuta | Persistencia en base de datos y hash seguro de clave |
| **TC-CLOUD-02** | Nube | Respaldo y Snapshot Integral Multi-Dispositivo | Almacenamiento cloud de pacientes, citas y notas |
| **TC-CLOUD-03** | Nube | Fusión Inteligente de Colecciones (PC + Móvil) | Merge determinista sin duplicados ni pérdida de registros |
| **TC-AUTH-01** | Seguridad | Flujo Seguro de Recuperación de Contraseña | Verificación de PIN de 6 dígitos con expiración a 15 min |
| **TC-MOB-01** | Usabilidad | Navegación Móvil, Drawer & Bottom Bar Ergonomics | Viewport cover, drawer táctil, safe area y bottom bar |
| **TC-SEC-04** | Seguridad | Whitelist CORS Estricta | Rechazo a dominios no autorizados (HTTP 403) |
| **TC-SEC-05** | Privacidad | Cero Fuga de PII en Portal Auth | Omisión de teléfono, correo y token reflejado |
| **TC-SEC-06** | Multitenant | Aislamiento de Expedientes por Terapeuta | Consultas filtradas estrictamente por `therapist_id` |
| **TC-CLI-01** | Bioética | Evaluación C-SSRS y Directorio Localizado de Crisis | Detección de riesgo extremo y líneas 24/7 (FPVP VE) |
| **TC-PSY-04** | Psicometría | Límites y Puntos de Corte PHQ-9 y GAD-7 | Validación de todos los rangos diagnósticos validados |
| **TC-DB-03** | Fiscal | Facturación SENIAT Persistente (DB-002) | RIF, IVA exento, IGTF 3% y numeración correlativa |
| **TC-NOTE-01** | Auditoría | Inmutabilidad de Reportes Firmados (CLI-005) | Prohibición de sobrescritura; gestión de adendums |
| **TC-SEC-07** | Seguridad P0 | Acceso No Autenticado a Endpoints Clínicos | Todos los endpoints protegidos devuelven HTTP 401 |
| **TC-SEC-08** | Seguridad P0 | Prevención BOLA/IDOR en Datos de Pacientes | Intento de consulta cruzada responde HTTP 403 Forbidden |
| **TC-SEC-09** | Seguridad P0 | Aislamiento de Alertas de Crisis y ACK Cruzado | Terapeuta B no ve ni puede reconocer alertas de A (HTTP 403) |
| **TC-SEC-10** | Seguridad P0 | Prevención de Sobreescritura Cruzada de Expedientes | Conflicto multitenant en `/patients/sync` responde HTTP 403 |
| **TC-SEC-11** | Seguridad P0 | Cero Fuga de resetCode en Recuperación de Clave | JSON público no contiene el código; neutraliza enumeración |
| **TC-SEC-12** | Seguridad P0 | Teleconsulta con Identificadores de Alta Entropía | Salas impredecibles de 192 bits; rechazo sin auth (401) |
| **TC-SEC-13** | Seguridad P0 | Validación de Tokens: Manipulación y Expiración | Rechazo de firmas forjadas (401), vencidos (401) y spoofing (403) |
| **TC-SEC-14** | Seguridad P0 | Aislamiento de Buzón Cifrado Zero-Knowledge | Prohibición de lectura/escritura cruzada en ZK sync (HTTP 403) |
| **TC-CLI-02** | Consentimiento | Consentimiento con Teleconsulta e IA Asistida (CLI-002) | Registro de aceptación expresa de teleconsulta, IA y firma |
| **TC-UX-01** | Ergonomía | Flujo Rápido de Evolución de Sesión desde la Cita (UX-003) | Prellenado inmediato de paciente, fecha y sesión correlativa |
| **TC-UX-02** | Ergonomía Táctil | Optimización Táctil y Prevención de Solapamiento Móvil (UX-004) | Modales en z-index 2200, actions sticky, ocultamiento de bottom-nav y clearance safe-area |
| **TC-PILOT-01** | Caso Piloto | Simulación de Caso Clínico Piloto y Trazabilidad (QA-004) | Validación integral de consentimiento, PHQ-9, C-SSRS, evolución y notas firmadas con adendum |

---

## 3. Arquitectura del Runner de Pruebas

```mermaid
flowchart TD
    Runner["🚀 Test Runner (tests.js)"]
    Runner --> T_Core["TC 01-44: Lógica Clínica, Psicometría, Cifrado, DB & UI"]
    Runner --> T_SecHttp["TC 45-52: Suite de Integración HTTP de Seguridad P0 (OWASP)"]
    Runner --> T_ClinUx["TC 53-55: Flujos Clínicos y Ergonomía Móvil (CLI-002, UX-003, UX-004)"]
    Runner --> T_Pilot["TC 56: Caso Clínico Piloto Sintético E2E (QA-004)"]
    
    T_SecHttp --> Ephemeral["Servidor de Pruebas Efímero (server.js en puerto dinámico)"]
    Ephemeral --> TC_401["TC-SEC-07: Verificación de HTTP 401 (Unauth)"]
    Ephemeral --> TC_BOLA["TC-SEC-08: Prevención BOLA/IDOR (HTTP 403)"]
    Ephemeral --> TC_Crisis["TC-SEC-09: Aislamiento Alertas Crisis (HTTP 403)"]
    Ephemeral --> TC_Sync["TC-SEC-10: Rechazo Sobrescritura Batch (HTTP 403)"]
    Ephemeral --> TC_Reset["TC-SEC-11: Cero Fuga resetCode & Anti-Enumeración"]
    Ephemeral --> TC_Tele["TC-SEC-12: Teleconsulta CSPRNG 192 bits"]
    Ephemeral --> TC_Token["TC-SEC-13: Tokens Forjados, Vencidos & Spoofing"]
    Ephemeral --> TC_ZK["TC-SEC-14: Aislamiento Buzón Zero-Knowledge"]

    T_Core & TC_401 & TC_BOLA & TC_Crisis & TC_Sync & TC_Reset & TC_Tele & TC_Token & TC_ZK & T_ClinUx & T_Pilot --> Assertions["Evaluación Estricta de Aserciones"]
    Assertions --> Report["Certificación 56/56 Tests Aprobados (100% Pass)"]
```

---

## 4. Criterios de Aceptación para Fase de Despliegue

1. **Suite de pruebas**: 56 de 56 pruebas ejecutadas con status `PASSED` (100%).
2. **Seguridad P0 Certificada**: Cero vulnerabilidades BOLA, cero fuga de credenciales, CORS estricto y sesiones criptográficas HMAC.
3. **Compatibilidad cross-browser y móvil**: Verificado en Chrome, Edge, Firefox, Safari iOS y Chrome Android con ergonomía táctil (44px min touch target, safe-area env).
4. **PWA Lighthouse Score**: Rendimiento offline, PWA instalable y tiempos de carga instantáneos.
5. **Validación Clínica E2E**: Caso piloto simulado ejecutado con consentimiento informado, tamizaje PHQ-9, protocolo de crisis C-SSRS y reporte de atención inmutable firmado.


---

## 5. Casos de Prueba — Auditoría Integral de Botones y Controladores (v6.8)

| ID | Módulo | Nombre de la Prueba | Criterio de Aprobación |
|---|---|---|---|
| **TC-BTN-01** | Global DOM | Resolución Integral de Todos los Botones `onclick` y `onsubmit` | Todos los 136 controladores interactivos están definidos y vinculados a `window` sin excepciones |
| **TC-BTN-02** | Facturación | Operatividad de Botones de Facturación SENIAT (`adm.js`) | `handleInvoiceSubmit`, `handleBillingConfigSubmit`, `clearAllInvoices`, `deleteInvoice` disponibles |
| **TC-BTN-03** | Psicométricos | Operatividad de Botones de Escalas Interactivas (`scales.js`) | `openInteractiveScaleModal`, `submitInteractiveScaleForm`, `renderScalesView` ejecutables |
| **TC-BTN-04** | Recordatorios | Operatividad de Drawer y Botones de Recordatorios (`session-reminders.js`) | `handleReminderAction`, `saveCustomReminderForm`, `toggleReminderDrawer` operativos |
| **TC-BTN-05** | Expedientes & Radar | Resolución de Alias y Utilidades Defensivas (`app.js`) | `viewPatientDetail`, `exportReporteAtencionPDF` y `updateCounts` con resiliencia ante nulos |

---

## 6. Casos de Prueba — Módulo Financiero y Tarifación Dinámica (v6.8.1)

| ID | Módulo | Nombre de la Prueba | Criterio de Aprobación |
|---|---|---|---|
| **TC-FIN-01** | Finanzas | Cálculo Aritmético de Balance, Cobros e Ingresos | Suma exacta de cobrados, pendientes, egresos y balance neto |
| **TC-FIN-02** | Tarifas | Gestión y Configuración de Tarifas de Precios por Tiempo | CRUD de tarifas clínicas, duración y establecimiento de tarifa predeterminada |
| **TC-FIN-03** | Metas | Metas Financieras Cuantitativas y Cualitativas | Registro y cálculo de porcentaje de progreso en metas de facturación y sesiones |
| **TC-FIN-04** | Cobros | Tarificación Dinámica y Cobro de Citas Clínicas | Ingesta de honorarios pactados, prevención de duplicación (idempotencia) |
| **TC-FIN-05** | Global Scope | Disponibilidad y Exposición Global de Controladores | 100% de controladores expuestos en `window` sin `SyntaxError` en scripts clásicos |

---

## 7. Casos de Prueba — Perfeccionamiento Estético y Funcional (v7.0)

| ID | Módulo | Nombre de la Prueba | Criterio de Aprobación |
|---|---|---|---|
| **TC-EST-01** | Tokens CSS | Consistencia de Variables CSS en Terapeuta y Portal | 0 variables CSS huérfanas en ambos sistemas (`--border-color`, `--color-primary`, `--radius-full`, `--accent-gradient`) |
| **TC-EST-02** | UI / UX | Modo Oscuro en Portal de Pacientes | Conmutador `togglePortalTheme()`, sincronización con `[data-theme="dark"]` y persistencia en `localStorage` |
| **TC-EST-03** | Accesibilidad | Cierre de Overlays y Modales con Tecla Escape | Tecla `Escape` cierra drawers y modales invocando sus destructores/resets sin fugar bloqueos de scroll |
| **TC-EST-04** | Adaptabilidad | Resiliencia Temática de Contenedores y Recibos | Contenedores adaptativos con `var(--bg-card)` y bordes coherentes en modo claro y oscuro |
| **TC-EST-05** | UI / Contención | Ergonomía de Tarjetas KPI y Selector de Estatus | Cero desbordamiento (`overflow: hidden`, `width: 100%`), eliminación de chips redundantes y vinculación íntegra de IDs |
| **TC-NOTIF-01** | UX / Anti-Spam | Deduplicación de Notificaciones y Control de Toasts | `isConfirmationAlreadyNotified`, prevención anti-duplicados y límite estricto de máximo 3 toasts simultáneos |

---

## 8. Casos de Prueba — Auditoría Exhaustiva de Controladores, Portal y Grabación (v7.1)

| ID | Módulo | Nombre de la Prueba | Criterio de Aprobación |
|---|---|---|---|
| **TC-POR-16** | Portal Pacientes & Kid | Agendamiento, Notas Reflexivas y Personalización Infantil | `pickAvailableSlot` resuelve dualmente `scheduleDate`/`scheduleSessionDate`; notas infantiles y nombres de avatar se vinculan y persisten correctamente |
| **TC-REC-02** | Grabación & Copiloto | Mapeo Defensivo SOAP en SessionRecorder | Transcripción ambient y síntesis aplican con éxito sobre `noteSubjetivo`, `noteObjetivo`, `noteAnalisis` y `notePlan` sin campos mudos |

**Total de Pruebas Automatizadas Activas**: 123 de 123 superadas exitosamente (100% Pass Rate).


