# Q-MONITOR · Industrial Quality Intelligence

Aplicación de escritorio para **Windows**, en español, para captura **manual** de pH, temperatura y humedad, análisis por lote y documentación de evidencia de ingeniería. Incluye su propio motor Electron y abre una ventana propia, sin navegador externo ni instalaciones de Node para el usuario. La interfaz usa React + TypeScript, Recharts y almacenamiento local validado con Zod. No necesita sensores, backend, cuenta ni claves externas. Se conserva una alternativa web para desarrollo.

## Guía de uso en PDF

[Descargar la guía práctica de Q-MONITOR](docs/Guia-de-uso-Q-MONITOR.pdf): 8 páginas con capturas, registro, anulación, límites, análisis, metrología, reportes y respaldos.

## Descargar y abrir con doble clic

**[Descargar Q-MONITOR.exe para Windows](https://github.com/du38atencion/APP-ESTADISTICA-/releases/download/v1.0.1/Q-MONITOR-1.0.1-Portatil-x64.exe)**

Guarda el archivo y ábrelo. No necesitas descargar el código, instalar Node.js ni abrir una terminal. Es el ejecutable portátil completo para Windows 10/11 x64. [Ayuda de uso](WINDOWS.md). La publicación incluye la huella SHA-256 del ejecutable.

La versión 1.0.1 corrige los diálogos de anulación y revisión en la aplicación de escritorio. Cierra la versión anterior antes de abrir la nueva; el perfil y las mediciones se conservan. [Cambios](CHANGELOG.md).

## Aplicación de escritorio Windows (.exe)

La entrega principal para Windows es **Q-MONITOR-Instalador-1.0.1-x64.exe**. Instala la aplicación, crea un acceso directo y abre una ventana propia, sin navegador externo, Node.js ni terminal para el usuario. Descarga el instalador en la sección **Releases** del repositorio. [Instrucciones para Windows](WINDOWS.md).

Los datos de escritorio quedan en **%APPDATA%\Q-MONITOR**, separados de la versión web; exporta respaldos JSON desde Reportes. No se necesita conexión a Internet para usarlo.

Para mantener o recompilar la aplicación: `npm run build:windows`. La configuración de empaquetado está en `electron-builder.yml`; el proceso principal aislado y sin Node en la interfaz está en `electron/main.cjs`. GitHub Actions compila, prueba y publica el instalador en Windows.

## Alternativa web portátil (no es la aplicación de escritorio)

Abre **Q-MONITOR.html** con doble clic en Chrome o Edge actualizado. Toda la aplicación y sus librerías están incluidas en ese archivo: no necesita Node.js, terminal, servidor ni conexión a Internet. Es una aplicación web portátil; no es un instalador nativo de Windows.

Guarda el archivo en una carpeta fija y usa siempre el mismo navegador y perfil. El almacenamiento de archivos locales depende del navegador y puede cambiar al mover o renombrar el HTML. Antes de moverlo o actualizarlo, usa **Reportes → Descargar respaldo completo** y restaura el JSON en la nueva copia. No uses modo privado. Los datos no se guardan dentro del HTML.

Para reproducir este archivo desde el proyecto: `npm run build:portable`. El resultado es `portable/index.html`, que se distribuye con el nombre `Q-MONITOR.html`. La prueba `e2e/portable.spec.ts` carga el HTML empaquetado mediante una ruta interceptada de Playwright, con la red desactivada, y verifica captura, recarga, gráficas y exportación sin recursos externos. La apertura directa por `file://` no pudo verificarse aquí: el Chromium administrado del entorno bloquea esa navegación por política. Debe comprobarse en el navegador de destino.

## Ejecutar

Requisitos: Node.js 22.12 o superior (validado con Node 24), npm y navegador moderno.

```bash
cd /workspace/APP-ESTADISTICA-
npm ci --cache /tmp/q-monitor-npm
npm run dev -- --port 5173
```

El servidor escucha en el puerto 5173. Para generar y servir la versión de producción:

```bash
npm run build
npm run preview -- --port 4173
```

El directorio `dist/` puede desplegarse en alojamiento estático HTTPS. Mantén un origen estable: el almacenamiento del navegador está aislado por dominio, protocolo y puerto. Cambiar del servidor de desarrollo al de producción no transporta los datos; usa respaldo y restauración.

## Primer uso y pantallas

1. **Configuración:** personaliza identidad, organización y catálogos. Añade criterios por producto, etapa y variable, con vigencia, fuente y resolución opcional. No hay límites normativos preestablecidos.
2. **Registro:** identifica producto, lote, operador, fecha local corregible, etapa e instrumento; introduce lecturas. Puedes guardar un borrador con valores ausentes. El código se genera al guardar.
3. **Lotes e historial:** busca, combina filtros, ordena, pagina y consulta el código. Para corregir se exige motivo y se conserva la versión anterior en la auditoría. La anulación pide motivo y confirmación, excluye el registro y no lo destruye. Selecciona varios lotes para comparar tendencias en escalas separadas.
4. **Dashboard:** ocho indicadores, tendencia seleccionable para las tres variables, distribución de estados e historial reciente. Parte vacío; “Explorar demo” abre datos ficticios aislados con advertencia permanente.
5. **Análisis estadístico:** resúmenes separados por producto, lote y tipo de humedad; tendencias, histogramas, dispersión con ejes seleccionables y cajas. I-MR exige ≥20 observaciones por grupo y confirmación explícita del muestreo apropiado.
6. **Validación metrológica:** pares prototipo/referencia, muestra, sesión, instrumento, método, condiciones, repetición y criterio documentado. Filtra variable, sesión, instrumento y tipo de humedad. Incluye identidad y=x, diferencias, distribución y repetibilidad agrupada.
7. **Alertas:** desviaciones frente a la copia del criterio aplicada al capturar. Registra responsable, estado de atención, investigación, disposición y acción correctiva sin cambiar el resultado medido.
8. **Simulación:** compara minutos de inspección y costos actuales/propuestos. Identifica periodo, estimación u observación y fuente. Los supuestos quedan guardados.
9. **Evaluación económica:** inversión, costos mensuales, beneficio bruto, contribución por lote, tasa y horizonte; compara tres escenarios con factores introducidos por el usuario.
10. **Reportes:** ocho tipos de informe, filtros de mediciones, CSV, Excel y PDF mediante impresión del navegador; respaldo completo y restauración. Los informes metrológicos usan la selección de su módulo.

Los estados son: borrador, no evaluable, pendiente de revisión, conforme, fuera de especificación y anulado. Una medición completa con todos los criterios y dentro de límites queda pendiente hasta documentar su revisión desde el detalle. Si faltan criterios no se declara conforme. Las alertas no liberan ni rechazan productos.

## Guardar, respaldar y recuperar

Cada operación confirmada persiste en `localStorage`: claves `qmonitor-real` y `qmonitor-demo`. La recarga conserva los datos. **Solo se guardan en ese navegador y origen; no se sincronizan en la nube.** No borres datos del sitio ni uses navegación privada para registros permanentes.

En **Reportes → Descargar respaldo completo**, descarga JSON con todos los registros, borradores, anulados, reglas y auditoría del espacio activo. Conserva copias fuera del navegador. CSV y Excel sirven para análisis, pero no reemplazan el respaldo completo. Para recuperar, selecciona el JSON en “Restaurar respaldo”; se valida su estructura y se pide confirmación antes de reemplazar el espacio activo. Descarga el respaldo actual primero. Se rechazan archivos inválidos y archivos de más de 20 MB.

Los errores de almacenamiento se muestran y no se confirman como guardados. No hay respaldo automático externo, cifrado, control de acceso ni garantía contra modificaciones desde las herramientas del navegador. No abras el mismo espacio en varias pestañas para editar simultáneamente: esta versión es local y de un solo operador.

## Métodos de cálculo

- Solo registros completos, no borradores y no anulados alimentan los análisis. Un campo vacío sigue siendo `null`, nunca cero. Los filtros conservan la relación producto/lote/fecha.
- Media = Σx/n. Mediana de valores ordenados. Rango = máximo − mínimo. Desviación muestral = √[Σ(x−media)²/(n−1)], solo con n≥2. No se mezclan productos, lotes ni tipos de humedad en resúmenes.
- CV = 100s/media solo para humedad porcentual con media positiva. Se omite para pH logarítmico y temperatura Celsius (escala sin cero absoluto).
- Fuera de límites: comparación inclusiva [inferior, superior]. El porcentaje usa solo observaciones con criterio de esa variable. Los criterios se copian al registro; desactivar una regla no altera el historial. No existe reevaluación automática retroactiva.
- Cajas: Q1, mediana y Q3 por interpolación lineal; bigotes en mínimo y máximo, sin clasificación de atípicos de Tukey. Histogramas: número de intervalos aproximado a √n, de anchura uniforme.
- I-MR exploratorio: media ±2.66 MR̄; rangos móviles de pares consecutivos, límites 0 y 3.267 MR̄. Los límites estadísticos no son límites de aceptación. No se detectan automáticamente todas las reglas de rachas ni se prueba independencia o estabilidad.
- Metrología: diferencia = prototipo − referencia; absoluto = |d|; relativo = 100|d|/|referencia| (se omite para pH y |referencia|<10⁻⁸). Sesgo = media(d), MAE = media(|d|), RMSE = √media(d²). Repetibilidad: s de lecturas del prototipo agrupadas por misma sesión, muestra, referencia, instrumento, método y condiciones declaradas. La incertidumbre no se equipara al sesgo ni se calcula automáticamente.
- Simulación: tiempo actual = muestra + medición + registro + transcripción + revisión; propuesto = muestra + medición + registro en aplicación + revisión. Se multiplica por inspecciones/lote y lotes/periodo. Costos = horas × tarifa; capacidad teórica = 60/minutos por inspección. Sin paralelismo ni tiempos muertos.
- Economía: suma de inversión y costos mensuales, costo anual = 12×mensual. Flujo neto mensual = beneficio bruto − costo mensual. Recuperación simple = inversión/flujo positivo. Equilibrio operativo = costo mensual/contribución por lote positiva. VPN = −inversión + Σ flujo anual/(1+tasa)^año; horizonte entero hasta 50 años. Sin impuestos, inflación, financiación ni valor residual. Si faltan datos no se genera evaluación. Los factores conservador/base/optimista deben ingresarse explícitamente.

## Verificación

```bash
npm test
npm run build
npx playwright test
npm audit --omit=dev
```

Playwright usa Chromium instalado en `/usr/bin/chromium`, configurable en `playwright.config.ts`. En otro equipo, instala el navegador o cambia `executablePath`. Los tests abren contextos aislados y no tocan tus registros del navegador habitual.

Las pruebas cubren estadísticas conocidas, datos faltantes, resolución y rangos, límites inclusivos, criterios históricos, filtros, metrología, exportación y formato de respaldo. Las pruebas de navegador cubren captura, recarga, edición trazable, descarga CSV/Excel/JSON, restauración, rechazo de respaldo inválido, demo aislada, gráficas, revisión y vista móvil de 390 px.

## Alcance y limitaciones

Prototipo académico local funcional, no sistema validado para liberación regulada. La identidad del operador es declarativa; la auditoría local no es inmutable ni una firma electrónica. No hay roles, autenticación, servidor multiusuario, sincronización, integración con instrumentos ni certificación normativa. La resolución debe corresponder al instrumento usado. Se admite pH 0–14 en esta versión; métodos fuera de ese intervalo requieren ampliar la validación. La humedad relativa y base húmeda están entre 0 y 100 %; la base seca puede superar 100 %.

Los criterios de metrología se documentan con cada par: un procedimiento experimental externo debe asegurar que se establecieron antes del ensayo. Esta versión no ofrece bloqueo de un protocolo prerregistrado ni presupuesto de incertidumbre. Las conclusiones describen datos, no causalidad.

PDF usa el diálogo de impresión; gráficos SVG requieren un navegador moderno y la paginación depende de sus opciones. CSV/Excel exportan lecturas o pares metrológicos; los indicadores económicos y estadísticos completos se incluyen en el informe imprimible. Los reportes de simulación y economía muestran además los supuestos y resultados del modelo. No hay selección individual de columnas exportadas. La frecuencia de captura se guarda como referencia, sin notificaciones automáticas.

Futuras mejoras: backend con base de datos y migraciones, autenticación y permisos, bitácora inmutable, copias automáticas, validación de protocolos metrológicos, pruebas con operadores reales e importación desde una API de instrumentos. Una conexión física futura debe conservar el dato original, identificador de instrumento, unidad, instante, método y origen de cada lectura, y tratar los fallos de comunicación sin crear lecturas ficticias.

## Estructura

- `src/domain.ts`: modelos, validación, cálculos y exportación tabular.
- `src/main.tsx`: navegación y flujos de los diez módulos.
- `src/AdvancedCharts.tsx`: control estadístico y repetibilidad.
- `src/style.css`: diseño adaptable e impresión.
- `src/domain.test.ts`, `e2e/app.spec.ts`: pruebas de lógica y navegador.

La publicación del entorno, la entrega del código a GitHub y la publicación del instalador son operaciones separadas. Los datos experimentales locales nunca se incluyen en el repositorio.
