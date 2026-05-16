"use strict";
var TM={
records:[],
exact:new Map(),
compact:new Map(),
tokenIndex:new Map(),
cache:new Map(),
ready:false,
config:{
minScore:60,
confirmedScore:95,
maxCandidates:900,
maxTokenHitsPerToken:3500,
maxTokensPerQuery:14
}
};
function asc(s){
return String(s|| "")
.replace(/[٠-٩]/g,function(d){return String("٠١٢٣٤٥٦٧٨٩".indexOf(d));})
.replace(/[۰-۹]/g,function(d){return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d));});
}
function normalizeText(s){
return asc(String(s|| ""))
.normalize("NFKC")
.replace(/&nbsp;/gi, " ")
.replace(/&amp;/gi, "&")
.replace(/&lt;/gi, "<")
.replace(/&gt;/gi, ">")
.replace(/&quot;/gi, '"')
.replace(/&#39;/g, "'")
.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
.replace(/\u0640/g, "")
.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
.replace(/[\u200B\u200C\u200D\u2060\uFEFF\u034F]/g, "")
.replace(/\u00A0|\u202F|\u2007|[\u2000-\u200A]/g, " ")
.replace(/[أإآٱ]/g, "ا")
.replace(/[ىی]/g, "ي")
.replace(/ک/g, "ك")
.replace(/[ہھۀ]/g, "ه")
.replace(/ة/g, "ه")
.replace(/ؤ/g, "و")
.replace(/ئ/g, "ي")
.replace(/[،]/g, ",")
.replace(/[؛]/g, ";")
.replace(/[؟]/g, "?")
.replace(/[“”„«»]/g, '"')
.replace(/[‘’‚]/g, "'")
.replace(/[ـ–—−]/g, "-")
.replace(/[()\[\]{}]/g, " ")
.replace(/[,:;.!?؟،؛"'`~|\\/]+/g, " ")
.replace(/\s+/g, " ")
.trim()
.toLowerCase();
}
function compactText(s){
return normalizeText(s).replace(/[^0-9A-Za-z\u0600-\u06FF]+/g, "");
}
function hasAr(s){return/[\u0600-\u06FF]/.test(String(s|| ""));}
function hasEn(s){return/[A-Za-z]/.test(String(s|| ""));}
function arRatio(s){
s=String(s|| "");
if(!s)return 0;
var n=(s.match(/[\u0600-\u06FF]/g)||[]).length;
return n/Math.max(1,s.length);
}
function enRatio(s){
s=String(s|| "");
if(!s)return 0;
var n=(s.match(/[A-Za-z]/g)||[]).length;
return n/Math.max(1,s.length);
}
var STOP=Object.create(null);
[
"في","من","على","الى","إلى","عن","او","أو","و","ف","ثم","ذلك","هذه","هذا","تلك","التي","الذي","ان","أن","كل","اي","أي","بما","كما","قد","لا","ما","لم","لن","له","لها","به","بها","فيه","فيها","عليه","عليها","يكون","تكون","كان","كانت","اذا","إذا","حسب","وفق","وفقا","دون","غير","ذات","عند","بعد","قبل","بين","مع","حيث","خلال",
"the","a","an","and","or","of","in","on","to","for","from","by","with","without","shall","must","may","be","is","are","was","were","as","at","that","this","these","those","it","its","not","no","any","all","each","such"
].forEach(function(w){STOP[normalizeText(w)]=1;});
function stripToken(w,l){
w=normalizeText(w);
if(l=== "ar"){
w=w.replace(/^(?:و|ف|ب|ك|ل)+/g, "").replace(/^ال/g, "");
}
return w;
}
function tokens(s,l){
var n=normalizeText(s);
if(!n)return[];
var out=[];
var seen=Object.create(null);
n.split(/\s+/).forEach(function(w){
w=stripToken(w,l||(hasAr(w)? "ar": "en"));
if(!w||w.length<2||STOP[w]||seen[w])return;
seen[w]=1;
out.push(w);
});
return out;
}
function getSource(tu){
return tu.source||tu.src||tu.ar||tu.sourceText||tu.s|| "";
}
function getTarget(tu){
return tu.target||tu.trg||tu.en||tu.targetText||tu.t|| "";
}
function getAr(tu){
return tu.ar||(hasAr(tu.source|| "")?tu.source: "")||(hasAr(tu.src|| "")?tu.src: "");
}
function getEn(tu){
return tu.en||(hasEn(tu.target|| "")?tu.target: "")||(hasEn(tu.trg|| "")?tu.trg: "");
}
function cleanTargetForSource(sourceText,targetText){
sourceText=String(sourceText|| "");
targetText=String(targetText|| "").replace(/\s+/g, " ").trim();
if(!targetText)return "";
var sourceIsArabic=hasAr(sourceText);
var sourceIsEnglish=hasEn(sourceText)&&!sourceIsArabic;
var t=targetText
.replace(/([A-Za-z0-9.!?;])([\u0600-\u06FF])/g, "$1\n$2")
.replace(/([\u0600-\u06FF])([A-Za-z])/g, "$1\n$2")
.trim();
if(sourceIsArabic){
var enParts=t
.split(/\n+|(?=[A-Z][A-Za-z0-9])/g)
.map(function(x){return x.replace(/\s+/g, " ").trim();})
.filter(Boolean)
.filter(function(x){return hasEn(x)&&arRatio(x)<0.12;});
if(enParts.length)t=enParts.join(" ");
}else if(sourceIsEnglish){
var arParts=t
.split(/\n+|(?=[\u0600-\u06FF])/g)
.map(function(x){return x.replace(/\s+/g, " ").trim();})
.filter(Boolean)
.filter(function(x){return hasAr(x)&&enRatio(x)<0.45;});
if(arParts.length)t=arParts.join(" ");
}
return t.replace(/\s+/g, " ").trim();
}
function extractNumbers(s){
return normalizeText(s).match(/\d+(?:[./-]\d+)*/g)||[];
}
function sameNumbersSafe(a,b){
var x=extractNumbers(a);
var y=extractNumbers(b);
if(!x.length&&!y.length)return true;
if(x.length!==y.length)return false;
return x.slice().sort().join("|")===y.slice().sort().join("|");
}
function negationMismatch(a,b){
var x=normalizeText(a);
var y=normalizeText(b);
var nx=/\b(لا|ليس|ليست|لم|لن|دون|غير|no|not|never|without|unless)\b/.test(x);
var ny=/\b(لا|ليس|ليست|لم|لن|دون|غير|no|not|never|without|unless)\b/.test(y);
return nx!==ny;
}
function makeSet(arr){
var s=new Set();
arr.forEach(function(x){if(x)s.add(x);});
return s;
}
function jaccard(a,b){
if(!a.size||!b.size)return 0;
var inter=0;
a.forEach(function(x){if(b.has(x))inter++;});
var union=a.size+b.size-inter;
return union?inter/union:0;
}
function charNgrams(s,n){
s=compactText(s);
n=n||3;
var out=new Set();
if(!s)return out;
if(s.length<=n){
out.add(s);
return out;
}
for(var i=0;i<=s.length-n;i++){
out.add(s.slice(i,i+n));
}
return out;
}
function tokenSimilarity(queryTokens,recTokens){
return jaccard(makeSet(queryTokens),makeSet(recTokens));
}
function ngramSimilarity(a,b){
return jaccard(charNgrams(a,3),charNgrams(b,3));
}
function containmentScore(query,candidate){
var q=normalizeText(query);
var c=normalizeText(candidate);
if(!q||!c)return 0;
if(q===c)return 1;
if(c.indexOf(q)!==-1){
return Math.max(0.78,Math.min(0.96,q.length/Math.max(1,c.length)));
}
if(q.indexOf(c)!==-1){
return Math.max(0.72,Math.min(0.92,c.length/Math.max(1,q.length)));
}
return 0;
}
function lengthRatio(a,b){
var x=normalizeText(a).length;
var y=normalizeText(b).length;
if(!x||!y)return 0;
return Math.min(x,y)/Math.max(x,y);
}
function statusFromScore(score,target){
if(!target)return "Needs Translation";
score=+score||0;
if(score>=TM.config.confirmedScore)return "Confirmed";
if(score>=TM.config.minScore)return "Review";
return "Needs Translation";
}
function addList(map,key,rec){
if(!key)return;
if(!map.has(key))map.set(key,[]);
map.get(key).push(rec);
}
function addRecord(source,target,sourceLang,targetLang,meta){
source=String(source|| "").trim();
target=cleanTargetForSource(source,target);
if(!source||!target)return;
if(sourceLang=== "ar"&&!hasAr(source))return;
if(sourceLang=== "en"&&!hasEn(source))return;
var rec={
id:TM.records.length,
source:source,
target:target,
sourceLang:sourceLang,
targetLang:targetLang,
sourceNorm:normalizeText(source),
sourceCompact:compactText(source),
sourceTokens:tokens(source,sourceLang),
row:meta&&typeof meta.row!== "undefined"?meta.row:-1,
mode:meta&&meta.mode?meta.mode: "tm"
};
if(!rec.sourceNorm||!rec.sourceCompact||!rec.sourceTokens.length)return;
TM.records.push(rec);
addList(TM.exact,rec.sourceNorm,rec);
addList(TM.compact,rec.sourceCompact,rec);
rec.sourceTokens.slice(0,80).forEach(function(tok){
if(!TM.tokenIndex.has(tok))TM.tokenIndex.set(tok,[]);
var arr=TM.tokenIndex.get(tok);
if(arr.length<TM.config.maxTokenHitsPerToken)arr.push(rec.id);
});
}
function buildIndex(tus){
TM.records=[];
TM.exact=new Map();
TM.compact=new Map();
TM.tokenIndex=new Map();
TM.cache=new Map();
TM.ready=false;
tus=Array.isArray(tus)?tus:[];
for(var i=0;i<tus.length;i++){
var tu=tus[i]||{};
var ar=getAr(tu);
var en=getEn(tu);
if(!ar||!en){
var src=getSource(tu);
var trg=getTarget(tu);
if(hasAr(src)&&hasEn(trg)){
ar=src;
en=trg;
}else if(hasEn(src)&&hasAr(trg)){
ar=trg;
en=src;
}
}
if(!ar||!en)continue;
addRecord(ar,en, "ar", "en",{row:tu.row,mode:tu.mode|| "tm"});
addRecord(en,ar, "en", "ar",{row:tu.row,mode:tu.mode|| "tm"});
}
TM.ready=true;
return{
tus:tus.length,
records:TM.records.length,
exactSize:TM.exact.size,
compactSize:TM.compact.size,
tokenSize:TM.tokenIndex.size
};
}
function scoreCandidate(query,qLang,qTokens,rec){
var qNorm=normalizeText(query);
var qCompact=compactText(query);
if(qNorm&&qNorm===rec.sourceNorm){
return{score:100,type: "exact"};
}
if(qCompact&&qCompact===rec.sourceCompact){
return{score:99,type: "normalized_exact"};
}
var contain=containmentScore(query,rec.source);
var token=tokenSimilarity(qTokens,rec.sourceTokens);
var ng=ngramSimilarity(query,rec.source);
var len=lengthRatio(query,rec.source);
var score=Math.round(contain*38+token*34+ng*22+len*6);
var type= "fuzzy";
if(contain>=0.92){
score=Math.max(score,95);
type= "partial";
}else if(contain>=0.80&&ng>=0.34){
score=Math.max(score,86);
type= "partial";
}else if(ng>=0.62&&token>=0.25){
score=Math.max(score,82);
type= "fuzzy";
}else if(token>=0.60&&ng>=0.28){
score=Math.max(score,75);
type= "token";
}
return{
score:Math.min(100,score),
type:type,
token:token,
ng:ng,
contain:contain,
len:len
};
}
function safeCandidate(query,qLang,qTokens,rec,s){
if(!rec||!rec.target)return false;
if(qLang&&rec.sourceLang!==qLang)return false;
if((+s.score||0)<TM.config.minScore)return false;
if(!sameNumbersSafe(query,rec.source))return false;
if(negationMismatch(query,rec.source))return false;
var token=typeof s.token=== "number"?s.token:tokenSimilarity(qTokens,rec.sourceTokens);
var ng=typeof s.ng=== "number"?s.ng:ngramSimilarity(query,rec.source);
var contain=typeof s.contain=== "number"?s.contain:containmentScore(query,rec.source);
var len=typeof s.len=== "number"?s.len:lengthRatio(query,rec.source);
if(s.score<70&&token<0.42&&ng<0.42&&contain<0.80)return false;
if(s.score<80&&token<0.24&&ng<0.40&&contain<0.80)return false;
if(s.score<85&&len<0.20&&contain<0.82)return false;
return true;
}
function pickBest(query,qLang,qTokens,candidates){
var scored=[];
for(var i=0;i<candidates.length;i++){
var rec=candidates[i];
var s=scoreCandidate(query,qLang,qTokens,rec);
if(!safeCandidate(query,qLang,qTokens,rec,s))continue;
scored.push({
rec:rec,
score:s.score,
type:s.type
});
}
if(!scored.length)return null;
scored.sort(function(a,b){return b.score-a.score;});
var best=scored[0];
var second=scored[1];
if(second&&best.score<92&&Math.abs(best.score-second.score)<=3){
if(compactText(best.rec.target)!==compactText(second.rec.target)){
return null;
}
}
return best;
}
function collectCandidates(qTokens){
var counts=Object.create(null);
qTokens
.map(function(tok){
var arr=TM.tokenIndex.get(tok)||[];
return{tok:tok,count:arr.length};
})
.filter(function(x){return x.count;})
.sort(function(a,b){return a.count-b.count;})
.slice(0,TM.config.maxTokensPerQuery)
.forEach(function(x){
var arr=TM.tokenIndex.get(x.tok)||[];
for(var i=0;i<arr.length;i++){
counts[arr[i]]=(counts[arr[i]]||0)+1;
}
});
return Object.keys(counts)
.map(function(id){return{id:+id,hits:counts[id]};})
.sort(function(a,b){return b.hits-a.hits;})
.slice(0,TM.config.maxCandidates)
.map(function(x){return TM.records[x.id];})
.filter(Boolean);
}
function resultFrom(found){
if(!found||!found.rec){
return{
target: "",
targetLang: "",
score:0,
status: "Needs Translation",
mode: "none",
source: ""
};
}
return{
target:found.rec.target,
targetLang:found.rec.targetLang,
score:found.score,
status:statusFromScore(found.score,found.rec.target),
mode: "worker-global-"+found.type,
source:found.rec.source,
row:found.rec.row
};
}
function matchOne(sourceText,lang,minScore){
if(!TM.ready)return resultFrom(null);
minScore=Number(minScore||TM.config.minScore||60);
TM.config.minScore=minScore;
sourceText=String(sourceText|| "").trim();
var qCompact=compactText(sourceText);
if(!qCompact)return resultFrom(null);
var qLang=lang||(hasAr(sourceText)? "ar": "en");
var cacheKey=qLang+ "|"+minScore+ "|"+qCompact;
if(TM.cache.has(cacheKey))return TM.cache.get(cacheKey);
var qNorm=normalizeText(sourceText);
var qTokens=tokens(sourceText,qLang);
var exact=pickBest(sourceText,qLang,qTokens,TM.exact.get(qNorm)||[]);
if(exact&&exact.score>=minScore){
var exactResult=resultFrom(exact);
TM.cache.set(cacheKey,exactResult);
return exactResult;
}
var compact=pickBest(sourceText,qLang,qTokens,TM.compact.get(qCompact)||[]);
if(compact&&compact.score>=minScore){
var compactResult=resultFrom(compact);
TM.cache.set(cacheKey,compactResult);
return compactResult;
}
var candidates=collectCandidates(qTokens);
var fuzzy=pickBest(sourceText,qLang,qTokens,candidates);
if(fuzzy&&fuzzy.score>=minScore){
var fuzzyResult=resultFrom(fuzzy);
TM.cache.set(cacheKey,fuzzyResult);
return fuzzyResult;
}
var none=resultFrom(null);
TM.cache.set(cacheKey,none);
return none;
}
function matchBatch(items,minScore){
items=Array.isArray(items)?items:[];
return items.map(function(item){
return{
id:item.id,
result:matchOne(item.sourceText|| "",item.lang|| "",minScore||60)
};
});
}
self.onmessage=function(e){
var msg=e.data||{};
var id=msg.id||0;
var type=msg.type|| "";
var payload=msg.payload||{};
try{
if(type=== "BUILD_INDEX"){
self.postMessage({
id:id,
ok:true,
type: "BUILD_INDEX_DONE",
payload:buildIndex(payload.tus||[])
});
return;
}
if(type=== "MATCH_ONE"||type=== "RECOVER_ONE"){
self.postMessage({
id:id,
ok:true,
type: "MATCH_ONE_DONE",
payload:matchOne(payload.sourceText|| "",payload.lang|| "",payload.minScore||60)
});
return;
}
if(type=== "MATCH_BATCH"||type=== "RECOVER_BATCH"){
self.postMessage({
id:id,
ok:true,
type: "MATCH_BATCH_DONE",
payload:matchBatch(payload.items||[],payload.minScore||60)
});
return;
}
self.postMessage({
id:id,
ok:false,
error: "Unknown worker message type: "+type
});
}catch(err){
self.postMessage({
id:id,
ok:false,
error:err&&err.message?err.message:String(err)
});
}
};
