# Cambios

## 1.2.0

- Sustituye los formularios manuales del estudio R&R por carga de CSV, TXT, TSV, Excel XLSX y JSON con análisis inmediato de cada columna numérica.
- Muestra tendencia, histograma, caja, estadísticos y control individual exploratorio sin recapturar valores, parte, operador ni repetición.
- Reutiliza automáticamente mediciones históricas y estudios guardados. Incluye los archivos cargados en el respaldo y mantiene el perfil de datos anterior.
- Solo calcula R&R ANOVA si la identificación experimental ya está presente en el archivo o estudio guardado; no fabrica etiquetas para simular un estudio con valores sin identificar.
- Mantiene la captura manual anterior como opción plegada, preservando historial, edición y auditoría.
- Añade pruebas de carga, reconocimiento de columnas, actualización de gráficas, Excel, persistencia, respaldo y conservación de datos.

## 1.1.0

- Retira Simulación de procesos, Evaluación económica y sus reportes de la interfaz.
- Añade estudios R&R cruzados por ANOVA en Análisis estadístico: parte, operador, repetición y lectura; captura individual o tabla de Excel, sin duplicados.
- Incluye resumen de capacidad, ANOVA con interacción y agrupación no significativa, componentes de varianza, % contribución, % variación de estudio, % tolerancia, ndc y las seis gráficas de referencia.
- Recalcula resultados y gráficas al guardar, importar, corregir o eliminar lecturas del estudio; valida diseño completo y balanceado.
- Añade CSV de lecturas R&R e informe imprimible/PDF. Los estudios se incluyen en el respaldo JSON.
- Conserva perfil `%APPDATA%\Q-MONITOR`, origen `qmonitor://app`, claves de almacenamiento y respaldos versión 1; no elimina mediciones, reglas ni auditoría anteriores. Conserva también campos legados de los módulos retirados.
- Agrega pruebas numéricas contra valores de referencia y pruebas de interfaz de actualización, persistencia, compatibilidad de respaldos y fallos de almacenamiento.

## 1.0.1

- Corrige **Anular** en el ejecutable: sustituye `window.prompt`, no admitido por Electron, por un formulario de confirmación dentro de la aplicación.
- Exige motivo y responsable; permite cancelar sin cambios. Conserva las lecturas y registra la anulación en la trazabilidad. Si falla el almacenamiento, informa del error y no confirma la operación.
- Corrige **Documentar revisión**, que usaba el mismo diálogo incompatible.
- Mantiene el perfil de datos y el formato de respaldo de la versión 1.0.0. Cierra la versión anterior antes de abrir el nuevo ejecutable.
- Añade pruebas de anulación, cancelación, persistencia tras reiniciar, revisión y fallo de almacenamiento.
