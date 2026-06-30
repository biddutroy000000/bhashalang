/**
 * app.js — ভাষাLang UI controller
 * Handles tab switching, example loading, running code,
 * and rendering output.
 */

// ── EXAMPLES ─────────────────────────────────────────────
const EXAMPLES = {
  hello: `শুরু করো

  বলো("শুভ সকাল ব্রাজিল এবং আর্জেন্টিনার সাপোর্টাররা!")

শেষ করো`,

  vars: `শুরু করো

  ধরো naam = "বিদ্যুৎ"
  ধরো boyos = 21
  ধরো student = সত্যি

  বলো("নাম: " + naam)
  বলো("বয়স: " + boyos)
  বলো("ছাত্র? " + student)

শেষ করো`,

  ifelse: `শুরু করো

  ধরো mark = 85

  যদি (mark >= 90) {
    বলো("A+ পেয়েছো! অসাধারণ!")
  } নাহলে যদি (mark >= 80) {
    বলো("A পেয়েছো! ভালো করেছো!")
  } নাহলে যদি (mark >= 70) {
    বলো("B পেয়েছো। আরো চেষ্টা করো।")
  } নাহলে {
    বলো("আরো পড়তে হবে, বন্ধু।")
  }

শেষ করো`,

  loop: `শুরু করো

  বলো("1 থেকে 5 পর্যন্ত গণনা:")

  ধরো i = 1
  যতক্ষণ (i <= 5) {
    বলো(i)
    i = i + 1
  }

  বলো("শেষ!")

শেষ করো`,

  fn: `শুরু করো

  কাজ jog(a, b) {
    ফেরত দাও a + b
  }

  কাজ namJanao(naam) {
    বলো("হ্যালো, " + naam + "!")
  }

  বলো(jog(10, 20))
  বলো(jog(100, 250))
  namJanao("বন্ধু")

শেষ করো`,
};

// ── DEFAULT CODE ─────────────────────────────────────────
const DEFAULT_CODE = EXAMPLES.hello;

// ── DOM REFS ─────────────────────────────────────────────
const editor      = document.getElementById('code-editor');
const runBtn      = document.getElementById('run-btn');
const clearBtn    = document.getElementById('clear-btn');
const outputArea  = document.getElementById('output-area');
const clearOutBtn = document.getElementById('clear-out-btn');
const navLinks    = document.querySelectorAll('.nav-link');
const tabPanels   = document.querySelectorAll('.tab-panel');
const exBtns      = document.querySelectorAll('.ex-btn');
const tryBtn      = document.getElementById('try-btn');

// ── TAB SWITCHING ─────────────────────────────────────────
function switchTab(tabId) {
  navLinks.forEach(l => {
    l.classList.toggle('active', l.dataset.tab === tabId);
  });
  tabPanels.forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + tabId);
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchTab(link.dataset.tab);
    // smooth scroll to main content
    document.querySelector('.main').scrollIntoView({ behavior: 'smooth' });
  });
});

tryBtn.addEventListener('click', e => {
  e.preventDefault();
  switchTab('playground');
  document.querySelector('.main').scrollIntoView({ behavior: 'smooth' });
});

// ── EXAMPLES ─────────────────────────────────────────────
exBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.example;
    if (EXAMPLES[key]) {
      editor.value = EXAMPLES[key];
      clearOutput();
    }
  });
});

// ── RUN CODE ─────────────────────────────────────────────
function runCode() {
  const source = editor.value.trim();
  if (!source) {
    showOutput([], ['কিছু লিখো আগে! (Write some code first)']);
    return;
  }

  clearOutput();
  const { output, errors } = BhashaLang.run(source);
  showOutput(output, errors);
}

function showOutput(lines, errors) {
  outputArea.innerHTML = '';

  if (lines.length === 0 && errors.length === 0) {
    outputArea.innerHTML = '<span class="output-placeholder">// No output</span>';
    return;
  }

  lines.forEach(line => {
    const span = document.createElement('span');
    span.className = 'output-line';
    span.textContent = line;
    outputArea.appendChild(span);
  });

  errors.forEach(err => {
    const span = document.createElement('span');
    span.className = 'output-line output-error';
    span.textContent = err;
    outputArea.appendChild(span);
  });
}

function clearOutput() {
  outputArea.innerHTML = '<span class="output-placeholder">// এখানে output আসবে...</span>';
}

runBtn.addEventListener('click', runCode);
clearBtn.addEventListener('click', () => { editor.value = ''; clearOutput(); });
clearOutBtn.addEventListener('click', clearOutput);

// Ctrl+Enter / Cmd+Enter to run
editor.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  }
  // Tab key → insert 2 spaces
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end   = editor.selectionEnd;
    editor.value = editor.value.slice(0, start) + '  ' + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
  }
});

// ── DOCS SIDEBAR ACTIVE STATE ─────────────────────────────
const docLinks = document.querySelectorAll('.docs-sidebar a');
const docSections = document.querySelectorAll('.doc-section');

function updateDocActive() {
  let current = '';
  docSections.forEach(sec => {
    const rect = sec.getBoundingClientRect();
    if (rect.top <= 120) current = sec.id;
  });
  docLinks.forEach(link => {
    link.style.borderLeftColor = link.getAttribute('href') === '#' + current
      ? 'var(--saffron)' : 'transparent';
    link.style.color = link.getAttribute('href') === '#' + current
      ? 'var(--text)' : '';
  });
}
window.addEventListener('scroll', updateDocActive, { passive: true });

// ── INIT ─────────────────────────────────────────────────
editor.value = DEFAULT_CODE;
