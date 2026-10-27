# Cambios

## 1.0.1

- Corrige **Anular** en el ejecutable: sustituye `window.prompt`, no admitido por Electron, por un formulario de confirmación dentro de la aplicación.
- Exige motivo y responsable; permite cancelar sin cambios. Conserva las lecturas y registra la anulación en la trazabilidad. Si falla el almacenamiento, informa del error y no confirma la operación.
- Corrige **Documentar revisión**, que usaba el mismo diálogo incompatible.
- Mantiene el perfil de datos y el formato de respaldo de la versión 1.0.0. Cierra la versión anterior antes de abrir el nuevo ejecutable.
- Añade pruebas de anulación, cancelación, persistencia tras reiniciar, revisión y fallo de almacenamiento.
