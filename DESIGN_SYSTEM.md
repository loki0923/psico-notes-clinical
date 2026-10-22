# DESIGN_SYSTEM.md — Sistema de Diseño Clínico Premium
**Proyecto:** Psico Notes Clinical  
**Versión:** 1.0 (Tokens y Guía Visual Fase 2)  
**Personalidad Visual:** Profesional · Humana · Discreta · Serena · Moderna · Confiable  
**Referencia:** Human Interface Guidelines & Material 3 adaptados a Software Clínico

---

## 1. Filosofía de Diseño

Psico Notes Clinical es una herramienta médica de uso intensivo. El terapeuta pasa múltiples horas al día frente a la pantalla redactando notas de evolución, revisando historias clínicas e interactuando con métricas de salud mental. 

Por tanto, el diseño prioriza:
- **Reducción de fatiga visual**: Contrastes equilibrados sobre fondos sutiles y cálidos, evitando blancos puros cegadores o fondos oscuros de saturación excesiva.
- **Sobriedad y respeto ético**: El color se utiliza como un elemento funcional de jerarquía, no como adorno. El color rojo queda reservado estrictamente para alertas de crisis clínica (ideación suicida, emergencias).
- **Claridad tipográfica**: Textos con ritmos de lectura optimizados para terminología clínica y diagnósticos DSM-5/CIE-11.
- **Accesibilidad de Grado Médico**: Contraste conforme a WCAG 2.2 AA (mínimo 4.5:1 para texto normal, 3:1 para texto grande y elementos de interfaz).

---

## 2. Paleta Cromática y Tokens Centralizados

### 2.1 Colores Principales (Brand & Neutral Tokens)

| Token CSS | Valor HEX | Uso Semántico | Contraste sobre Fondo |
|---|---|---|---|
| `--color-bg-canvas` | `#F7F8F6` | Fondo general de la aplicación | Canvas base neutro y sereno |
| `--color-surface-card` | `#FFFFFF` | Superficies de trabajo, tarjetas, modales y tablas | Elevación limpia |
| `--color-text-main` | `#202923` | Tipografía principal, títulos y encabezados | Ratio 13.8:1 (AAA) |
| `--color-text-muted` | `#69736D` | Subtítulos, etiquetas, placeholders y metadatos | Ratio 4.7:1 (AA) |
| `--color-primary-teal` | `#285C50` | Verde petróleo clínico: botones primarios, activos, acentos | Ratio 7.1:1 (AAA) |
| `--color-primary-soft` | `#E7F0EB` | Acento suave: fondos de chips, badges, hover activo | Decorativo / selección |
| `--color-border-subtle`| `#E5E9E5` | Divisores, bordes de inputs y líneas de tablas | Separador discreto |
| `--color-alert-danger` | `#D32F2F` | **Exclusivo para alertas clínicas de crisis y errores críticos** | Ratio 5.3:1 (AA) |
| `--color-alert-warning`| `#B45309` | Alertas de seguimiento y citas pendientes | Ratio 4.8:1 (AA) |
| `--color-alert-success`| `#1E7E34` | Guardado exitoso, notas firmadas y pacientes de alta | Ratio 5.1:1 (AA) |

### 2.2 Variables CSS Globales Recomendadas

```css
:root {
  /* Fondos y Superficies */
  --bg-app: #F7F8F6;
  --bg-card: #FFFFFF;
  --bg-accent-soft: #E7F0EB;

  /* Textos */
  --text-primary: #202923;
  --text-secondary: #69736D;
  --text-inverse: #FFFFFF;

  /* Marca y Acciones */
  --brand-teal: #285C50;
  --brand-teal-hover: #1E463D;
  --brand-teal-focus: rgba(40, 92, 80, 0.25);

  /* Estructura y Bordes */
  --border-card: #E5E9E5;
  --border-focus: #285C50;
  --radius-subtle: 8px;
  --radius-card: 12px;
  --radius-modal: 16px;

  /* Sombras Ultra-Discretas */
  --shadow-card: 0 1px 3px rgba(32, 41, 35, 0.04), 0 1px 2px rgba(32, 41, 35, 0.02);
  --shadow-hover: 0 4px 12px rgba(32, 41, 35, 0.06);
  --shadow-modal: 0 16px 32px -4px rgba(32, 41, 35, 0.12);

  /* Tipografía */
  --font-clinical: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

---

## 3. Tipografía y Jerarquía

- **Familia tipográfica:** `Inter`, complementada con fuentes nativas del sistema (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`).
- **Escala de fuentes:**
  - `Display / Título de Módulo`: 22px / Peso 600 / Line-height 1.3
  - `Subtítulos / Encabezados de Sección`: 16px / Peso 600 / Line-height 1.4
  - `Cuerpo de Texto Clínico (Notas SOAP, Anamnesis)`: 14px / Peso 400 / Line-height 1.6
  - `Metadatos y Etiquetas de Formulario`: 12.5px / Peso 500 / Line-height 1.4
  - `Captions y Códigos Criptográficos`: 11px / Peso 400 / Monospace

---

## 4. Navegación Lateral Estructurada

La interfaz se organiza mediante una barra lateral izquierda minimalista con ancho estándar de 240px:

1. **Logo / Encabezado:** Isotipo cerebral discreto en verde petróleo + `Psico Notes Clinical`.
2. **Menú Principal de Navegación:**
   - 🏠 **Inicio (Dashboard)**: Próximas citas, tareas pendientes, widget de crisis SOS.
   - 👥 **Pacientes**: Directorio, fichas por ciclo vital (niñez, adolescencia, adultez), anamnesis.
   - 📅 **Agenda**: Calendario multi-vista (día, semana, mes), sincronización de citas.
   - 📝 **Sesiones y Notas**: Redactor SOAP, historial longitudinal, firma y adendums.
   - 🧪 **Evaluaciones**: Escalas PHQ-9, GAD-7, C-SSRS y gestor de pruebas psicométricas.
   - 📊 **Informes**: Generador de epicrisis, estadísticas diagnósticas y reportes oficiales.
   - 💳 **Finanzas**: Control de cobros, honorarios y facturación fiscal.
   - ⚙️ **Ajustes**: Perfil profesional, credenciales, firma digital y copias de seguridad.
3. **Pie de Barra:** Indicador de estado de sincronización (En línea / Nube / Local) + Perfil activo.

---

## 5. Componentes y Reglas UX

### 5.1 Formularios Clínicos
- Bordes suaves de 1px en `#E5E9E5`.
- Estado de foco visible con halo en `rgba(40, 92, 80, 0.25)` sin perder la accesibilidad por teclado.
- Etiquetas siempre visibles sobre el campo (nunca depender únicamente del placeholder).
- Mensajes de error claros, comprensibles y sin revelar stack traces o detalles técnicos.

### 5.2 Estados de Interfaz
- **Carga (Loading)**: Indicadores sutiles (esqueletos o spinners discretos en verde petróleo), sin bloquear la vista entera a menos que sea una operación de escritura crítica.
- **Vacíos (Empty States)**: Ilustraciones o iconos discretos con texto instructivo que motive la primera acción (ej: *"Aún no tienes pacientes registrados. Haz clic en 'Nuevo Paciente' para abrir tu primer expediente"*).
- **Acciones Destructivas**: Modales de confirmación con doble verificación antes de archivar un expediente o eliminar un registro financiero.
- **Inmutabilidad de Documentos Clínicos**: Una nota SOAP o informe firmado se muestra en modo solo lectura con un badge de *"Documento Oficial Firmado"*; cualquier adición se realiza mediante la acción explícita de *"Agregar Adéndum"*.
