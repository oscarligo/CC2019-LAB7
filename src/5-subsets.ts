import type { NFA, State } from './4-thompson';
import { matchesTransition } from './2-validator';

// Estado de un afn
export interface DFAState {
    id: number;
    nfaStates: State[]; 
    isAccept: boolean; // si contiene al estado de aceptación del NFA, es estado de aceptación del DFA
    transitions: Record<string, DFAState>; 
}

export interface DFA {
    start: DFAState;
    states: DFAState[];
    alphabet: string[];
}

export function getDFATransition(state: DFAState, char: string): DFAState | undefined {
    return state.transitions[char]
        ?? Object.entries(state.transitions).find(([symbol]) => matchesTransition(symbol, char))?.[1];
}

// Extraer los símbolos del alfabeto (sin transiciones null)
function getAlphabet(nfa: NFA): string[] {
    const symbols = new Set<string>();
    for (const state of nfa.states) {
        for (const t of state.transitions) {
            if (t.symbol !== null) symbols.add(t.symbol);
        }
    }
    return Array.from(symbols).sort();
}

// Clausura-épsilon: estados alcanzables por aristas null
export function getEpsilonClosure(states: State[]): State[] {
    const stack = [...states];
    const visited = new Set<number>(states.map(s => s.id));
    const result = [...states];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) break;

        for (const t of current.transitions) {
            if (t.symbol === null && !visited.has(t.to.id)) {
                visited.add(t.to.id);
                result.push(t.to);
                stack.push(t.to);
            }
        }
    }

    return result.sort((a, b) => a.id - b.id);
}

// 3. Mover y cerrar: avanzar un símbolo y calcular su épsilon-clausura
function move(states: State[], symbol: string): State[] {
    const nextStates: State[] = [];
    const added = new Set<number>();

    for (const state of states) {
        for (const t of state.transitions) {
            if (t.symbol === symbol && !added.has(t.to.id)) {
                added.add(t.to.id);
                nextStates.push(t.to);
            }
        }
    }

    return getEpsilonClosure(nextStates);
}

// 4. Algoritmo principal de subconjuntos
export function nfaToDFA(nfa: NFA): DFA {
    const alphabet = getAlphabet(nfa);
    const dfaStates: Record<string, DFAState> = {};
    const queue: DFAState[] = [];

    let nextId = 0;

    const registerState = (nfaStates: State[]): DFAState => {
        const key = nfaStates.map(s => s.id).join(',');
        const state: DFAState = {
            id: nextId++,
            nfaStates,
            isAccept: nfaStates.some(s => s.id === nfa.accept.id),
            transitions: {},
        };
        dfaStates[key] = state;
        queue.push(state);
        return state;
    };

    const startState = registerState(getEpsilonClosure([nfa.start]));

    for (let i = 0; i < queue.length; i++) {
        const current = queue[i];

        for (const symbol of alphabet) {
            const nextNfaStates = move(current.nfaStates, symbol);
            if (nextNfaStates.length === 0) continue;

            const key = nextNfaStates.map(s => s.id).join(',');
            let target = dfaStates[key];

            if (!target) {
                target = registerState(nextNfaStates);
            }

            current.transitions[symbol] = target;
        }
    }

    return {
        start: startState,
        states: Object.values(dfaStates),
        alphabet,
    };
}

export function simulateDFA(dfa: DFA, value: string): boolean {
    let current = dfa.start;

    for (const symbol of value) {
        const next = getDFATransition(current, symbol);
        if (!next) return false;
        current = next;
    }

    return current.isAccept;
}
