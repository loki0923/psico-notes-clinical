# Guía de Despliegue Gratuito — Psico Notes Clinical v6.0
**Rol:** Arquitecto de Software & Project Manager  
**Fecha:** Octubre 2026  
**Objetivo:** Guiar el despliegue fullstack de la aplicación clínica, el portal del paciente y la base de datos PostgreSQL a costo cero ($0 USD).

---

## 1. ¿Por qué cambió respecto a la versión de Julio 2026?

* **En Julio 2026**: La app era una página estática. Todo se guardaba únicamente en el navegador (`localStorage`) de la psicóloga. Por eso Netlify bastaba.
* **En la versión actual (v6.0)**: Construimos una arquitectura profesional con **Portal del Paciente en Vivo**. Para que el paciente pueda abrir su portal en su teléfono celular, ver sus tareas, contestar el PHQ-9 o registrar su estado de ánimo, se requiere:
  1. Un servidor Node.js Express (`server.js`).
  2. Una base de datos en la nube PostgreSQL (`schema.sql` y `db.js`).

> **Importante**: Netlify es solo para sitios web estáticos (CDN); **no ejecuta procesos continuos de Node.js ni bases de datos PostgreSQL**. Si se sube solo a Netlify, el paciente al abrir el enlace en su celular vería su portal vacío porque su teléfono no tiene el `localStorage` de tu computadora.

---

## 2. Comparativa de Plataformas Gratuitas

| Plataforma | Soporta Node.js | Soporta PostgreSQL | Costo | Recomendación |
| :--- | :---: | :---: | :---: | :--- |
| **Render.com** | Sí (Web Service) | Sí (Managed PostgreSQL) | **$0 / mes** | ⭐ **Opción 1: La más fácil y recomendada.** Todo en una sola URL sin configurar proxies. |
| **Netlify + Render/Supabase** | Vía API Externa | Vía Supabase Cloud | **$0 / mes** | **Opción 2: Híbrida.** Frontend en Netlify y backend/base de datos en Render. |
| **Railway / Koyeb** | Sí (Docker/Node) | Sí (PostgreSQL) | **$0 / mes** | Alternativa moderna con créditos iniciales. |

---

## 3. Opción 1 (Recomendada): Despliegue Todo-en-Uno en Render.com ($0 USD)

Render aloja tanto el servidor Node.js (que sirve la app clínica y el portal) como la base de datos PostgreSQL de forma gratuita.

### Paso 1: Subir el proyecto a GitHub
Como estás en Windows, tienes 2 formas súper fáciles:
* **Método A (Desde la Web de GitHub, sin comandos):**
  1. Entra a [github.com](https://github.com) e inicia sesión.
  2. Haz clic en el botón verde **"New"** para crear un repositorio (Nombre: `psico-notes-clinical`).
  3. En la pantalla inicial, haz clic en el enlace azul **"uploading an existing file"**.
  4. Selecciona y arrastra todos los archivos de tu carpeta (no arrastres la carpeta `node_modules`).
  5. Haz clic en **"Commit changes"**.
* **Método B (Con GitHub Desktop):**
  1. Descarga e instala [GitHub Desktop](https://desktop.github.com/).
  2. Ve a `File > Add local repository` y selecciona tu carpeta `psico-notes-clinical`.
  3. Haz clic en **"Publish repository"** a tu cuenta de GitHub.

---

### Paso 2: Crear la Base de Datos PostgreSQL Gratuita en Render
1. Entra a [render.com](https://render.com) y regístrate gratis (puedes iniciar sesión con tu cuenta de GitHub en 1 clic).
2. En el panel principal (Dashboard), haz clic en el botón superior **New +** y selecciona **PostgreSQL**.
3. Completa los campos básicos:
   * **Name**: `psiconotes-db`
   * **Database**: `psiconotes`
   * **User**: `psico_admin`
   * **Region**: Oregon (US West) o Ohio (US East).
   * **Instance Type**: Selecciona **Free**.
4. Haz clic en el botón **Create Database**.
5. Espera unos 30 segundos a que el estado cambie a `Available`.
6. En la ficha de la base de datos, en la sección **Connections**, copia el valor de **Internal Database URL** (empieza con `postgres://...`).

---

### Paso 3: Crear el Web Service en Render
1. En el menú superior de Render, haz clic en **New +** y selecciona **Web Service**.
2. Conecta tu repositorio de GitHub `psico-notes-clinical`.
3. Completa los ajustes:
   * **Name**: `psico-notes-clinical`
   * **Runtime**: **Node**.
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
   * **Instance Type**: **Free**.
4. Desplázate hacia abajo hasta la sección **Environment Variables** y haz clic en **Add Environment Variable**:
   * **Key**: `DATABASE_URL`
   * **Value**: Pega la URL que copiaste en el Paso 2 (*Internal Database URL*).
   * **Key**: `NODE_ENV`  |  **Value**: `production`
5. Haz clic en el botón inferior **Create Web Service**.

---

### Paso 4: ¡Inicialización Automática!
Render instalará las dependencias y arrancará el servidor.
Nuestro archivo [db.js](file:///c:/Users/Windows%2011/OneDrive/Desktop/psico-notes-clinical/db.js) detectará automáticamente la variable `DATABASE_URL`, conectará PostgreSQL y ejecutará automáticamente el archivo [schema.sql](file:///c:/Users/Windows%2011/OneDrive/Desktop/psico-notes-clinical/schema.sql) creando las 9 tablas relacionales con sus índices y restricciones.

Render te asignará una URL pública y segura con HTTPS (ejemplo: `https://psico-notes-clinical.onrender.com`).

---

## 4. Opción 2: Si deseas mantener tu cuenta de Netlify

Si quieres conservar tu dominio o sitio en Netlify:
1. Sigue el Paso 2 y 3 para desplegar el backend y la base de datos en Render.
2. Copia la URL pública de tu backend de Render (ejemplo: `https://psico-backend.onrender.com`).
3. En el archivo `netlify.toml` que ya dejamos listo en la raíz del proyecto, descomenta la redirección:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://psico-backend.onrender.com/api/:splat"
     status = 200
     force = true
   ```
4. Sube la carpeta a Netlify. Netlify servirá la interfaz gráfica y reenviará las llamadas de la API al backend de Render.

---

## 5. Prueba de Fuego: Comprobar que el Paciente Entra desde su Teléfono

1. Abre la URL en tu computadora y entra a la sección **"Portal Paciente"**.
2. Haz clic en generar acceso y copia el enlace directo con el token o escanea el código QR.
3. Abre el enlace en el navegador de cualquier teléfono celular.
4. El paciente verá en tiempo real sus tareas, seguimiento de ánimo y autoregistros conectados a PostgreSQL.
