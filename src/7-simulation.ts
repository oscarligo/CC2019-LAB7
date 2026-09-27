import type { State, NFA } from './4-thompson'
import { getDFATransition, getEpsilonClosure } from './5-subsets'
import type { DFA } from './5-subsets'
import { matchesTransition } from './2-validator'


// Registro de un paso en el NFA
export interface NFAStep {
    symbol: string | null;      // null representa el estado inicial antes de leer
    currentStates: number[];    // IDs de los estados activos antes del salto
    reachableStates?: number[]; // IDs alcanzados por el símbolo antes de la clausura-ε
    nextStates: number[];       // IDs de los estados activos finales de la iteración
}

// Resultado para la simulación de un NFA
export interface NFAResult {
    accepted: boolean;
    steps: NFAStep[];
}

// Registro de un paso en el DFA
export interface DFAStep {
    from: number;               // ID del estado origen
    symbol: string;             // Símbolo consumido
    to: number | null;          // ID del estado destino (null si se estanca)
}

export interface DFAResult {
    accepted: boolean;
    steps: DFAStep[];
    finalStateId: number | null;
}

/**
 * Evalúa una cadena en el NFA registrando cada paso.
 */
export function evaluateNFA(nfa: NFA, input: string): NFAResult {
    const steps: NFAStep[] = [];
    let currentStates = getEpsilonClosure([nfa.start]);

    steps.push({
        symbol: null,
        currentStates: [nfa.start.id],
        nextStates: currentStates.map(s => s.id)
    });

    for (const char of input) {
        const nextStates: State[] = [];
        const visitedIds = new Set<number>();

        for (const state of currentStates) {
            for (const transition of state.transitions) {
                // Se utiliza la función de emparejamiento semántico
                if (matchesTransition(transition.symbol, char) && !visitedIds.has(transition.to.id)) {
                    visitedIds.add(transition.to.id);
                    nextStates.push(transition.to);
                }
            }
        }

        if (nextStates.length === 0) {
            steps.push({
                symbol: char,
                currentStates: currentStates.map(s => s.id),
                reachableStates: [],
                nextStates: []
            });
            return { accepted: false, steps };
        }

        const closedStates = getEpsilonClosure(nextStates);

        steps.push({
            symbol: char,
            currentStates: currentStates.map(s => s.id),
            reachableStates: nextStates.map(s => s.id),
            nextStates: closedStates.map(s => s.id)
        });

        currentStates = closedStates;
    }

    const accepted = currentStates.some(state => state.id === nfa.accept.id);
    return { accepted, steps };
}


/**
 * Evalúa una cadena en el DFA registrando cada transición.
 */
export function evaluateDFA(dfa: DFA, value: string): DFAResult {
    const steps: DFAStep[] = [];
    let current = dfa.start;

    for (const symbol of value) {
        const next = getDFATransition(current, symbol);

        if (!next) {
            steps.push({ from: current.id, symbol, to: null });
            return { accepted: false, steps, finalStateId: null };
        }

        steps.push({ from: current.id, symbol, to: next.id });
        current = next;
    }

    return {
        accepted: current.isAccept,
        steps,
        finalStateId: current.id
    };
}
