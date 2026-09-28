# Analizador de expresiones regulares

El programa permite ingresar manualmente una expresión regular y la cadena que
se desea evaluar desde la página web.

Cada expresión pasa por este flujo:

1. Conversión de notación infix a postfix.
2. Construcción del AFN mediante Thompson.
3. Simulación de la cadena en el AFN.

Los resultados y los autómatas renderizados desde formato DOT se muestran en
la misma página. Se utiliza `☻` para representar la cadena vacía.

## Gramáticas

Las producciones de los archivos CFG se validan con un AFD construido a partir
de la expresión regular definida en `grammar.ts`. Luego se identifican los
símbolos anulables y se generan los `2^m` casos posibles para eliminar las
producciones-ε y mostrar la gramática resultante.

**Video de ejecución**: <https://youtu.be/-J6qbZcMfTU>
