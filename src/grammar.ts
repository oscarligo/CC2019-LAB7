import { regexToPostfix } from './3-shunting-yard';
import { postfixToNFA } from './4-thompson';
import { nfaToDFA, simulateDFA } from './5-subsets';
import { minimizeDFA } from './6-partitions';

export const GRAMMAR_REGEX = String.raw`[A-Z]→([A-Za-z0-9]+|☻)(\|([A-Za-z0-9]+|☻))*`;

const grammarDFA = minimizeDFA(nfaToDFA(postfixToNFA(regexToPostfix(GRAMMAR_REGEX))));

export function validateGrammarLines(source: string) {
    return source.split(/\r?\n/u).flatMap((production, index) => {
        const normalized = production.replace(/\s+/gu, '');
        return normalized
            ? [{ line: index + 1, production, valid: simulateDFA(grammarDFA, normalized) }]
            : [];
    });
}
