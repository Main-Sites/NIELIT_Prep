/* Nootech Exam Arena
   DEMO ONLY: this client-side access code is visible in downloaded JavaScript.
   For production, verify candidate identity/access code and store attempts/results on a server. */
"use strict";

const EXAM_CONFIG = {
  durationSeconds: 45 * 60,
  examTopic: "NIELIT CCC", // Change this label for the exam being administered.
  allowedScreenViolations: 4,
  accessCode: "NOOTECH2026", // Demo-only access gate; production access codes should also be checked server-side.
  requireFutureOrTodayDate: true,
  // Paste the deployed Google Apps Script Web App URL here. Leave blank for the original local-demo mode.
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbz6OeCpndz_78mKDjC9hck6dz1LQFZtBV4Mijay8Rm5hWRK-h0oxHX2OzklaqLSnoAaJg/exec"
};

// Replace these sample questions with the approved exam bank before publishing.
let QUESTION_BANK = [
 {q:"Which component is known as the brain of a computer?",options:["RAM","CPU","Hard disk","Monitor"],answer:1,explanation:"The CPU executes instructions and coordinates computer operations."},
 {q:"Which of the following is volatile memory?",options:["ROM","DVD","RAM","SSD"],answer:2,explanation:"RAM is volatile: its contents are lost when power is removed."},
 {q:"What does URL stand for?",options:["Uniform Resource Locator","Universal Record Link","Unified Routing Language","User Reference Location"],answer:0,explanation:"URL means Uniform Resource Locator, the address of a resource on the web."},
 {q:"Which keyboard shortcut is commonly used to copy selected content in Windows?",options:["Ctrl + X","Ctrl + V","Ctrl + C","Ctrl + Z"],answer:2,explanation:"Ctrl+C copies selected content; Ctrl+X cuts and Ctrl+V pastes."},
 {q:"Which of these is an operating system?",options:["MS Word","Linux","Google Search","HTML"],answer:1,explanation:"Linux is an operating system. MS Word is an application and HTML is a markup language."},
 {q:"What is the main purpose of antivirus software?",options:["Increase monitor size","Detect and help remove malware","Create spreadsheets","Improve typing speed"],answer:1,explanation:"Antivirus tools detect, block, quarantine, or remove malicious software."},
 {q:"Which file extension is commonly used for an Excel workbook in modern Excel?",options:[".pptx",".xlsx",".docx",".html"],answer:1,explanation:".xlsx is the standard modern Excel workbook format."},
 {q:"Which device is primarily used to input printed text into a computer as an image?",options:["Speaker","Projector","Scanner","Plotter"],answer:2,explanation:"A scanner captures a paper document or image digitally."},
 {q:"Which of these is a strong password practice?",options:["Use your name only","Reuse one password everywhere","Share passwords with friends","Use a long, unique password"],answer:3,explanation:"Long, unique passwords reduce the impact of guessing and credential reuse."},
 {q:"In a spreadsheet, a formula usually begins with which symbol?",options:["#","=","@","&"],answer:1,explanation:"Spreadsheet formulas generally begin with an equals sign."}
];

// Local imports remain available only when Google Apps Script is not configured. In Sheets mode, the server is the source of truth.
const IMPORT_STORAGE_KEY = "nootechExamArena.importedQuestions.v1";
let importedQuestions = EXAM_CONFIG.googleAppsScriptUrl ? [] : loadImportedQuestions();
QUESTION_BANK = QUESTION_BANK.concat(importedQuestions);
let remoteQuestionMode = false;
let remoteQuestionIds = [];
let currentExamSessionId = "";
let remoteResult = null;

const $ = id => document.getElementById(id);
const views = ["landing","questionManager","accessSection","examSection","resultSection"];
let candidate = null, answers = [], currentQuestion = 0, violations = 0;
let timerId = null, secondsLeft = EXAM_CONFIG.durationSeconds, examActive = false, submitted = false;
let startedAt = null, warningTimeout = null;

function showView(id){ views.forEach(view => $(view).classList.toggle("hidden", view !== id)); window.scrollTo({top:0,behavior:"smooth"}); }
function setMinDate(){ const today = new Date(); const localDate = new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10); $("examDate").min = localDate; $("examDate").value = localDate; $("todayLabel").textContent = today.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"}).toUpperCase(); }
function cleanMobile(value){return value.replace(/\D/g,"");}
$("mobile").addEventListener("input", e => {e.target.value = cleanMobile(e.target.value).slice(0,10);});
$("candidateForm").addEventListener("submit", e => {
 e.preventDefault(); $("formError").textContent = "";
 const name = $("candidateName").value.trim(), mobile = cleanMobile($("mobile").value), date = $("examDate").value;
 if(name.length < 2){$("formError").textContent="Please enter the candidate’s full name.";return;}
 if(!/^[6-9]\d{9}$/.test(mobile)){ $("formError").textContent="Enter a valid 10-digit Indian mobile number beginning with 6, 7, 8 or 9."; return; }
 if(!date){$("formError").textContent="Select the date of examination.";return;}
 if(EXAM_CONFIG.requireFutureOrTodayDate && date < $("examDate").min){$("formError").textContent="The examination date cannot be in the past.";return;}
 candidate = {name,mobile,examDate:date};
 $("accessError").textContent=""; $("accessCode").value=""; showView("accessSection"); $("accessCode").focus();
});
$("backToDetails").addEventListener("click",()=>showView("landing"));
$("accessForm").addEventListener("submit", async e=>{
 e.preventDefault(); $("accessError").textContent="";
 if($("accessCode").value.trim() !== EXAM_CONFIG.accessCode){$("accessError").textContent="Access code not recognized. Check with your exam administrator.";return;}
 const submitButton=$("accessForm").querySelector('button[type="submit"]');
 if(submitButton){submitButton.disabled=true;submitButton.dataset.originalText=submitButton.textContent;submitButton.textContent="Loading exam questions…";}
 try {
  if(EXAM_CONFIG.googleAppsScriptUrl.trim()) await loadQuestionsFromSheets();
  startExam();
 } catch(error) {
  $("accessError").textContent="Could not load questions from Google Sheets. Please contact the exam administrator. Details: "+error.message;
 } finally {if(submitButton){submitButton.disabled=false;submitButton.textContent=submitButton.dataset.originalText||"Start examination";}}
});
// JSONP is used for Google Apps Script GET requests because Apps Script ContentService
// does not provide configurable CORS headers for a static GitHub Pages frontend.
function sheetsJsonp(params, timeoutMs=15000){
 return new Promise((resolve,reject)=>{
  const base=EXAM_CONFIG.googleAppsScriptUrl.trim();
  if(!base) return reject(new Error("Google Apps Script URL is not configured."));
  const callback="__nootechSheetsCb_"+Date.now()+"_"+Math.floor(Math.random()*1000000);
  const script=document.createElement("script");let settled=false;
  const cleanup=()=>{delete window[callback];script.remove();clearTimeout(timer);};
  const timer=setTimeout(()=>{if(settled)return;settled=true;cleanup();reject(new Error("Google Sheets request timed out."));},timeoutMs);
  window[callback]=(payload)=>{if(settled)return;settled=true;cleanup();if(payload&&payload.ok===false)reject(new Error(payload.error||"Google Sheets request failed."));else resolve(payload);};
  const query=new URLSearchParams({...params,callback});
  script.onerror=()=>{if(settled)return;settled=true;cleanup();reject(new Error("Could not reach the Google Apps Script endpoint. Check deployment access and URL."));};
  script.src=base+(base.includes("?")?"&":"?")+query.toString();document.head.appendChild(script);
 });
}
async function loadQuestionsFromSheets(){
 const payload=await sheetsJsonp({action:"questions"});
 if(!Array.isArray(payload.questions)||payload.questions.length===0)throw new Error("The Google Sheet contains no active questions.");
 const clean=payload.questions.map((q,i)=>({id:String(q.id??i+1),q:String(q.q||"").trim(),options:Array.isArray(q.options)?q.options.map(v=>String(v)):[]}));
 if(clean.some(q=>!q.q||q.options.length!==4||q.options.some(v=>!v.trim())))throw new Error("The Google Sheet has invalid question rows. Check the required columns and options.");
 remoteQuestionIds=clean.map(q=>q.id);currentExamSessionId=String(payload.sessionId||"");if(!currentExamSessionId)throw new Error("The server did not issue an exam session. Reload and try again.");QUESTION_BANK=clean.map(q=>({q:q.q,options:q.options,answer:null,explanation:""}));remoteQuestionMode=true;importedQuestions=[];updateQuestionCounts();
}
function startExam(){
 answers = Array(QUESTION_BANK.length).fill(null); currentQuestion=0; violations=0; secondsLeft=EXAM_CONFIG.durationSeconds; submitted=false; examActive=true; startedAt=Date.now();
 $("candidateLine").textContent = `${candidate.name} · +91 ${candidate.mobile} · Exam date: ${candidate.examDate}`;
 $("warningBanner").classList.add("hidden"); showView("examSection"); renderQuestion(); renderPalette(); updateTimer();
 clearInterval(timerId); timerId=setInterval(()=>{ if(!examActive)return; secondsLeft--; updateTimer(); if(secondsLeft<=0)submitExam("Time expired");},1000);
 // Request fullscreen as a deterrent only; browsers may deny it and it is not a secure lock.
 document.documentElement.requestFullscreen?.().catch?.(()=>{});
}
function updateTimer(){const m=Math.floor(Math.max(0,secondsLeft)/60),s=Math.max(0,secondsLeft)%60;$("timer").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;$("timer").style.color=secondsLeft<=300?"#d84455":"#7157f3";}
function renderQuestion(){
 const item=QUESTION_BANK[currentQuestion]; $("questionCount").textContent=`Question ${currentQuestion+1} of ${QUESTION_BANK.length}`;$("questionTag").textContent=`QUESTION ${String(currentQuestion+1).padStart(2,"0")}`;$("questionText").textContent=item.q;
 $("options").innerHTML="";
 item.options.forEach((option,i)=>{const btn=document.createElement("button");btn.type="button";btn.className="option"+(answers[currentQuestion]===i?" selected":"");btn.setAttribute("aria-pressed",answers[currentQuestion]===i?"true":"false");const key=document.createElement("span");key.className="option-key";key.textContent=String.fromCharCode(65+i);const label=document.createElement("span");label.textContent=option;btn.append(key,label);btn.addEventListener("click",()=>{if(!examActive)return;answers[currentQuestion]=i;renderQuestion();renderPalette();});$("options").appendChild(btn);});
 $("previousBtn").disabled=currentQuestion===0;$("nextBtn").textContent=currentQuestion===QUESTION_BANK.length-1?"Review & submit →":"Next question →";$("answeredLabel").textContent=`${answers.filter(v=>v!==null).length} answered`;$("progressBar").style.width=`${((currentQuestion+1)/QUESTION_BANK.length)*100}%`;renderPalette();
}
function renderPalette(){const root=$("palette");root.innerHTML="";QUESTION_BANK.forEach((_,i)=>{const b=document.createElement("button");b.type="button";b.textContent=i+1;b.className=(answers[i]!==null?"answered ":"")+(i===currentQuestion?"current":"");b.setAttribute("aria-label",`Question ${i+1}${answers[i]!==null?", answered":", unanswered"}`);b.addEventListener("click",()=>{currentQuestion=i;renderQuestion();});root.appendChild(b);});$("answeredLabel").textContent=`${answers.filter(v=>v!==null).length} answered`;$("violationBadge").textContent=`Screen alerts: ${violations} / ${EXAM_CONFIG.allowedScreenViolations}`;}
$("previousBtn").addEventListener("click",()=>{if(currentQuestion>0){currentQuestion--;renderQuestion();}});
$("nextBtn").addEventListener("click",()=>{if(currentQuestion<QUESTION_BANK.length-1){currentQuestion++;renderQuestion();}else openSubmitConfirmation();});
$("submitBtn").addEventListener("click",openSubmitConfirmation);
function openSubmitConfirmation(){if(!examActive)return;const unanswered=answers.filter(a=>a===null).length;$("confirmText").textContent=unanswered?`${unanswered} question(s) are unanswered. Once submitted, you cannot change your answers.`:"Once submitted, you cannot change your answers."; $("confirmModal").classList.remove("hidden");}
$("cancelSubmit").addEventListener("click",()=>$("confirmModal").classList.add("hidden"));
$("confirmSubmit").addEventListener("click",()=>{ $("confirmModal").classList.add("hidden");submitExam("Submitted by candidate");});
$("dismissWarning").addEventListener("click",()=>$("warningBanner").classList.add("hidden"));
function recordViolation(){
 if(!examActive||submitted)return;
 violations++; renderPalette();
 if(violations>=EXAM_CONFIG.allowedScreenViolations){showWarning("Final integrity violation",`Screen-change limit reached (${violations}/${EXAM_CONFIG.allowedScreenViolations}). Your test is being submitted automatically.`);setTimeout(()=>submitExam("Automatically submitted: screen-change limit reached"),1200);}
 else showWarning("Exam integrity warning",`You left the exam screen ${violations} of ${EXAM_CONFIG.allowedScreenViolations} times. Warning ${violations} of 3. On the 4th screen change, the exam will be submitted automatically.`);
}
function showWarning(title,message){$("warningTitle").textContent=title;$("warningText").textContent=message;$("warningBanner").classList.remove("hidden");clearTimeout(warningTimeout);warningTimeout=setTimeout(()=>$("warningBanner").classList.add("hidden"),6500);}
document.addEventListener("visibilitychange",()=>{if(document.hidden)recordViolation();});
// Intentionally do not count window blur as another violation: switching tabs can trigger both blur and visibilitychange.
async function submitExam(reason){
 if(submitted)return;submitted=true;examActive=false;clearInterval(timerId);clearTimeout(warningTimeout);
 if(document.fullscreenElement)document.exitFullscreen?.().catch?.(()=>{});
 let evaluation=null;
 if(remoteQuestionMode){
  try {
   const payload=await sheetsJsonp({
    action:"score",
    sessionId:currentExamSessionId,
    ids:JSON.stringify(remoteQuestionIds),
    answers:JSON.stringify(answers.map(v=>v===null?-1:v)),
    candidateName:candidate?.name||"",
    mobile:candidate?.mobile||"",
    examDate:candidate?.examDate||"",
    examTopic:EXAM_CONFIG.examTopic,
    violations:String(violations),
    reason:String(reason||"Submitted"),
    startedAt:startedAt?new Date(startedAt).toISOString():""
   },20000);
   evaluation=payload.result;
   if(!evaluation||!Array.isArray(evaluation.review))throw new Error("The scoring service returned an invalid result.");
   remoteResult=evaluation;
  } catch(error) {
   // Do not silently calculate a production score in the browser when the answer key is server-side.
   submitted=false;examActive=false;
   $("resultTitle").textContent="Submission received, score pending";
   $("resultSubtitle").textContent="Your answers could not be verified by the Google Sheets scoring service. Keep this page open and contact the exam administrator. Error: "+error.message;
   $("scoreValue").textContent="—";$("percentageValue").textContent="—";$("attemptedValue").textContent=answers.filter(a=>a!==null).length+"/"+QUESTION_BANK.length;
   $("resultDetails").replaceChildren();$("answerReview").replaceChildren();showView("resultSection");return;
  }
 }
 const correct=remoteQuestionMode?evaluation.score:answers.reduce((sum,a,i)=>sum+(a===QUESTION_BANK[i].answer?1:0),0);
 const attempted=answers.filter(a=>a!==null).length, wrong=attempted-correct, pct=remoteQuestionMode?evaluation.percentage:Math.round(correct/QUESTION_BANK.length*100);
 $("resultTitle").textContent=reason==="Submitted by candidate"?"Your result is ready!":reason==="Time expired"?"Time is up — your result is ready":"Examination submitted";
 $("resultSubtitle").textContent=reason.startsWith("Automatically")?"Your test was automatically submitted after reaching the screen-change limit.":reason==="Time expired"?"The allotted time ended. Your saved answers have been evaluated.":"Your answers have been evaluated successfully.";
 $("scoreValue").textContent=`${correct}/${QUESTION_BANK.length}`;$("percentageValue").textContent=`${pct}%`;$("attemptedValue").textContent=`${attempted}/${QUESTION_BANK.length}`;
 $("resultDetails").innerHTML="";[[correct,"Correct answers"],[wrong,"Incorrect answers"],[QUESTION_BANK.length-attempted,"Unanswered"],[violations,"Screen alerts"]].forEach(([n,label])=>{const d=document.createElement("div");d.className="result-detail";const b=document.createElement("b");b.textContent=n;const s=document.createElement("small");s.textContent=label;d.append(b,s);$("resultDetails").appendChild(d);});
 $("answerReview").innerHTML="";
 const review=remoteQuestionMode?evaluation.review:QUESTION_BANK.map((q,i)=>({q:q.q,options:q.options,answer:q.answer,explanation:q.explanation,yourAnswer:answers[i]}));
 review.forEach((q,i)=>{const yourAnswer=remoteQuestionMode?(q.yourAnswer===-1?null:q.yourAnswer):answers[i];const item=document.createElement("div");item.className="review-item";const h=document.createElement("h4");h.textContent=`${i+1}. ${q.q}`;const your=document.createElement("p");your.className=yourAnswer===q.answer?"correct-answer":yourAnswer===null?"":"wrong-answer";your.textContent=`Your answer: ${yourAnswer===null?"Not answered":q.options[yourAnswer]}`;const right=document.createElement("p");right.className="correct-answer";right.textContent=`Correct answer: ${q.options[q.answer]}`;const exp=document.createElement("p");exp.textContent=`Explanation: ${q.explanation}`;item.append(h,your,right,exp);$("answerReview").appendChild(item);});
 const resultPayload={candidate,answers,score:correct,total:QUESTION_BANK.length,percentage:pct,violations,reason,startedAt:new Date(startedAt).toISOString(),submittedAt:new Date().toISOString()};
 if(!remoteQuestionMode)console.info("Demo exam result payload (not sent to a server):",resultPayload);
 showView("resultSection");
}
$("restartBtn").addEventListener("click",()=>{candidate=null;answers=[];examActive=false;submitted=false;$("candidateForm").reset();setMinDate();showView("landing");});
// ---------------- CSV Question Bank Manager ----------------
function loadImportedQuestions(){
 try {
  const raw=localStorage.getItem("nootechExamArena.importedQuestions.v1");
  if(!raw)return [];
  const parsed=JSON.parse(raw);
  if(!Array.isArray(parsed))return [];
  return parsed.filter(isValidQuestionObject);
 } catch(error) { console.warn("Could not load browser-imported questions:",error); return []; }
}
function isValidQuestionObject(q){
 return !!q && typeof q.q==="string" && q.q.trim()!=="" && Array.isArray(q.options) && q.options.length===4 && q.options.every(v=>typeof v==="string"&&v.trim()!=="") && Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=3 && typeof q.explanation==="string"&&q.explanation.trim()!=="";
}
function normalizeQuestion(value){return String(value||"").toLocaleLowerCase().normalize("NFKC").replace(/\s+/g," ").trim().replace(/[?!.]+$/g,"");}
function parseCsv(text){
 text=text.replace(/^\uFEFF/, ""); // tolerate UTF-8 BOM files exported by spreadsheet apps
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"'){quoted=false;}else{field+=ch;}}
  else if(ch==='"'){if(field.length)throw new Error("Unexpected quote in an unquoted field near character "+(i+1)+".");quoted=true;}
  else if(ch===","){row.push(field);field="";}
  else if(ch==="\n"){row.push(field);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];field="";}
  else if(ch!=="\r"){field+=ch;}
 }
 if(quoted)throw new Error("CSV contains an unclosed quoted field.");
 row.push(field);if(row.some(v=>v.trim()!==""))rows.push(row);
 return rows;
}
function parseQuestionCsv(text){
 const rows=parseCsv(text.trim());
 if(rows.length<2)throw new Error("Include a header row and at least one question row.");
 const headers=rows[0].map(v=>v.trim().toLowerCase().replace(/\s+/g,""));
 const required=["question","optiona","optionb","optionc","optiond","answer","explanation"];
 const missing=required.filter(h=>!headers.includes(h));
 if(missing.length)throw new Error("Missing required CSV column(s): "+missing.join(", ")+". Download the template for the exact header names.");
 const index=Object.fromEntries(required.map(h=>[h,headers.indexOf(h)]));
 if(rows.length-1>50)throw new Error("This batch contains "+(rows.length-1)+" question rows. Import a maximum of 50 questions per batch.");
 const questions=[],errors=[];
 rows.slice(1).forEach((row,i)=>{
  const line=i+2;const get=h=>(row[index[h]]??"").trim();
  if(row.length!==headers.length){errors.push("Row "+line+": expected "+headers.length+" columns but found "+row.length+".");return;}
  const q=get("question"),options=[get("optiona"),get("optionb"),get("optionc"),get("optiond")],rawAnswer=get("answer").toUpperCase(),explanation=get("explanation");
  if(!q){errors.push("Row "+line+": question text is required.");return;}
  if(options.some(v=>!v)){errors.push("Row "+line+": all four options (A–D) are required.");return;}
  const answerMap={A:0,B:1,C:2,D:3,"1":0,"2":1,"3":2,"4":3};
  if(!Object.prototype.hasOwnProperty.call(answerMap,rawAnswer)){errors.push("Row "+line+": answer must be A, B, C, D or 1, 2, 3, 4.");return;}
  if(!explanation){errors.push("Row "+line+": explanation is required.");return;}
  if(new Set(options.map(normalizeQuestion)).size!==4){errors.push("Row "+line+": the four options must be different.");return;}
  questions.push({q,options,answer:answerMap[rawAnswer],explanation,_csvRow:line});
 });
 return {questions,errors};
}
function updateQuestionCounts(){
 const total=QUESTION_BANK.length;
 ["landingQuestionCount","examSummaryQuestionCount","managerQuestionCount"].forEach(id=>{const el=$(id);if(el)el.textContent=total;});
}
let pendingCsvQuestions=[];
// Administrator token is held in memory only; never persist it in localStorage or source files.
let questionManagerAdminToken = "";
function setImportStatus(message,isError=false){const el=$("importStatus");el.textContent=message;el.classList.toggle("error",isError);}
function renderCsvPreview(questions,errors,duplicates){
 const root=$("csvPreview");root.replaceChildren();
 const summary=document.createElement("p");summary.className="preview-summary";summary.textContent=`Valid rows: ${questions.length} · Errors: ${errors.length} · Duplicates: ${duplicates.length}`;root.appendChild(summary);
 const all=[...errors.map(message=>({type:"error",message})),...duplicates.map(message=>({type:"duplicate",message})),...questions.map(q=>({type:"valid",message:`Row ${q._csvRow}: ${q.q}`}))];
 all.slice(0,60).forEach(item=>{const line=document.createElement("div");line.className="preview-line "+item.type;line.textContent=(item.type==="valid"?"✓ ":item.type==="duplicate"?"↻ ":"⚠ ")+item.message;root.appendChild(line);});
 if(all.length>60){const more=document.createElement("p");more.textContent=`…and ${all.length-60} more rows.`;root.appendChild(more);}
}
function validateCurrentCsv(){
 $("importCsv").disabled=true;pendingCsvQuestions=[];$("csvPreview").replaceChildren();
 try{
  const parsed=parseQuestionCsv($("csvText").value);
  const seen=new Set(QUESTION_BANK.map(q=>normalizeQuestion(q.q))),within=new Set(),duplicates=[];
  const unique=[];
  parsed.questions.forEach(q=>{const key=normalizeQuestion(q.q);if(seen.has(key)||within.has(key)){duplicates.push(`Row ${q._csvRow}: duplicate question text — ${q.q}`);}else{within.add(key);unique.push(q);}});
  pendingCsvQuestions=unique.map(({_csvRow,...q})=>q);
  renderCsvPreview(unique,parsed.errors,duplicates);
  const valid=unique.length>0&&parsed.errors.length===0&&duplicates.length===0;
  $("importCsv").disabled=!valid;
  setImportStatus(valid?`${unique.length} question(s) passed validation. Review the preview, then click “Add valid questions”.`:"Import is disabled until all rows are valid and duplicate-free. Correct the CSV and validate again.",!valid);
 }catch(error){setImportStatus(error.message,true);$("csvPreview").textContent=error.message;}
}

$("openQuestionManager").addEventListener("click", () => {
  // Ask for the administrator code before opening the CSV manager.
  const token = window.prompt(
    "Administrator code required to open the CSV question-bank manager:"
  );

  // Cancel or incorrect code: do not open the manager.
  if (token !== "Admin@csv2026") {
    if (token !== null) {
      window.alert("Invalid administrator code.");
    }
    return;
  }

  // Store the validated token for the existing import workflow.
  questionManagerAdminToken = token.trim();

  updateQuestionCounts();
  showView("questionManager");
});

$("closeQuestionManager").addEventListener("click",()=>{
 questionManagerAdminToken = "";
 pendingCsvQuestions = [];
 $("csvText").value = "";
 $("csvPreview").replaceChildren();
 $("importCsv").disabled = true;
 showView("landing");
});
$("downloadCsvTemplate").addEventListener("click",()=>{
 const template='question,optionA,optionB,optionC,optionD,answer,explanation\r\n"What does CPU stand for?","Central Processing Unit","Computer Personal Unit","Central Program Utility","Control Processing User",A,"CPU stands for Central Processing Unit."\r\n';
 const blob=new Blob([template],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="NIELIT_CCC_Question_Bank_Template.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
});
$("csvFile").addEventListener("change",async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>2*1024*1024){setImportStatus("CSV file is too large. Maximum file size is 2 MB.",true);e.target.value="";return;}try{$("csvText").value=await file.text();validateCurrentCsv();}catch(error){setImportStatus("Could not read this file. Please select a UTF-8 CSV file.",true);}e.target.value="";});
$("validateCsv").addEventListener("click",validateCurrentCsv);
$("importCsv").addEventListener("click",async()=>{
 if(!pendingCsvQuestions.length)return;
 const batch=pendingCsvQuestions.map(({q,options,answer,explanation})=>({q,options,answer,explanation}));
 if(EXAM_CONFIG.googleAppsScriptUrl.trim()){
  const adminToken=questionManagerAdminToken;
  if(!adminToken){setImportStatus("Administrator code is required. Close this screen and reopen the question manager.",true);return;}
  $("importCsv").disabled=true;setImportStatus("Uploading validated questions to Google Sheets…");
  try{
   // Refresh first so duplicate detection and the post-upload count are based on the central Sheet.
   await loadQuestionsFromSheets();const oldCount=QUESTION_BANK.length;
   // Apps Script accepts this simple text/plain POST. The opaque response is verified by reloading the bank.
   await fetch(EXAM_CONFIG.googleAppsScriptUrl.trim(),{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"appendQuestions",adminToken,questions:batch})});
   await new Promise(resolve=>setTimeout(resolve,1500));
   await loadQuestionsFromSheets();
   const found=batch.every(item=>QUESTION_BANK.some(q=>normalizeQuestion(q.q)===normalizeQuestion(item.q)));
   if(!found||QUESTION_BANK.length!==oldCount+batch.length)throw new Error("Upload was not added as a new batch. It may contain duplicates, or the admin token/deployment may be incorrect.");
   const added=QUESTION_BANK.length-oldCount;pendingCsvQuestions=[];$("csvText").value="";$("csvPreview").replaceChildren();$("importCsv").disabled=true;setImportStatus(`Verified: Google Sheets now contains the uploaded question batch. Current active question count: ${QUESTION_BANK.length}.`);updateQuestionCounts();
  }catch(error){$("importCsv").disabled=false;setImportStatus("Google Sheets upload could not be verified: "+error.message,true);}
  return;
 }
 const updatedImported=importedQuestions.concat(batch);
 try{localStorage.setItem(IMPORT_STORAGE_KEY,JSON.stringify(updatedImported));}
 catch(error){setImportStatus("Could not save questions in this browser (storage may be disabled or full). No questions were added.",true);return;}
 importedQuestions=updatedImported;QUESTION_BANK=QUESTION_BANK.concat(batch);const added=batch.length;pendingCsvQuestions=[];$("importCsv").disabled=true;$("csvText").value="";$("csvPreview").replaceChildren();updateQuestionCounts();setImportStatus(`${added} question(s) added successfully. They will be available in this browser on future visits.`);console.info(`Question bank updated: ${added} questions imported; total ${QUESTION_BANK.length}.`);
});
$("removeImportedQuestions").addEventListener("click",()=>{
 if(EXAM_CONFIG.googleAppsScriptUrl.trim()){setImportStatus("In Google Sheets mode, remove or deactivate questions directly in the administrator-controlled Google Sheet.");return;}
 if(!importedQuestions.length){setImportStatus("There are no browser-imported questions to remove.");return;}
 if(!window.confirm(`Remove ${importedQuestions.length} imported question(s) from this browser? The original sample bank will remain.`))return;
 try{localStorage.removeItem(IMPORT_STORAGE_KEY);}catch(error){setImportStatus("Could not clear browser storage.",true);return;}
 const removed=importedQuestions.length;importedQuestions=[];QUESTION_BANK=QUESTION_BANK.filter((q,i)=>i<QUESTION_BANK.length-removed); // Restores the built-in bank; imported questions are always appended last.
 pendingCsvQuestions=[];$("importCsv").disabled=true;updateQuestionCounts();setImportStatus(`${removed} imported question(s) removed from this browser.`);$("csvPreview").replaceChildren();
});
updateQuestionCounts();
if(EXAM_CONFIG.googleAppsScriptUrl.trim()){
 const warning=document.querySelector(".manager-warning");if(warning)warning.innerHTML="<b>Google Sheets mode:</b> questions are loaded from the configured Apps Script endpoint. CSV batches are sent to the administrator-controlled Sheet; answer keys stay on the server and are returned only after submission.";
 const removeBtn=$("removeImportedQuestions");if(removeBtn)removeBtn.textContent="Manage questions in Google Sheets";
 setImportStatus("Connecting to Google Sheets question bank…");
 loadQuestionsFromSheets().then(()=>setImportStatus(`Connected to Google Sheets. ${QUESTION_BANK.length} active question(s) loaded.`)).catch(error=>setImportStatus("Google Sheets connection failed: "+error.message,true));
}
setMinDate();
