# Q-MONITOR para Windows

Aplicación de escritorio con ventana propia. No abre Chrome ni Edge y no necesita instalar Node.js, ejecutar comandos ni descargar librerías durante su uso. Incluye Electron y todos los componentes necesarios.

## Abrir directamente sin instalar

Descarga **Q-MONITOR-1.1.0-Portatil-x64.exe** y ábrelo con doble clic. Las versiones publicadas están en [Releases](https://github.com/du38atencion/APP-ESTADISTICA-/releases); el nuevo binario generado se entrega desde `release/`. Es una aplicación de escritorio autocontenida, no un HTML. En el primer inicio puede tardar unos segundos en extraer sus componentes; no instala Node ni abre terminales. Guarda los datos en el mismo perfil local de Q-MONITOR.

## Actualizar desde las versiones 1.0.x

Cierra la aplicación anterior con **Archivo → Salir** antes de abrir la versión 1.1.0. No necesitas desinstalar ni borrar datos: se mantiene el mismo perfil local. Como precaución, puedes descargar un respaldo JSON desde Reportes antes de actualizar.

Para anular: **Lotes e historial → Anular**, completa responsable y motivo y pulsa **Confirmar anulación**. Cancelar o cerrar el diálogo no cambia el registro. Se excluye de los análisis pero permanece en la trazabilidad. También se corrigió el diálogo de Documentar revisión.

La versión 1.1.0 retira Simulación de procesos y Evaluación económica y añade **Análisis estadístico → R&R por ANOVA**. Crea un estudio, define característica/unidad y registra parte, operador, repetición y lectura. Puedes pegar cuatro columnas desde Excel. Las tablas y gráficas se actualizan al guardar; los estudios se incluyen en el respaldo JSON. Las lecturas históricas permanecen intactas.

## Descargar e instalar

1. Para la variante con instalación, compila en Windows o usa el flujo de GitHub Actions para generar **Q-MONITOR-Instalador-1.1.0-x64.exe**. El EXE portátil entregado se abre directamente sin instalación.
2. Abre el archivo con doble clic. Se instala para tu usuario y crea un acceso directo **Q-MONITOR** en el escritorio y en Inicio.
3. La aplicación se abre al finalizar. Después usa el acceso directo para iniciarla.

Compatible con **Windows 10 y 11 de 64 bits (x64)**. No necesita permisos de administrador para una instalación normal por usuario. El instalador no tiene firma digital comercial: Windows puede mostrar “editor desconocido” y las políticas de equipos administrados pueden impedir ejecutarlo. No desactives el antivirus ni los controles de tu organización.

La aplicación funciona sin conexión a Internet. No conecta sensores ni sincroniza datos en la nube. Las lecturas se introducen manualmente.

## Datos y respaldos

Los datos se guardan en el perfil local de la aplicación, bajo **%APPDATA%\Q-MONITOR**, separados del navegador. Las actualizaciones conservan ese perfil. Solo se permite una instancia abierta por usuario.

Usa **Reportes → Descargar respaldo completo** para guardar un JSON en una carpeta que elijas mediante el diálogo de Windows. Incluye mediciones, borradores, anulados, reglas, trazabilidad y estudios R&R. CSV y Excel no sustituyen ese respaldo completo. El menú **Ayuda → Carpeta de datos locales** permite localizar el perfil, pero para trasladar datos utiliza siempre el respaldo JSON y la restauración dentro de la aplicación.

Antes de cambiar de PC, actualizar o desinstalar, descarga un respaldo. El desinstalador conserva los datos, pero no los protege de una limpieza manual del perfil de Windows ni de una falla del disco. No copies mediciones reales al repositorio de GitHub.

Para PDF, abre el informe y usa **Imprimir / PDF**, seleccionando una impresora PDF disponible en Windows.

## Integridad y límites

La publicación incluye `SHA256SUMS.txt` con la huella del instalador. No existe autenticación multiusuario, auditoría inmutable, cifrado del perfil ni certificación normativa. No se necesitan claves, servicios externos ni hardware adicional para la captura manual.

Las pruebas de escritorio verifican ventana propia, contexto aislado, ausencia de Node.js en la interfaz, captura, persistencia tras cerrar/reabrir y exportaciones. Los ejecutables se generan como aplicaciones Windows; generarlos no equivale a haber verificado su instalación en todos los equipos. El flujo de GitHub Actions recompila y prueba el escritorio en Windows antes de publicar.

## Para desarrollo

El usuario final **no necesita estos comandos**. Para mantener el código: Node.js 24, `npm ci`, `node node_modules/electron/install.js`, `npm run desktop`. Para generar el instalador en Windows: `npm run build:windows`. `npm run test:desktop` ejecuta las pruebas de la aplicación en un perfil temporal aislado; requiere una sesión gráfica (en Linux puede usarse Xvfb).
