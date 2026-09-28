# Analizador de expresiones regulares

El programa permite ingresar manualmente una expresión regular y la cadena que
se desea evaluar desde la página web.

Cada expresión pasa por este flujo:

1. Conversión de notación infix a postfix.
2. Construcción del AFN mediante Thompson.
3. Simulación de la cadena en el AFN.

Los resultados y los autómatas renderizados desde formato DOT se muestran en
la misma página. Se utiliza `ε` para representar la cadena vacía.

## Ejecución

```powershell
pnpm install
pnpm start
```

Después, abra `http://localhost:5173/` en el navegador.

Las pruebas y la verificación de tipos se ejecutan con:

```powershell
pnpm test
pnpm typecheck
```
