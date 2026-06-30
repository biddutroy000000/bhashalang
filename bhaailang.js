#!/usr/bin/env node
// ================================================
// BhaaiLang — JavaScript Interpreter
// Node.js দিয়ে directly run হবে
// ================================================

const fs = require('fs');
const path = require('path');

// ---- KEYWORD TABLE ----
const KEYWORDS = {
  'shuru_koro': 'MAIN',
  'bolo_bhai':  'PRINT',
  'nao_bhai':   'INPUT',
  'songkha':    'INT',
  'doshomik':   'FLOAT',
  'okkhor':     'CHAR',
  'jodi_bhai':  'IF',
  'nahole_jodi':'ELSEIF',
  'nahole_bhai':'ELSE',
  'ghurai_bhai':'FOR',
  'jotokhon_bhai': 'WHILE',
  'firai_bhai': 'RETURN',
  'thamo_bhai': 'BREAK',
  'agao_bhai':  'CONTINUE',
  'shesh_bhai': 'EXIT',
  'sotti':      'true',
  'mittha':     'false',
  'shunno':     'null',
};

// ---- LEXER ----
function lexer(code) {
  const tokens = [];
  let i = 0;

  while (i < code.length) {
    // whitespace
    if (/\s/.test(code[i])) { i++; continue; }

    // comment
    if (code[i] === '/' && code[i+1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }

    // string
    if (code[i] === '"') {
      let str = '';
      i++;
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\' && code[i+1] === 'n') { str += '\n'; i += 2; }
        else if (code[i] === '\\' && code[i+1] === 't') { str += '\t'; i += 2; }
        else { str += code[i++]; }
      }
      i++;
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // number
    if (/[0-9]/.test(code[i])) {
      let num = '';
      while (i < code.length && /[0-9.]/.test(code[i])) num += code[i++];
      tokens.push({ type: 'NUMBER', value: parseFloat(num) });
      continue;
    }

    // identifier or keyword
    if (/[a-zA-Z_]/.test(code[i])) {
      let word = '';
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) word += code[i++];
      if (KEYWORDS[word]) tokens.push({ type: KEYWORDS[word], value: word });
      else tokens.push({ type: 'IDENT', value: word });
      continue;
    }

    // two-char operators
    const two = code[i] + (code[i+1] || '');
    if (['==','!=','<=','>=','&&','||','++','--','+=','-=','*='].includes(two)) {
      tokens.push({ type: 'OP', value: two }); i += 2; continue;
    }

    // single char
    if ('+-*/%<>=!(){}[];,'.includes(code[i])) {
      tokens.push({ type: 'OP', value: code[i] }); i++; continue;
    }

    i++;
  }
  return tokens;
}

// ---- INTERPRETER ----
class Interpreter {
  constructor() {
    this.scopes = [{}];
    this.output = [];
  }

  scope() { return this.scopes[this.scopes.length - 1]; }
  pushScope() { this.scopes.push({}); }
  popScope() { this.scopes.pop(); }

  getVar(name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (name in this.scopes[i]) return this.scopes[i][name];
    }
    throw new Error(`'${name}' declare kora hoy ni!`);
  }

  setVar(name, val) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (name in this.scopes[i]) { this.scopes[i][name] = val; return; }
    }
    this.scope()[name] = val;
  }

  run(code) {
    const tokens = lexer(code);
    let pos = 0;

    const peek = (o = 0) => tokens[pos + o];
    const eat = () => tokens[pos++];
    const expect = (val) => {
      const t = eat();
      if (t.value !== val) throw new Error(`'${val}' expected, pailam '${t ? t.value : 'end'}'`);
      return t;
    };

    // Expression parser
    const parseExpr = () => parseOr();
    const parseOr  = () => { let l = parseAnd(); while(peek()&&peek().value==='||'){eat();l=l||parseAnd();} return l; };
    const parseAnd = () => { let l = parseEq();  while(peek()&&peek().value==='&&'){eat();l=l&&parseEq();}  return l; };
    const parseEq  = () => {
      let l = parseCmp();
      while(peek()&&['==','!='].includes(peek().value)){
        const op=eat().value; const r=parseCmp();
        l = op==='=='? l==r : l!=r;
      }
      return l;
    };
    const parseCmp = () => {
      let l = parseAdd();
      while(peek()&&['<','>','<=','>='].includes(peek().value)){
        const op=eat().value; const r=parseAdd();
        if(op==='<')l=l<r; else if(op==='>')l=l>r;
        else if(op==='<=')l=l<=r; else l=l>=r;
      }
      return l;
    };
    const parseAdd = () => {
      let l = parseMul();
      while(peek()&&['+','-'].includes(peek().value)){
        const op=eat().value; l=op==='+'?l+parseMul():l-parseMul();
      }
      return l;
    };
    const parseMul = () => {
      let l = parseUnary();
      while(peek()&&['*','/','%'].includes(peek().value)){
        const op=eat().value; const r=parseUnary();
        if(op==='*')l*=r; else if(op==='/')l/=r; else l%=r;
      }
      return l;
    };
    const parseUnary = () => {
      if(peek()&&peek().value==='-'){eat();return -parsePrimary();}
      if(peek()&&peek().value==='!'){eat();return !parsePrimary();}
      return parsePrimary();
    };
    const parsePrimary = () => {
      const t = peek();
      if(!t) throw new Error('Unexpected end');
      if(t.type==='NUMBER'){eat();return t.value;}
      if(t.type==='STRING'){eat();return t.value;}
      if(t.value==='true'){eat();return true;}
      if(t.value==='false'){eat();return false;}
      if(t.value==='null'){eat();return null;}
      if(t.type==='IDENT'){
        eat();
        if(peek()&&peek().value==='('){
          eat();
          const args=[];
          while(peek()&&peek().value!==')'){
            args.push(parseExpr());
            if(peek()&&peek().value===',')eat();
          }
          expect(')');
          return this.callFunc(t.value, args);
        }
        return this.getVar(t.value);
      }
      if(t.value==='('){eat();const v=parseExpr();expect(')');return v;}
      throw new Error(`Bujhchi na: '${t.value}'`);
    };

    const execBlock = () => {
      expect('{');
      this.pushScope();
      let result;
      while(peek()&&peek().value!=='}'){
        result = execStmt();
        if(result&&(result.__return||result.__break||result.__continue)) break;
      }
      expect('}');
      this.popScope();
      return result;
    };

    const skipBlock = () => {
      let d=0;
      while(pos<tokens.length){
        if(tokens[pos].value==='{')d++;
        else if(tokens[pos].value==='}'){d--;if(d===0){pos++;break;}}
        pos++;
      }
    };

    const execStmt = () => {
      const t = peek();
      if(!t) return;

      // shuru_koro() { }
      if(t.type==='MAIN'){
        eat(); expect('('); expect(')');
        execBlock();
        return;
      }

      // bolo_bhai(...)
      if(t.type==='PRINT'){
        eat(); expect('(');
        let fmt = parseExpr();
        const args = [];
        while(peek()&&peek().value===','){eat();args.push(parseExpr());}
        expect(')');
        if(peek()&&peek().value===';')eat();
        let out = String(fmt);
        args.forEach(a=>{
          out = out.replace(/%d|%f|%s|%c/, ()=>{
            if(typeof a==='number'&&!Number.isInteger(a)) return a.toFixed(2);
            return String(a);
          });
        });
        process.stdout.write(out);
        return;
      }

      // variable declare
      if(['INT','FLOAT','CHAR'].includes(t.type)){
        eat();
        const name = eat().value;
        let val = 0;
        if(peek()&&peek().value==='='){eat();val=parseExpr();}
        expect(';');
        this.scope()[name] = val;
        return;
      }

      // assignment: x = / x += / x -= / x *= 
      if(t.type==='IDENT'&&peek(1)&&['=','+=','-=','*='].includes(peek(1).value)){
        const name=eat().value; const op=eat().value; const val=parseExpr(); expect(';');
        const cur = (() => { try{return this.getVar(name);}catch(e){return 0;} })();
        if(op==='=')this.setVar(name,val);
        else if(op==='+=')this.setVar(name,cur+val);
        else if(op==='-=')this.setVar(name,cur-val);
        else if(op==='*=')this.setVar(name,cur*val);
        return;
      }

      // i++ / i--
      if(t.type==='IDENT'&&peek(1)&&['++','--'].includes(peek(1).value)){
        const name=eat().value; const op=eat().value;
        if(peek()&&peek().value===';')eat();
        const cur = (() => { try{return this.getVar(name);}catch(e){return 0;} })();
        this.setVar(name, op==='++'?cur+1:cur-1);
        return;
      }

      // jodi_bhai
      if(t.type==='IF'){
        eat(); expect('('); const cond=parseExpr(); expect(')');
        if(cond){
          execBlock();
          while(peek()&&(peek().type==='ELSEIF'||peek().type==='ELSE')){
            eat();
            if(tokens[pos-1].type==='ELSEIF'){expect('(');parseExpr();expect(')');}
            skipBlock();
          }
        } else {
          skipBlock();
          let matched=false;
          while(peek()&&(peek().type==='ELSEIF'||peek().type==='ELSE')){
            const nt=eat();
            if(nt.type==='ELSEIF'){
              expect('(');const c2=parseExpr();expect(')');
              if(!matched&&c2){execBlock();matched=true;}
              else skipBlock();
            } else {
              if(!matched){execBlock();matched=true;}
              else skipBlock();
            }
          }
        }
        return;
      }

      // jotokhon_bhai (while)
      if(t.type==='WHILE'){
        eat();
        const condPos=pos;
        expect('('); let cond=parseExpr(); expect(')');
        const bodyPos=pos;
        while(cond){
          pos=bodyPos;
          const r=execBlock();
          if(r&&r.__break) break;
          if(r&&r.__return) return r;
          pos=condPos; expect('('); cond=parseExpr(); expect(')');
        }
        if(!cond){pos=bodyPos;skipBlock();}
        return;
      }

      // ghurai_bhai (for)
      if(t.type==='FOR'){
        eat(); expect('(');
        this.pushScope();
        // init
        if(['INT','FLOAT','CHAR'].includes(peek().type))eat();
        const iname=eat().value; expect('='); const ival=parseExpr(); expect(';');
        this.scope()[iname]=ival;
        const condPos=pos;
        let cond=parseExpr(); expect(';');
        const updPos=pos;
        // skip to body
        let d=0;
        while(pos<tokens.length&&!(tokens[pos].value==='{'&&d===0)){
          if(tokens[pos].value==='(')d++;
          else if(tokens[pos].value===')')d--;
          pos++;
        }
        const bodyPos=pos;
        while(cond){
          pos=bodyPos;
          const r=execBlock();
          if(r&&r.__break)break;
          if(r&&r.__return){this.popScope();return r;}
          // update
          pos=updPos;d=0;
          while(pos<tokens.length&&!(tokens[pos].value==='{'&&d===0)){
            if(tokens[pos].value==='(')d++;
            else if(tokens[pos].value===')')d--;
            const ut=tokens[pos++];
            // handle i++ / i-- / i+=x
            if(ut.type==='IDENT'&&pos<tokens.length){
              const nxt=tokens[pos];
              if(nxt&&nxt.value==='++'){pos++;const c=this.getVar(ut.value);this.setVar(ut.value,c+1);}
              else if(nxt&&nxt.value==='--'){pos++;const c=this.getVar(ut.value);this.setVar(ut.value,c-1);}
              else if(nxt&&nxt.value==='='){
                pos++;
                // parse simple expr until ; or )
                let expr='';
                const savedPos2=pos;
                // just re-parse
                pos=updPos;d=0;
                // skip to =
                while(tokens[pos].value!=='=')pos++;
                pos++;
                const v=parseExpr();
                this.setVar(ut.value,v);
                // now skip rest of update
                while(pos<tokens.length&&!(tokens[pos].value==='{'&&d===0)){
                  if(tokens[pos].value==='(')d++;
                  else if(tokens[pos].value===')')d--;
                  pos++;
                }
                break;
              }
            }
          }
          pos=condPos; cond=parseExpr(); expect(';');
        }
        if(!cond){pos=bodyPos;skipBlock();}
        this.popScope();
        return;
      }

      // firai_bhai (return)
      if(t.type==='RETURN'){
        eat();
        let val=undefined;
        if(peek()&&peek().value!==';')val=parseExpr();
        if(peek()&&peek().value===';')eat();
        return {__return:true,value:val};
      }

      // thamo_bhai (break)
      if(t.type==='BREAK'){
        eat();
        if(peek()&&peek().value===';')eat();
        return {__break:true};
      }

      // agao_bhai (continue)
      if(t.type==='CONTINUE'){
        eat();
        if(peek()&&peek().value===';')eat();
        return {__continue:true};
      }

      // shesh_bhai
      if(t.type==='EXIT'){
        eat();
        if(peek()&&peek().value===';')eat();
        return;
      }

      // skip unknown token
      eat();
    };

    while(pos < tokens.length) {
      execStmt();
    }
  }

  callFunc(name, args) {
    throw new Error(`'${name}' function pawa jacche na!`);
  }
}

// ---- MAIN ----
const args = process.argv.slice(2);

if(args.length === 0){
  console.log('=========================================');
  console.log('  BhaaiLang - Banglish C Programming');
  console.log('=========================================');
  console.log('Usage:');
  console.log('  node bhaailang.js examples/01_hello.bhai');
  console.log('  node bhaailang.js examples/03_condition.bhai');
  console.log('  node bhaailang.js examples/05_factorial.bhai');
  process.exit(0);
}

const file = args[0];
if(!fs.existsSync(file)){
  console.error(`Error: '${file}' file pawa jacche na!`);
  process.exit(1);
}

const code = fs.readFileSync(file, 'utf-8');
console.log('=========================================');
console.log('  BhaaiLang Interpreter');
console.log('=========================================');
console.log(`File: ${file}`);
console.log();
console.log('Output:');
console.log('-----------------------------------------');

try {
  const interp = new Interpreter();
  interp.run(code);
  console.log('\n-----------------------------------------');
  console.log('Program shesh bhai!');
} catch(e) {
  console.error('\nError bhai:', e.message);
}
