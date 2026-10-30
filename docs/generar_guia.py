"""Genera la guía PDF de usuario. Requiere reportlab y las fuentes DejaVu Sans.
Ejecutar desde el repositorio: python docs/generar_guia.py
Las capturas son de un perfil aislado con datos de demostración, nunca datos reales.
"""
from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether, Flowable
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parent
FONT = Path('/usr/share/fonts/truetype/dejavu')
for name, filename in [('Sans','DejaVuSans.ttf'),('SansBold','DejaVuSans-Bold.ttf'),('SansItalic','DejaVuSans-Oblique.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT/filename)))
pdfmetrics.registerFontFamily('Sans',normal='Sans',bold='SansBold',italic='SansItalic',boldItalic='SansBold')
NAVY=colors.HexColor('#14364d'); BLUE=colors.HexColor('#117cbb'); INK=colors.HexColor('#243e50'); MUTED=colors.HexColor('#637e90'); LINE=colors.HexColor('#dce6ed'); PALE=colors.HexColor('#edf5fa')
W,H=A4; M=42; CW=W-2*M
S={
 'body':ParagraphStyle('body',fontName='Sans',fontSize=9.5,leading=14,textColor=INK,spaceAfter=7),
 'small':ParagraphStyle('small',fontName='Sans',fontSize=8.1,leading=11.5,textColor=MUTED,spaceAfter=6),
 'h1':ParagraphStyle('h1',fontName='SansBold',fontSize=22,leading=27,textColor=NAVY,spaceAfter=10),
 'h2':ParagraphStyle('h2',fontName='SansBold',fontSize=12,leading=17,textColor=NAVY,spaceBefore=10,spaceAfter=6),
 'kicker':ParagraphStyle('kicker',fontName='SansBold',fontSize=8,leading=12,textColor=BLUE,spaceAfter=7),
 'cell':ParagraphStyle('cell',fontName='Sans',fontSize=8.4,leading=12,textColor=INK),
 'head':ParagraphStyle('head',fontName='SansBold',fontSize=8.4,leading=12,textColor=colors.white),
}
story=[]
def p(t,style='body'):return Paragraph(t,S[style])
def add(t,style='body'):story.append(p(t,style))
def title(n,t,lead):
    add(f'GUÍA PRÁCTICA / {n:02d}','kicker');add(t,'h1');add(lead)
def sub(t):add(t,'h2')
def step(n,t):add(f'<b>{n:02d}.</b> {t}')
def note(t):
    table=Table([[p(t)]],colWidths=[CW]);table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('LINEBEFORE',(0,0),(0,-1),3,BLUE),('LEFTPADDING',(0,0),(-1,-1),11),('RIGHTPADDING',(0,0),(-1,-1),11),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),4)]));story.extend([Spacer(1,5),table,Spacer(1,6)])
def table(headers,rows,widths=None):
    cells=[[p(h,'head') for h in headers]]+[[p(str(c),'cell') for c in row] for row in rows]
    t=Table(cells,colWidths=widths or [CW/len(headers)]*len(headers),repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f5f8fa')]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.4,LINE)]))
    story.extend([t,Spacer(1,8)])
def image(name,width=CW,maxheight=220):
    im=Image(str(ROOT/'guia-imagenes'/name));scale=min(width/im.imageWidth,maxheight/im.imageHeight);im.drawWidth=im.imageWidth*scale;im.drawHeight=im.imageHeight*scale;im.hAlign='CENTER';story.extend([im,Spacer(1,5)])
def page():story.append(PageBreak())
class Hero(Flowable):
    def __init__(self):super().__init__();self.width=CW;self.height=158
    def draw(self):
        c=self.canv;c.setFillColor(NAVY);c.roundRect(0,0,self.width,self.height,10,fill=1,stroke=0);c.setFillColor(BLUE);c.roundRect(20,116,112,21,5,fill=1,stroke=0);c.setFillColor(colors.white);c.setFont('SansBold',8);c.drawString(30,123,'GUÍA DE USUARIO');c.setFont('SansBold',30);c.drawString(21,76,'Q-MONITOR');c.setFont('Sans',16);c.drawString(23,49,'Captura, analiza y conserva tu evidencia.');c.setFont('Sans',9);c.setFillColor(colors.HexColor('#b7d3e3'));c.drawString(23,23,'Windows 10/11 x64  ·  Versión 1.0.1  ·  Edición octubre de 2026')

# 1
story.extend([Hero(),Spacer(1,18)])
add('Empieza por lo importante','h1')
add('Q-MONITOR permite registrar <b>manualmente</b> mediciones de pH, temperatura y humedad, organizarlas por lote y analizarlas. Funciona como aplicación de escritorio, sin conexión directa a sensores ni necesidad de Internet durante su uso.')
sub('Tu recorrido de trabajo')
table(['Paso','Qué hacer'],[
('1 · Preparar','Configura productos, operadores, instrumentos y criterios documentados.'),
('2 · Capturar','Registra producto, lote, fecha, responsable y lecturas del instrumento.'),
('3 · Revisar','Consulta el lote, corrige con motivo y documenta la revisión o desviación.'),
('4 · Analizar','Aplica filtros y consulta tendencias, estadísticas o comparaciones.'),
('5 · Respaldar','Exporta el informe y descarga un respaldo completo en formato JSON.')],[105,CW-105])
sub('Dónde encontrar cada tema')
toc=[('Abrir, configurar límites y entender estados','2'),('Registrar y distinguir tipos de humedad','3'),('Consultar, editar, anular y revisar','4'),('Dashboard y análisis estadístico','5'),('Metrología y atención de desviaciones','6'),('Simulación y evaluación económica','7'),('Reportes, respaldo y solución de problemas','8')]
t=Table([[p(t,'cell'),p(n,'cell')] for t,n in toc],colWidths=[CW-30,30]);t.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),('LINEBELOW',(0,0),(-1,-1),.3,LINE)]));story.extend([t,Spacer(1,8)])
note('<b>Regla esencial:</b> los datos se guardan en tu equipo, no en la nube ni dentro del archivo EXE. Guarda respaldos JSON regularmente. Las capturas de esta guía usan <b>DATOS DE DEMOSTRACIÓN</b>, separados de los registros reales.')

# 2
page();title(2,'Inicio y configuración','Prepara el espacio de trabajo antes de evaluar resultados de calidad.')
step(1,'Abre el <b>.exe de la versión 1.0.1</b> con doble clic. No necesitas instalar Node.js ni abrir terminales. Con instalador, también puedes usar el acceso directo Q-MONITOR.')
step(2,'Entra en <b>Configuración</b>. Personaliza el nombre y la organización. Añade productos, operadores, instrumentos, etapas y métodos de referencia; escribe un elemento por línea y pulsa <b>Guardar configuración</b>.')
sub('Configurar criterios de aceptación')
add('En <b>Configuración → Criterios de aceptación</b>, pulsa <b>Añadir criterio</b> después de completar:')
table(['Campo','Qué debes indicar'],[
('Producto y etapa','Deben coincidir con los datos de la medición.'),
('Variable y humedad','pH, temperatura o humedad; en esta última, el tipo de humedad correspondiente.'),
('Límites y resolución','Al menos un límite; inferior ≤ superior. Resolución positiva, solo si se conoce.'),
('Vigencia y fuente','Fecha desde la que aplica y documento, método o justificación del criterio.')],[116,CW-116])
add('Para cambiar un criterio, <b>desactiva la regla vigente y crea otra</b>. Cada medición conserva la copia del criterio aplicado al capturarla; el historial no se reevalúa silenciosamente. No se incluyen límites normativos universales.')
sub('Cómo interpretar el estado')
table(['Estado','Significado práctico'],[
('Borrador','Registro todavía incompleto o guardado como borrador; no entra en el análisis.'),
('No evaluable','Faltan criterios o información suficiente para evaluar la aceptación.'),
('Pendiente de revisión','Lecturas completas y dentro de los criterios; falta documentar la revisión.'),
('Conforme','Cumple los criterios registrados y tiene la revisión documentada.'),
('Fuera de especificación','Al menos una lectura incumple un límite aplicado.'),
('Anulado','Sale del historial activo y de los cálculos; se conserva su trazabilidad.')],[116,CW-116])
note('<b>Sin criterio de aceptación configurado</b> no significa “conforme”. La aplicación no certifica cumplimiento normativo ni libera productos automáticamente.')

# 3
page();title(3,'Registrar una medición','Ruta: Registro de mediciones o botón Nueva medición.')
step(1,'Completa los campos obligatorios: <b>producto, lote, fecha y hora, operador, etapa e instrumento</b>. El código se genera al guardar. Puedes corregir la fecha para documentar una lectura anterior.')
step(2,'Introduce pH, temperatura y humedad en sus campos. Indica resolución de pH si la conoces, ubicación o condición de temperatura y observaciones cuando sean útiles.')
image('registro.png',maxheight=178)
add('Campos reales de la versión 1.0.1. El formulario se muestra sin lecturas para no presentar datos ficticios como mediciones reales.','small')
sub('No mezcles los tipos de humedad')
table(['Selección','Qué representa'],[
('Relativa ambiental · % HR','Humedad del aire; no equivale al contenido de agua del producto.'),
('Contenido · base húmeda · % b.h.','Contenido respecto de la masa húmeda, según el método usado.'),
('Contenido · base seca · % b.s.','Contenido respecto de la masa seca. Puede superar 100 %.')],[178,CW-178])
step(3,'Pulsa <b>Guardar medición</b> si las tres lecturas están completas. Si falta una lectura, usa <b>Guardar borrador</b>; el valor ausente no se convierte en cero.')
step(4,'Lee la confirmación y comprueba el lote, los valores y el estado. En <b>Lotes e historial</b> puedes consultar el registro guardado.')
note('<b>Validaciones:</b> pH de 0 a 14; temperatura no menor de −273.15 °C; humedad no negativa. % HR y % b.h. no superan 100 %. Las lecturas deben respetar la resolución configurada. Si aparece un error, corrígelo antes de guardar.')
add('El programa detecta duplicados con el mismo producto, lote, fecha y lecturas. No sustituyas una lectura faltante por cero para completar un registro.','small')

# 4
page();title(4,'Consultar, corregir y anular','Ruta: Lotes e historial. Una corrección o anulación debe dejar un motivo.')
sub('Buscar y corregir')
add('Usa la búsqueda y combina producto, lote, fechas y estado. Los encabezados con flechas permiten ordenar. Pulsa el <b>código</b> para ver el detalle; <b>Editar</b> abre el formulario. Corrige el dato, escribe el <b>motivo de la corrección</b> y guarda. Se conservan los valores anteriores en la auditoría.')
sub('Anular una medición: paso a paso')
step(1,'Busca la fila y pulsa <b>Anular</b>, en rojo, junto a Editar.')
step(2,'En el formulario, confirma el <b>responsable</b> y escribe el <b>motivo de la anulación</b>. El botón se habilita cuando ambos están completos.')
step(3,'Pulsa <b>Confirmar anulación</b>. Si no quieres continuar, usa Cancelar, la X o Escape; el registro no cambia.')
image('anular.png',width=265,maxheight=248)
add('Diálogo de la versión 1.0.1 con un registro de DEMOSTRACIÓN. No se ha anulado ninguna medición real para esta guía.','small')
add('Al confirmar, la medición desaparece del historial activo y de los cálculos. <b>No se destruyen sus lecturas:</b> el responsable, la fecha y el motivo quedan en <b>Configuración → Historial de trazabilidad</b>, y el registro se conserva en el respaldo completo.')
sub('Documentar la revisión')
add('Abre el código de un registro <b>Pendiente de revisión</b>, pulsa <b>Documentar revisión</b>, indica responsable y notas opcionales y pulsa <b>Confirmar revisión</b>. Una desviación no se convierte en conforme por documentar una decisión.')

# 5
page();title(5,'Dashboard y análisis estadístico','Primero selecciona el producto, lote y periodo que realmente quieres estudiar.')
add('En <b>Dashboard general</b> verás las últimas lecturas, totales, lotes, pendientes, desviaciones y porcentaje de registros completos. Cambia entre pH, temperatura y humedad para consultar su tendencia. Para humedad, selecciona también el tipo.')
image('dashboard.png',maxheight=205)
add('Ejemplo con DATOS DE DEMOSTRACIÓN: las cifras y límites son ficticios y no son valores recomendados para tu producto.','small')
sub('Qué observar en Análisis estadístico')
table(['Indicador o gráfica','Interpretación útil'],[
('n y faltantes','Comprueba cuántos registros completos se usaron y qué información falta.'),
('Media y mediana','Describen el centro de las lecturas; no sustituyen el criterio de aceptación.'),
('Rango y s muestral','Describen dispersión. La desviación muestral necesita al menos dos datos.'),
('Fuera / %','Cuenta incumplimientos; el porcentaje usa observaciones con criterio de esa variable.'),
('Tendencia e histograma','Muestran evolución temporal y distribución de lecturas.'),
('Dispersión y caja','Exploran asociaciones entre variables y comparan distribuciones por grupo.')],[130,CW-130])
add('El resumen mantiene separados <b>producto, lote y tipo de humedad</b>. Se excluyen borradores, anulados y registros incompletos. Las lecturas fuera de especificación siguen siendo datos válidos de análisis, salvo que las excluyas mediante los filtros.')
note('<b>I-MR:</b> requiere al menos 20 observaciones por grupo y confirmar que el muestreo es apropiado. Los límites de control describen variación del proceso: <b>no son límites de aceptación</b>. El CV no se aplica al pH ni a temperatura en °C. Una correlación no demuestra causalidad.')

# 6
page();title(6,'Metrología y desviaciones','Compara el prototipo con una referencia y documenta qué se hizo ante un incumplimiento.')
sub('Validación metrológica')
step(1,'Define antes del ensayo el <b>criterio de aceptación</b> y su fuente. El programa lo registra con cada par; el procedimiento experimental debe asegurar que se fijó previamente.')
step(2,'En <b>Validación metrológica</b>, completa variable, muestra o lote, sesión, fecha, lecturas del prototipo y de referencia, instrumento y método de referencia, condiciones, repetición y máxima diferencia absoluta aceptada.')
step(3,'Pulsa <b>Guardar comparación</b>. Filtra por variable, sesión e instrumento; para humedad, por tipo. No interpretes como equivalentes ensayos con condiciones distintas.')
table(['Resultado','Cómo se calcula o interpreta'],[
('Diferencia con signo','Prototipo − referencia. El signo indica si la lectura quedó por encima o por debajo.'),
('Error absoluto','Valor absoluto de la diferencia.'),
('Error relativo','100 × |diferencia| / |referencia|. Se omite para pH y referencias próximas a cero.'),
('Sesgo, MAE y RMSE','Resumen del sentido y magnitud de las diferencias de los pares seleccionados.'),
('Repetibilidad','Dispersión de lecturas bajo la misma muestra, referencia, sesión, instrumento, método y condiciones declaradas.')],[124,CW-124])
note('<b>Ejemplo ficticio de cálculo:</b> prototipo 7.20 pH y referencia 7.00 pH → diferencia +0.20 pH; error absoluto 0.20 pH. Esto por sí solo no indica aceptación ni calcula incertidumbre.')
sub('Alertas y desviaciones')
step(1,'En <b>Alertas y desviaciones</b>, identifica producto, lote, variable, valor y límite incumplido. Revisa la fuente del criterio aplicado.')
step(2,'Completa responsable, estado de atención e investigación. Documenta disposición y acción correctiva, y pulsa <b>Guardar seguimiento</b>.')
step(3,'Usa el detalle y la trazabilidad para dar seguimiento. Registrar una acción no modifica la lectura original ni cambia automáticamente el resultado fuera de especificación.')
add('Una alta correlación con la referencia no demuestra exactitud ni conformidad. La incertidumbre requiere una evaluación específica de sus fuentes.','small')

# 7
page();title(7,'Simulación y evaluación económica','Estas pantallas generan proyecciones con tus supuestos; no demuestran mejoras por sí mismas.')
sub('Simulación de procesos')
step(1,'Define <b>lotes por periodo</b>, inspecciones por lote y el periodo al que te refieres.')
step(2,'Introduce tiempos por inspección en <b>minutos</b>: muestra, medición, registro actual, transcripción, revisión y registro mediante la aplicación. Añade el costo de personal en <b>MXN por hora</b>.')
step(3,'Indica si los tiempos son <b>estimaciones</b> u observaciones experimentales y documenta la fuente. Al modificar supuestos se actualiza la comparación.')
table(['Escenario','Componentes del tiempo'],[
('Proceso actual','Muestra + medición + registro manual + transcripción + revisión.'),
('Proceso propuesto','Muestra + medición + registro en aplicación + revisión.')],[118,CW-118])
add('Revisa minutos por lote, horas por periodo, diferencia de tiempos, costos y capacidad teórica. El modelo supone actividades secuenciales: no incluye paralelismo ni tiempos muertos. La aplicación no reduce automáticamente el tiempo físico de medición.')
sub('Evaluación económica')
step(1,'Captura la inversión inicial y los <b>costos recurrentes mensuales</b>, en MXN. Un campo vacío es información pendiente; usa cero solo cuando corresponda.')
step(2,'Completa lotes y mediciones mensuales, beneficio bruto mensual, contribución por lote, tasa anual de descuento y horizonte entero de hasta 50 años. Documenta la fuente de los supuestos.')
step(3,'Para comparar <b>conservador, base y optimista</b>, introduce sus factores de beneficio bruto. No se inventan factores ni ahorros.')
table(['Indicador','Lectura práctica'],[
('Costo por lote / medición','Distribuye el costo operativo mensual entre los volúmenes capturados.'),
('Ahorro neto y recuperación','Flujo mensual = beneficio bruto − costo mensual. Solo hay recuperación simple con flujo positivo.'),
('Equilibrio y VPN','El equilibrio operativo usa contribución positiva por lote; el VPN descuenta flujos con la tasa y horizonte indicados.')],[141,CW-141])
note('<b>Alcance del modelo:</b> sin impuestos, inflación, financiación ni valor residual. Los resultados son proyecciones. Para guardarlos con sus supuestos, usa el informe imprimible/PDF y el respaldo JSON.')

# 8
page();title(8,'Reportes, respaldo y solución rápida','El respaldo completo es la herramienta principal para proteger y trasladar tus registros.')
sub('Qué archivo necesitas')
table(['Formato','Para qué sirve'],[
('CSV o Excel','Analizar y compartir las mediciones filtradas; en el informe metrológico, los pares seleccionados. No son un respaldo completo.'),
('Informe PDF','En Reportes y exportación, elige el tipo y filtros; pulsa Imprimir / PDF y selecciona una impresora PDF disponible, como Microsoft Print to PDF.'),
('Respaldo JSON','Conserva configuraciones, reglas, mediciones, borradores, anulados, trazabilidad, comparaciones y supuestos del espacio activo.')],[112,CW-112])
sub('Respaldar y restaurar')
step(1,'En <b>Reportes y exportación</b>, pulsa <b>Descargar respaldo completo</b>. Elige una carpeta y conserva copias fuera de la aplicación, por ejemplo en otra unidad.')
step(2,'Para recuperar datos o cambiar de PC, abre Q-MONITOR y pulsa <b>Restaurar respaldo</b>. Selecciona un JSON generado por el programa; el máximo aceptado es 20 MB.')
step(3,'Lee la confirmación: <b>restaurar reemplaza los datos del espacio activo</b>, no los combina. Descarga primero su respaldo y revisa si estás en datos reales o de demostración. Después comprueba lotes y totales.')
note('En Windows, el perfil está en <b>%APPDATA%\\Q-MONITOR</b>. No borres ni edites sus archivos internos. Para mover datos, usa JSON. La aplicación no sincroniza ni hace copias automáticas en la nube.')
sub('Problemas frecuentes')
for question,answer in [
('Anular no responde.','Cierra la versión anterior con Archivo → Salir y abre la 1.0.1. Después: Anular → responsable y motivo → Confirmar anulación.'),
('No aparecen registros.','Pulsa Limpiar en los filtros y comprueba producto, lote y fechas. Revisa que no estés en la demo o en otro usuario de Windows.'),
('No evaluable / sin criterio.','Comprueba producto, etapa, variable, tipo de humedad, vigencia y regla activa.'),
('La gráfica está vacía.','Verifica filtros y datos suficientes. Borradores, anulados e incompletos no alimentan el análisis.'),
('Error al guardar o restaurar.','Lee el mensaje y no des por guardado el dato. Revisa campos y espacio en disco; para restaurar, usa un JSON válido del programa.')]:
    add('<b>'+question+'</b> '+answer)
add('<b>Al cerrar:</b> revisa pendientes y guarda un respaldo JSON. Sal con <b>Archivo → Salir</b>. Para salir de la demo, pulsa <b>Volver a datos reales</b>.','small')

def chrome(c,doc):
    c.saveState();c.setFillColor(NAVY);c.setFont('SansBold',10);c.drawString(M,H-31,'Q-MONITOR');c.setFillColor(MUTED);c.setFont('Sans',7.5);c.drawRightString(W-M,H-31,'GUÍA DE USO  /  WINDOWS  /  1.0.1');c.setStrokeColor(LINE);c.setLineWidth(.6);c.line(M,H-43,W-M,H-43);c.line(M,37,W-M,37);c.setFont('Sans',7);c.drawString(M,24,'Captura manual · Datos locales · Sin sincronización en la nube');c.drawRightString(W-M,24,f'{doc.page:02d} / 08');c.restoreState()

out=ROOT/'Guia-de-uso-Q-MONITOR.pdf'
doc=SimpleDocTemplate(str(out),pagesize=A4,rightMargin=M,leftMargin=M,topMargin=60,bottomMargin=48,title='Q-MONITOR · Guía práctica de uso · Versión 1.0.1',author='Q-MONITOR',subject='Registro manual, trazabilidad, análisis y respaldo de mediciones industriales',pageCompression=1)
doc.build(story,onFirstPage=chrome,onLaterPages=chrome)
print(out)
