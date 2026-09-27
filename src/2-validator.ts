/**
 * Tokenizador de expresiones regulares.
 * Permite identificar literales, clases de caracteres y operadores especiales.
 */
export function tokenizeRegex(regex: string): string[] {
    const tokenRegex = /\[(?:\\.|[^\]])*\]|\\.|./gu;
    return regex.match(tokenRegex) ?? [];
}

/** Comprueba un literal o una clase sin expandirla en caracteres individuales. */
export function matchesTransition(symbol: string | null, char: string): boolean {
    if (symbol === null) return false;
    if (!symbol.startsWith('[') || !symbol.endsWith(']')) return symbol === char;

    return new RegExp(`^(?:${symbol})$`, 'u').test(char);
}

/**
 * Valida si tanto los paréntesis `()` como los corchetes `[]` están balanceados
 * y bien formados sintácticamente.
 */
export function isBalanced(regex: string): boolean {
    const parenStack: string[] = [];
    let insideClass = false;

    for (let i = 0; i < regex.length; i++) {
        const char = regex[i];

        // 1. Omitir caracteres con escape (\)
        if (char === '\\') {
            i++; // Salta el siguiente carácter escapado
            continue;
        }

        // 2. Control de clases de caracteres [...]
        if (insideClass) {
            if (char === ']') {
                insideClass = false;
            }
            continue; // Dentro de [...] los paréntesis '(' o ')' son literales, se ignoran
        }

        if (char === '[') {
            insideClass = true;
            continue;
        }

        if (char === ']') {
            // Corchete de cierre sin apertura previa
            return false;
        }

        // 3. Control de paréntesis ()
        if (char === '(') {
            parenStack.push(char);
        } else if (char === ')') {
            if (parenStack.length === 0) {
                return false;
            }
            parenStack.pop();
        }
    }

    // Válido solo si no quedaron paréntesis abiertos ni corchetes sin cerrar
    return parenStack.length === 0 && !insideClass;
}
