import { isBalanced } from './2-validator';
import { insertExplicitConcat, regexToPostfix } from './3-shunting-yard';
import { postfixToNFA } from './4-thompson';
import { renderDFA, renderNFA } from './drawing';
import { nfaToDFA } from './5-subsets';
import { minimizeDFA } from './6-partitions';
import { evaluateDFA, evaluateNFA } from './7-simulation';
import {EPSILON} from './4-thompson';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function processRegex(rawRegex: string) {
    const regex = rawRegex.trim();
    if (!regex || !isBalanced(regex)) {
        throw new Error('Invalid or unbalanced regular expression');
    }

    const explicit = insertExplicitConcat(regex);
    const postfix = regexToPostfix(regex);
    const nfa = postfixToNFA(postfix);
    const dfa = nfaToDFA(nfa);
    const minDfa = minimizeDFA(dfa);

    return { regex, explicit, postfix, nfa, dfa, minDfa };
}

interface SimulationStep {
    symbol: string | null;
    states: number[];
}

// Simulación usando directamente los IDs de los estados 
// para resaltar los nodos en el SVG generado por Graphviz
function addSimulation(
    graph: HTMLElement,
    steps: SimulationStep[],
    accepted: boolean,
    input: string,
): void {
    if (graph.nextElementSibling?.classList.contains('simulation-controls')) {
        graph.nextElementSibling.remove();
    }

    const controls = document.createElement('div');
    controls.className = 'simulation-controls';
    controls.innerHTML = `
        <button type="button">Simulate step by step</button>
        <p class="simulation-status" aria-live="polite"></p>
    `;
    graph.after(controls);

    const button = controls.querySelector('button')!;
    const status = controls.querySelector<HTMLElement>('.simulation-status')!;
    const characters = [...input];
    let index = -1;

    button.onclick = () => {
        index = index === steps.length - 1 ? 0 : index + 1;
        const step = steps[index];
        const activeIds = new Set(step.states.map(String));
        const finished = index === steps.length - 1;

        // Resalta el nodo si el <title> del SVG coincide con el id exacto (ej: "0", "1" o "S0")
        for (const node of graph.querySelectorAll<SVGGElement>('g.node')) {
            const title = node.querySelector('title')?.textContent?.trim() ?? '';
            // Coincide con el número directo o si viene con prefijo interno del dot (ej: S1 o D1)
            const cleanTitle = title.replace(/^[^\d]+/, '');
            node.classList.toggle('active-state', activeIds.has(title) || activeIds.has(cleanTitle));
        }

        status.className = `simulation-status${finished ? accepted ? ' accepted' : ' rejected' : ''}`;
        status.textContent = [
            `Step ${index}/${characters.length}`,
            step.symbol === null ? 'Initial state' : `Read "${step.symbol}"`,
            `Active: [${step.states.join(', ') || EPSILON}]`,
            `Remaining: ${characters.slice(index).join('') || EPSILON}`,
            finished ? (accepted ? 'w ∈ L(r)' : 'w ∉ L(r)') : '',
        ].filter(Boolean).join(' --- ');
        
        button.textContent = finished ? 'Restart simulation' : 'Next step';
    };
}

// Renderiza los autómatas y simula la cadena de entrada
async function renderGraphs(
    { nfa, dfa, minDfa }: Pick<ReturnType<typeof processRegex>, 'nfa' | 'dfa' | 'minDfa'>,
    targets: { nfa: HTMLElement; dfa: HTMLElement; minDfa: HTMLElement },
    rawInput: string,
) {
    await renderNFA(nfa, targets.nfa);
    await renderDFA(dfa, targets.dfa);
    await renderDFA(minDfa, targets.minDfa);

    const input = rawInput === EPSILON ? '' : rawInput;
    const nfaResult = evaluateNFA(nfa, input);
    const dfaResult = evaluateDFA(dfa, input);
    const minDfaResult = evaluateDFA(minDfa, input);

    // 1. NFA: estados activos por cada paso
    addSimulation(
        targets.nfa,
        nfaResult.steps.map(s => ({ symbol: s.symbol, states: s.nextStates })),
        nfaResult.accepted,
        input,
    );

    // 2. DFA: inicio + transiciones
    addSimulation(
        targets.dfa,
        [
            { symbol: null, states: [dfa.start.id] },
            ...dfaResult.steps.map(s => ({ symbol: s.symbol, states: s.to === null ? [] : [s.to] })),
        ],
        dfaResult.accepted,
        input,
    );

    // 3. Minimized DFA: inicio + transiciones
    addSimulation(
        targets.minDfa,
        [
            { symbol: null, states: [minDfa.start.id] },
            ...minDfaResult.steps.map(s => ({ symbol: s.symbol, states: s.to === null ? [] : [s.to] })),
        ],
        minDfaResult.accepted,
        input,
    );

}

async function drawManual(): Promise<void> {
    const errorEl = $('error-output');
    errorEl.textContent = '';

    const input = $('regex-input') as HTMLInputElement;
    const value = input.value.trim();
    if (!value) return;

    try {
        const result = processRegex(value);

        $('formatted-output').textContent = result.explicit;
        $('postfix-output').textContent = result.postfix;

        await renderGraphs(
            result,
            {
                nfa: $('nfa-container'),
                dfa: $('dfa-container'),
                minDfa: $('minimized-dfa-container'),
            },
            ($('string-input') as HTMLInputElement)?.value ?? ''
        );
    } catch (err) {
        errorEl.textContent = err instanceof Error ? err.message : 'Error constructing automaton';
    }
}


$('regex-form').onsubmit = (event) => {
    event.preventDefault();
    void drawManual();
};

void drawManual();
