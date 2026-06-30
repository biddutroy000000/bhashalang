/**
 * lang.js — ভাষাLang interpreter
 * Translates ভাষাLang source → JavaScript, then eval()s it
 * and captures all output.
 */

const BhashaLang = (() => {

  // ── KEYWORD MAP ──────────────────────────────────────────
  const KEYWORDS = [
    // Order matters! Longer multi-word keywords first.
    ['শুরু করো',    '__PROGRAM_START__'],
    ['শেষ করো',    '__PROGRAM_END__'],
    ['ফেরত দাও',   'return'],
    ['বলো',        '__PRINT__'],
    ['ধরো',        'let'],
    ['যদি',        'if'],
    ['নাহলে যদি',  'else if'],
    ['নাহলে',      'else'],
    ['যতক্ষণ',     'while'],
    ['থামো',       'break'],
    ['কাজ',        'function'],
    ['সত্যি',      'true'],
    ['মিথ্যা',     'false'],
  ];

  // ── TRANSPILER ───────────────────────────────────────────
  function transpile(source) {
    let code = source;

    // Replace each ভাষাLang keyword with its JS equivalent
    for (const [bn, js] of KEYWORDS) {
      // Escape special regex characters in the keyword
      const escaped = bn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      code = code.replace(new RegExp(escaped, 'g'), js);
    }

    // Handle program structure markers
    code = code.replace(/__PROGRAM_START__/g, '');
    code = code.replace(/__PROGRAM_END__/g, '');

    // Replace __PRINT__(...) with __output__(...)
    // This lets us capture output instead of using console.log
    code = code.replace(/__PRINT__\s*\(/g, '__output__(');

    return code;
  }

  // ── RUNNER ───────────────────────────────────────────────
  function run(source) {
    const outputLines = [];
    const errors = [];

    // Validate: must contain শুরু করো and শেষ করো
    if (!source.includes('শুরু করো')) {
      return {
        output: [],
        errors: ['Error: Program must start with "শুরু করো"'],
      };
    }
    if (!source.includes('শেষ করো')) {
      return {
        output: [],
        errors: ['Error: Program must end with "শেষ করো"'],
      };
    }

    let js;
    try {
      js = transpile(source);
    } catch (e) {
      return { output: [], errors: ['Transpile error: ' + e.message] };
    }

    // Create a sandboxed output collector
    const __output__ = (...args) => {
      outputLines.push(args.map(a => {
        if (a === null)      return 'null';
        if (a === undefined) return 'undefined';
        if (typeof a === 'object') return JSON.stringify(a);
        return String(a);
      }).join(' '));
    };

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('__output__', js);
      fn(__output__);
    } catch (e) {
      return {
        output: outputLines,
        errors: [formatError(e)],
      };
    }

    return { output: outputLines, errors: [] };
  }

  function formatError(e) {
    // Clean up common JS errors into friendlier messages
    let msg = e.message || String(e);
    msg = msg.replace(/\blet\b/g, 'ধরো');
    msg = msg.replace(/\bfunction\b/g, 'কাজ');
    msg = msg.replace(/\breturn\b/g, 'ফেরত দাও');
    msg = msg.replace(/\bwhile\b/g, 'যতক্ষণ');
    msg = msg.replace(/\bbreak\b/g, 'থামো');
    msg = msg.replace(/\bif\b/g, 'যদি');
    msg = msg.replace(/\belse\b/g, 'নাহলে');
    return '❌ Error: ' + msg;
  }

  return { run, transpile };
})();

// Expose globally
window.BhashaLang = BhashaLang;
