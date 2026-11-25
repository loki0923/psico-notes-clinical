const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

const domElements = {};
function getOrCreateElement(id) {
    if (!domElements[id]) {
        domElements[id] = {
            id,
            tagName: 'DIV',
            innerHTML: '',
            textContent: '',
            value: '',
            checked: false,
            classList: {
                classes: new Set(),
                add(c) { this.classes.add(c); },
                remove(c) { this.classes.delete(c); },
                contains(c) { return this.classes.has(c); },
                toggle(c, force) {
                    if (force !== undefined) {
                        if (force) this.add(c);
                        else this.remove(c);
                    } else {
                        if (this.contains(c)) this.remove(c);
                        else this.add(c);
                    }
                }
            },
            style: {},
            children: [],
            appendChild(c) { this.children.push(c); },
            addEventListener() {},
            removeEventListener() {},
            setAttribute() {},
            getAttribute() { return ''; }
        };
    }
    return domElements[id];
}

const idRegex = /id=["']([^"']+)["']/g;
let m;
while ((m = idRegex.exec(html)) !== null) {
    getOrCreateElement(m[1]);
}

const sandbox = {
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    window: null,
    document: {
        getElementById: (id) => getOrCreateElement(id),
        querySelector: (sel) => {
            if (sel.startsWith('#')) return getOrCreateElement(sel.slice(1));
            return getOrCreateElement('generic');
        },
        querySelectorAll: (sel) => {
            return [];
        },
        createElement: (tag) => getOrCreateElement('created_' + tag),
        body: getOrCreateElement('body'),
        documentElement: getOrCreateElement('html'),
        addEventListener: () => {}
    },
    localStorage: {
        _data: {},
        getItem(k) { return this._data[k] || null; },
        setItem(k, v) { this._data[k] = String(v); },
        removeItem(k) { delete this._data[k]; },
        clear() { this._data = {}; }
    },
    navigator: {
        clipboard: { writeText: () => Promise.resolve() }
    },
    location: { protocol: 'http:', href: 'http://localhost:3000' }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

const scriptRegex = /<script\s+src=["']([^"']+\.js)(?:\?[^"']*)?["']\s*><\/script>/g;
const scriptMatches = [];
while ((m = scriptRegex.exec(html)) !== null) {
    scriptMatches.push(m[1]);
}
console.log('Scripts a cargar:', scriptMatches);

for (const s of scriptMatches) {
    try {
        const code = fs.readFileSync(s, 'utf8');
        vm.runInContext(code, sandbox, { filename: s });
        console.log('OK cargado:', s);
    } catch (e) {
        console.error('Error cargando ' + s + ':', e.message);
    }
}

console.log('\n--- Probando renderFinanceView ---');
try {
    sandbox.renderFinanceView();
    console.log('renderFinanceView ejecutado con exito!');
    console.log('Contenido de #financeContent longitud:', domElements['financeContent']?.innerHTML?.length || 0);
} catch (e) {
    console.error('ERROR en renderFinanceView:', e);
}

for (const tab of ['transactions', 'debts', 'goals', 'rates']) {
    try {
        sandbox.switchFinanceTab(tab);
        console.log('Pestana ' + tab + ' renderizada OK. Longitud:', domElements['financeTabContent']?.innerHTML?.length || 0);
    } catch (e) {
        console.error('ERROR en pestana ' + tab + ':', e);
    }
}

// Probar modales y envíos
console.log('\n--- Probando modales de finanzas ---');
try {
    sandbox.openTransactionModal('income');
    console.log('openTransactionModal(income) OK');
    sandbox.openTransactionModal('expense');
    console.log('openTransactionModal(expense) OK');
    sandbox.openGoalModal();
    console.log('openGoalModal OK');
    sandbox.openRateModal();
    console.log('openRateModal OK');
    sandbox.openCategoriesModal();
    console.log('openCategoriesModal OK');
} catch (e) {
    console.error('ERROR en modales:', e);
}
