# 360° Studio by GmedranoTIC

Editor profesional de tours virtuales 360° con imágenes equirectangulares.

[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-blue)](https://github.com)
[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA-green)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

## ✨ Características

- 🎨 **Editor Visual Intuitivo** - Interfaz moderna y fácil de usar
- 🌐 **Tours Interactivos 360°** - Navegación fluida entre escenas
- 📍 **Hotspots Personalizables** - Enlaces a escenas, URLs externas o galerías de imágenes
- 💾 **Guardar/Cargar Proyectos** - Formato .pano para editar en cualquier momento
- 📦 **Exportación Optimizada** - Genera ZIP con HTML + imágenes listo para web
- 🚀 **Deploy Automático** - GitHub Pages con GitHub Actions
- ⚡ **Sin Servidor Necesario** - Tours exportados funcionan en cualquier lugar

## 🚀 Inicio Rápido

### Instalación Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## 🌐 Deploy Automático en GitHub Pages

Este proyecto incluye configuración de **GitHub Actions** para deploy automático.

### Configuración (Una sola vez):

1. Sube el proyecto a GitHub
2. Ve a Settings → Pages
3. Source: **GitHub Actions**
4. ¡Listo! Cada push despliega automáticamente

**Resultado**: `https://TU-USUARIO.github.io/NOMBRE-REPO/`

📖 **Guía completa**: Ver [GITHUB_PAGES_CON_ACTIONS.md](GITHUB_PAGES_CON_ACTIONS.md)

### Deploy Manual (Alternativa):

```bash
npm run build
# Sube la carpeta dist/ a tu hosting
```

## 📦 Exportación del Tour

Al hacer clic en **"Exportar Tour"**, se descarga un archivo ZIP con:

```
mi_tour.zip
├── index.html          # Visor interactivo standalone
└── images/             # Carpeta con todas las imágenes
    ├── scene_0.jpg
    ├── scene_1.jpg
    ├── hotspot_xxx.jpg
    └── ...
```

### Para visualizar el tour exportado:

1. Descomprime el archivo ZIP
2. Abre `index.html` en tu navegador
3. ¡Listo! No necesita servidor

## 🎯 Cómo Usar el Editor

### 1. Añadir Escenas
- Haz clic en el botón **"+"** en la barra lateral
- Selecciona una imagen 360° equirectangular (JPG, PNG)
- La imagen aparecerá en la lista de escenas

### 2. Crear Hotspots
- Haz clic en cualquier punto de la imagen 360°
- Se crea un hotspot que puedes configurar

### 3. Tipos de Hotspots

**🚪 SCENE (Escena)**
- Enlaza a otra escena del tour
- Perfecto para crear recorridos virtuales

**🔗 LINK (Enlace)**
- Abre una URL externa en nueva pestaña
- Útil para información adicional

**🖼️ IMAGE (Imagen)**
- Muestra una imagen en overlay
- Ideal para mostrar detalles o galerías

### 4. Guardar Proyecto
- Botón **"Guardar Proyecto"** → Descarga archivo `.pano`
- Incluye todas las escenas e imágenes
- Puedes cargarlo después con **"Cargar Proyecto"**

### 5. Exportar Tour
- Botón **"Exportar Tour"** → Descarga archivo `.zip`
- Contiene HTML standalone + imágenes
- Listo para subir a cualquier hosting

## 📸 Formatos de Imagen Recomendados

### Imágenes 360° (Escenas)
- **Formato**: Equirectangular (proyección 2:1)
- **Resolución**: 4096x2048 o 8192x4096 píxeles
- **Tipo**: JPG o PNG
- **Fuentes**:
  - Cámaras 360° (Ricoh Theta, Insta360, etc.)
  - Software de renderizado 3D
  - Conversión desde otras proyecciones

### Imágenes de Hotspots
- **Resolución**: Máximo 2000x2000 píxeles
- **Tipo**: JPG o PNG
- Mantén el tamaño razonable para web

## 🛠️ Tecnologías

- **React** + **TypeScript** - Framework y tipado
- **Three.js** - Renderizado 3D de imágenes 360°
- **Vite** - Build tool ultrarrápido
- **JSZip** - Generación de archivos ZIP
- **IndexedDB** - Almacenamiento local de proyectos
- **Lucide React** - Iconos modernos
- **GitHub Actions** - CI/CD automático

## 📂 Estructura del Proyecto

```
360-studio/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Configuración de GitHub Actions
├── components/
│   ├── EditorSidebar.tsx
│   ├── HotspotPanel.tsx
│   └── Viewer.tsx
├── utils/
│   ├── db.ts                   # Gestión de IndexedDB
│   └── exportTour.ts           # Exportación a ZIP
├── App.tsx                     # Componente principal
├── index.html
├── package.json
├── vite.config.ts              # Configurado para GitHub Pages
├── .gitignore
└── README.md
```

## 🐛 Solución de Problemas

### La imagen 360° no se ve
- Verifica que sea formato equirectangular (2:1)
- Prueba con una resolución menor si es muy grande
- Asegúrate que el archivo sea JPG o PNG

### El hotspot no aparece
- Haz clic en modo editor (no preview)
- Verifica que la escena esté activa
- Prueba refrescando la página

### El export no funciona
- Asegúrate de tener al menos una escena
- Verifica que las imágenes estén cargadas
- Abre la consola del navegador (F12) para ver errores

### GitHub Pages muestra pantalla en blanco
- Verifica que configuraste Source como "GitHub Actions"
- Espera 2-3 minutos, GitHub puede tardar en publicar
- Limpia la caché del navegador (Ctrl+Shift+R)
- Revisa los logs del workflow en Actions

### El workflow de GitHub Actions falla
- Revisa los logs en la pestaña Actions
- Verifica que package-lock.json esté actualizado
- Asegúrate de que Settings → Actions tenga permisos de escritura

## 📄 Licencia

Creative Commons BY-NC-SA

Creado por **@GmedranoTIC**

---

## 🤝 Contribuir

¿Encontraste un bug o tienes una sugerencia?
- Abre un Issue en GitHub
- Envía un Pull Request
- Contacta al autor

## 📧 Contacto

- Twitter/X: [@GmedranoTIC](https://twitter.com/GmedranoTIC)
- GitHub: Issues del repositorio

---

## 📚 Documentación Adicional

- [Guía Rápida](GUIA_RAPIDA.md) - Tutorial de 17 minutos
- [GitHub Pages con Actions](GITHUB_PAGES_CON_ACTIONS.md) - Deploy automático paso a paso
- [Mejoras Realizadas](MEJORAS_REALIZADAS.md) - Changelog técnico

---

**¡Disfruta creando tours virtuales 360°!** 🎉

**Deploy automático**: Cada push a `main` despliega en minutos
**Sin configuración**: GitHub Actions hace todo el trabajo
**100% Gratis**: GitHub Pages sin costos
