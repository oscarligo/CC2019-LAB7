import { isBalanced } from './2-validator';
import { insertExplicitConcat, regexToPostfix } from './3-shunting-yard';
import { postfixToNFA } from './4-thompson';
import { renderDFA, renderNFA } from './drawing';
import { nfaToDFA } from './5-subsets';
import { minimizeDFA } from './6-partitions';
import { evaluateDFA, evaluateNFA } from './7-simulation';
import {EPSILON} from './4-thompson';
import { validateGrammarLines } from './grammar';

const grammarFiles = import.meta.glob('../cfg/*.txt', {
    eager: true,
    query: '?raw',
    import: 'default',
}) as Record<string, string>;

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
    acceptingStateIds: Set<number>,
): void {
    if (graph.nextElementSibling?.classList.contains('simulation-controls')) {
        graph.nextElementSibling.remove();
    }

    const controls = document.createElement('div');
    controls.className = 'simulation-controls';
    controls.innerHTML = `
        <button type="button">Step by step simulation</button>
        <div class="simulation-progress">
            <progress value="0" max="1" aria-label="Progress"></progress>
            <span>0/${[...input].length}</span>
        </div>
        <div class="trace-table-container">
            <table class="trace-table">
                <thead><tr>
                    <th>Input</th>
                    <th>Active States</th>
                    <th>Remaining Buffer</th>
                    <th>Diagnostic</th>
                </tr></thead>
                <tbody aria-live="polite"></tbody>
            </table>
        </div>
    `;
    graph.after(controls);

    const button = controls.querySelector('button')!;
    const tbody = controls.querySelector<HTMLTableSectionElement>('tbody')!;
    const progress = controls.querySelector<HTMLProgressElement>('progress')!;
    const progressLabel = controls.querySelector<HTMLElement>('.simulation-progress span')!;
    const characters = [...input];
    progress.max = Math.max(characters.length, 1);
    let index = -1;

    button.onclick = () => {
        if (index === steps.length - 1) {
            tbody.replaceChildren();
            index = 0;
        } else {
            index++;
        }
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

        const row = tbody.insertRow();
        if (finished) row.className = accepted ? 'success-row' : 'failure-row';
        progress.value = index;
        progress.className = finished ? (accepted ? 'accepted' : 'rejected') : '';
        progress.setAttribute('aria-label', `Paso ${index} de ${characters.length}`);
        progressLabel.textContent = `${index}/${characters.length}`;

        const inputCell = row.insertCell();
        const inputElement = document.createElement(step.symbol === null ? 'span' : 'kbd');
        inputElement.textContent = step.symbol ?? 'Inicio';
        if (step.symbol === null) inputElement.className = 'badge initial';
        inputCell.append(inputElement);

        const statesCell = row.insertCell();
        for (const state of step.states) {
            const pill = document.createElement('span');
            pill.className = `state-pill${acceptingStateIds.has(state) ? ' accepting' : ''}`;
            pill.textContent = `${state}${acceptingStateIds.has(state) ? '★' : ''}`;
            statesCell.append(pill);
        }
        if (!step.states.length) statesCell.textContent = EPSILON;

        const buffer = document.createElement('code');
        buffer.textContent = characters.slice(index).join('') || EPSILON;
        row.insertCell().append(buffer);

        const diagnostic = document.createElement('span');
        diagnostic.className = finished ? `badge ${accepted ? 'success' : 'failure'}` : 'status-running';
        diagnostic.textContent = finished ? (accepted ? 'w ∈ L(r)' : 'w ∉ L(r)') : 'In progress';
        row.insertCell().append(diagnostic);
        
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
        new Set([nfa.accept.id]),
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
        new Set(dfa.states.filter(state => state.isAccept).map(state => state.id)),
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
        new Set(minDfa.states.filter(state => state.isAccept).map(state => state.id)),
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

function showView(showingGrammar: boolean): void {
    $('grammar-view').hidden = !showingGrammar;
    $('lexer-view').hidden = showingGrammar;
    $('view-title').textContent = showingGrammar
        ? 'Context-Free Grammar Validator'
        : 'Lexer: Regular Expression to Automaton';
    $('lexer-button').setAttribute('aria-pressed', String(!showingGrammar));
    $('grammar-button').setAttribute('aria-pressed', String(showingGrammar));
}

$('lexer-button').onclick = () => showView(false);
$('grammar-button').onclick = () => showView(true);

void drawManual();

for (const [path, source] of Object.entries(grammarFiles).sort()) {
    const results = validateGrammarLines(source);
    const article = document.createElement('article');
    const title = document.createElement('h3');
    const fileName = path.split('/').pop()!;
    const allValid = results.length > 0 && results.every(result => result.valid);
    title.textContent = `${fileName} — ${allValid ? 'Valid' : 'Invalid'}`;
    title.className = allValid ? 'grammar-valid' : 'grammar-invalid';

    const table = document.createElement('table');
    table.className = 'trace-table grammar-table';
    table.innerHTML = '<thead><tr><th>Line</th><th>Production</th><th>Result</th></tr></thead>';
    const tbody = table.createTBody();
    for (const result of results) {
        const row = tbody.insertRow();
        row.insertCell().textContent = String(result.line);
        const production = document.createElement('code');
        production.textContent = result.production;
        row.insertCell().append(production);
        const status = document.createElement('span');
        status.className = `badge ${result.valid ? 'success' : 'failure'}`;
        status.textContent = result.valid ? '✓ Valid' : '✗ Invalid';
        row.insertCell().append(status);
    }

    article.append(title, table);
    $('grammar-output').append(article);
}
