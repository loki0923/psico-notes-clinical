# ROADMAP.md — Hoja de Ruta de Evolución a Plataforma Clínica Premium
**Proyecto:** Psico Notes Clinical  
**Versión Actual:** v6.3.0  
**Líderes de Fase:** Arquitecto de Software, Diseñador UX/UI SaaS, Especialista en Privacidad, QA/DevOps y PM Clínico

---

## Estado de Ejecución de las Fases

```mermaid
flowchart LR
    F0["Fase 0: Diagnóstico"] -->|Completado| F1["Fase 1: Seguridad Crítica"]
    F1 -->|Completado| F2["Fase 2: Sistema Visual Premium"]
    F2 -->|Completado| F3["Fase 3: Flujos Clínicos"]
    F3 -->|Completado| F4["Fase 4: IA Responsable"]
    F4 -->|Completado| F5["Fase 5: DevOps & QA"]
    F5 -->|Completado| F6["Fase 6: Preparación Comercial"]

    classDef done fill:#285C50,stroke:#285C50,color:#fff;
    class F0,F1,F2,F3,F4,F5,F6 done;
```

---

## Desglose por Fases y Entregables

### ✅ Fase 0: Auditoría y Diagnóstico (COMPLETADA)
- Inspección técnica exhaustiva de frontend, backend Express y persistencia PostgreSQL/local.
- Identificación de 5 riesgos P0 críticos con evidencia demostrable en código.
- Establecimiento de línea base: 66 pruebas unitarias y detección de error sintáctico preexistente en TS.
- **Entregable:** `AUDIT_REPORT.md`.

### ✅ Fase 1: Hardening y Seguridad Crítica (COMPLETADA)
- Bloqueo estricto del cortafuegos estático (`/data/*`, `.json`, `.sql`, etc.).
- Aislamiento multitenant BOLA/IDOR para pacientes huérfanos sin `therapist_id`.
- Eliminación de bypass en registro y purga total de `password_hash` en respuestas.
- Erradicación de notas clínicas ficticias generadas por IA (HTTP 503 veraz).
- Persistencia atómica (`.tmp` + `renameSync`) y respaldo continuo `.bak`.
- Saneamiento de `localStorage` eliminando notas en texto plano.
- Creación de 5 nuevas pruebas de seguridad automatizadas (`TC-SEC-15` a `TC-SEC-19`).
- **Entregables:** `SECURITY_REMEDIATION.md`, `TEST_REPORT.md`.

### ✅ Fase 2: Diseño Visual Premium Minimalista (COMPLETADA)
- Tokens centralizados de diseño clínico:
  - Fondo general: `#F7F8F6`
  - Superficies y tarjetas: `#FFFFFF`
  - Texto principal: `#202923` (WCAG AAA)
  - Texto secundario: `#69736D` (WCAG AA)
  - Verde petróleo clínico: `#285C50` (hover: `#1E463D`)
  - Acento suave: `#E7F0EB`
  - Bordes discretos: `#E5E9E5`
  - Alerta de error: `#D32F2F` reservado para emergencias y validaciones críticas.
- Navegación lateral unificada en 8 módulos clínicos principales.
- Modo oscuro equilibrado institucional (`#121815` / `#1A241F`).
- **Entregable:** `DESIGN_SYSTEM.md`.

### ✅ Fase 3: Optimización de los Flujos Clínicos (COMPLETADA)
- Alertas SOS en tiempo real: integración en el dashboard del terapeuta conectada a `/api/v1/portal/crisis-alerts`.
- Teleconsulta criptográfica: generación y consumo de salas de 192 bits (`/api/v1/telehealth/session`).
- Inmutabilidad estricta de notas SOAP firmadas: campos bloqueados contra sobreescritura accidental, exigiendo adendums cronológicos con autoría.
- Aritmética financiera con precisión decimal (`roundCurrency`) en ingresos, deudas y régimen fiscal SENIAT (3% IGTF).

### ✅ Fase 4: IA Clínica Responsable (COMPLETADA)
- Proxy backend unificado para Gemini API (`POST /api/v1/clinical/soap-synthesize` y `POST /api/v1/clinical/ai-query`).
- Eliminación definitiva del almacenamiento de API keys en el navegador (`localStorage.psico_gemini_api_key`).
- Desidentificación obligatoria previa con `PhiAnonymizer` antes de enviar datos al LLM.
- Notificaciones de servicio no disponible (HTTP 503) sin fabricar datos ni bloquear la redacción clínica manual.
- Advertencias éticas y legales visibles recordando que la IA es de apoyo consultivo y no sustituye el juicio del profesional tratante.

### ✅ Fase 5: Pruebas Exhaustivas y DevOps (COMPLETADA)
- 72 pruebas automatizadas en `tests.js` con 100% de aprobación (`TC-SEC-01` a `TC-SEC-20`).
- Validación estática TypeScript (`tsc --noEmit`) con 0 errores.
- Empaquetado de producción con Vite (`vite build`) exitoso y reproducible.
- Creación de `Dockerfile` multi-stage con usuario no privilegiado (`psiconotes`) y healthcheck en `/api/health`.

### ✅ Fase 6: Preparación Comercial y Monetización (COMPLETADA)
- **Matriz de Niveles de Servicio (Tiers):**
  - **Plan Free (Inicio Profesional):** Hasta 5 pacientes activos, almacenamiento local/offline cifrado, notas SOAP estándar, psicometría básica (PHQ-9 / GAD-7).
  - **Plan Pro Clínico:** Pacientes ilimitados, sincronización en vivo con Portal del Paciente, teleconsulta criptográfica Jitsi, copilot y síntesis SOAP por IA, facturación fiscal SENIAT (IVA exento + IGTF 3%), analítica longitudinal avanzada.
  - **Plan Institucional / Clínicas:** Múltiples terapeutas, auditoría de accesos multi-tenant, roles administrativos y exportación masiva.
- **Interoperabilidad y Respaldo:**
  - Exportación completa de expedientes en formato JSON estructurado.
  - Generación e impresión de Informes Oficiales de Atención y Epicrisis en PDF con código QR criptográfico.
