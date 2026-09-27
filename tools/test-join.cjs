// Execute the real static-page script against a minimal DOM, including failure paths.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../join.html'),'utf8');
const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
async function render(url,clipboardAllowed=true){
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:id==='join-copy'?'Copy code':'',href:'#',handlers:{},classList:{add(){},toggle(){},contains(){return false}},addEventListener(k,fn){this.handlers[k]=fn},setAttribute(){},prepend(){}});return elements.get(id)};
  const receipt={copied:null,selected:false,scrubbed:null};
  const context={document:{documentElement:{classList:{add(){}}},addEventListener(k,fn){fn()},getElementById:element,querySelector(){return null},querySelectorAll(){return []},createRange(){return {selectNodeContents(){receipt.selected=true}}}},navigator:{userAgent:'test',clipboard:{async writeText(code){if(!clipboardAllowed)throw new Error('blocked');receipt.copied=code}}},window:{location:new URL(url),history:{state:null,replaceState(a,b,u){receipt.scrubbed=u}},getSelection(){return {removeAllRanges(){},addRange(){}}}},IntersectionObserver:class{observe(){}},setTimeout(){}};
  vm.runInNewContext(source,context);
  return {elements,receipt,async copy(){await element('join-copy').handlers.click()}};
}
(async()=>{
  const cases=[
    ['#c=K4T9BX','K4T9BX'],['?c=K4T9BX','K4T9BX'],['#CODE=k4t9bx','K4T9BX'],
    ['?code=k4-t9%20bx','K4T9BX'],['?c=K4T9BX#c=B7M2PQ','B7M2PQ'],
    ['?c=K4T9BX#c=invalid',''],['?c=%ZZ&code=K4T9BX',''],['#c=K4T9B+X',''],
    ['#c=K4T9B!X',''],['#c=ABCD%C3%9F',''],['#c=IO01AB',''],['#c=K4T9BX&c=B7M2PQ','K4T9BX'],['',''],
  ];
  for(const [query,expected] of cases){const r=await render('https://getphonepact.com/join'+query);assert.equal(r.receipt.scrubbed,'/join');assert.equal(r.elements.get(expected?'join-has-code':'join-no-code').hidden,false);if(expected){assert.equal(r.elements.get('join-code-value').textContent,expected);assert.equal(r.elements.get('join-open').href,'phonepact://join#c='+expected)}}
  const success=await render('https://getphonepact.com/join#c=K4T9BX');await success.copy();assert.equal(success.receipt.copied,'K4T9BX');assert.equal(success.elements.get('join-copy').textContent,'Copied');
  const fallback=await render('https://getphonepact.com/join#c=K4T9BX',false);await fallback.copy();assert.equal(fallback.receipt.copied,null);assert.equal(fallback.receipt.selected,true);assert.equal(fallback.elements.get('join-copy').textContent,'Code selected — copy it');
  console.log(`${cases.length} invitation cases + clipboard success/failure passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});
