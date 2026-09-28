import { regexToPostfix } from './3-shunting-yard';
import { postfixToNFA } from './4-thompson';
import { nfaToDFA, simulateDFA } from './5-subsets';
import { minimizeDFA } from './6-partitions';

export const GRAMMAR_REGEX = String.raw`[A-Z]→([A-Za-z0-9]+|☻)(\|([A-Za-z0-9]+|☻))*`;

const grammarDFA = minimizeDFA(nfaToDFA(postfixToNFA(regexToPostfix(GRAMMAR_REGEX))));
const EPSILON = '☻';

export function validateGrammarLines(source: string) {
    return source.split(/\r?\n/u).flatMap((production, index) => {
        const normalized = production.replace(/\s+/gu, '');
        return normalized
            ? [{ line: index + 1, production, valid: simulateDFA(grammarDFA, normalized) }]
            : [];
    });
}

export function eliminateEpsilonProductions(source: string) {
    const grammar = new Map<string, string[]>();
    for (const line of source.split(/\r?\n/u)) {
        if (!line) continue;
        const [left, right] = line.split('→');
        grammar.set(left!, right!.split('|'));
    }

    const nullable = new Set<string>();
    let changed = true;
    while (changed) {
        changed = false;
        for (const [left, alternatives] of grammar) {
            if (!nullable.has(left) && alternatives.some(right =>
                right === EPSILON || [...right].every(symbol => nullable.has(symbol)))) {
                nullable.add(left);
                changed = true;
            }
        }
    }

    const nullableProductions = [...grammar].flatMap(([left, alternatives]) =>
        alternatives
            .filter(right => right === EPSILON || [...right].every(symbol => nullable.has(symbol)))
            .map(right => `${left}→${right}`)
    );
    const result = new Map([...grammar.keys()].map(left => [left, new Set<string>()]));
    const steps = [...grammar].flatMap(([left, alternatives]) => alternatives.map(right => {
        const nullablePositions = [...right].flatMap((symbol, position) =>
            nullable.has(symbol) ? [position] : []
        );
        const cases = 2 ** nullablePositions.length;
        const generated = new Set<string>();

        for (let mask = 0; mask < cases; mask++) {
            const candidate = [...right].filter((_, position) => {
                const bit = nullablePositions.indexOf(position);
                return bit < 0 || Math.floor(mask / 2 ** bit) % 2 === 0;
            }).join('') || EPSILON;
            generated.add(candidate);
            if (candidate !== EPSILON) result.get(left)!.add(candidate);
        }

        return {
            production: `${left}→${right}`,
            nullableSymbols: nullablePositions.map(position => right[position]!),
            cases,
            generated: [...generated],
        };
    }));

    return {
        nullable: [...nullable],
        nullableProductions,
        steps,
        result: [...result].flatMap(([left, alternatives]) =>
            alternatives.size ? [`${left}→${[...alternatives].join('|')}`] : []
        ),
    };
}
