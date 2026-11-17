const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const data=path.join(root,'data');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'discovery-viewer-test-'));
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{}),headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto('file://'+root+'/prioboard-viewer.html');
 await page.getByRole('heading',{name:'From raw feedback to product opportunities'}).waitFor();
 // YAML syntax, safe typing, duplicate rejection, and multiline handling.
 const parsed=await page.evaluate(()=>parseReport('---\n# A YAML comment\nschema_version: 2\nrun_id: 2026-11-14\nword: yes\nready: true\nscore: 4\nsummary: >-\n  first line\n  continues\nquote: |-\n  line one\n  line two\n---\n# Report'));
 assert.equal(parsed.run_id,'2026-11-14');assert.equal(parsed.word,'yes');assert.equal(parsed.ready,true);assert.equal(parsed.score,4);assert.equal(parsed.summary,'first line continues');assert.equal(parsed.quote,'line one\nline two');
 for(const yaml of ['schema_version: 2\nschema_version: 2','schema_version: 2\nvalue: [unfinished','schema_version: 2\na: &ref [1]\nb: *ref','schema_version: 2\nvalue: !custom hi']){
  assert.equal(await page.evaluate(raw=>{try{parseReport('---\n'+raw+'\n---\n# Body');return false;}catch{return true;}},yaml),true);
 }
 await page.locator('#folder-input').setInputFiles(data);
 await page.getByRole('status').filter({hasText:'Loaded 15 Markdown files'}).waitFor();
 assert.equal(await page.locator('.card').count(),6);
 assert.equal(await page.locator('.nav button svg.lucide').count(),5);
 assert.equal(await page.locator('#toolbar svg.lucide').count(),6);
 assert.equal(await page.locator('#open-folder use').getAttribute('href'),'#lucide-refresh-cw');
 assert.deepEqual(await page.locator('.rank').allTextContents(),['1','1','3','4','4','6']);
 await page.locator('.card').first().locator('summary').click();
 assert.equal(await page.locator('.card').first().locator('.dimension').count(),3);
 await page.locator('.card').first().getByRole('button',{name:'context/strategy.md',exact:true}).first().click();
 await page.locator('dialog[open] mark').waitFor();
 assert((await page.locator('dialog mark').textContent()).includes('AI Agents'));
 await page.getByRole('button',{name:'Close source'}).click();
 await page.locator('[data-view="clusters"]').click();assert.equal(await page.locator('.card').count(),6);
 await page.locator('.card').first().locator('summary').click();
 await page.locator('.card').first().getByRole('button',{name:'input/raw_feedback/customer_interviews.md',exact:true}).first().click();
 assert((await page.locator('dialog mark').textContent()).includes('vier Stunden'));
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
 await page.locator('[data-view="input"]').click();await page.getByRole('button',{name:'▸ raw_feedback/'}).click();await page.getByRole('button',{name:'slack.md',exact:true}).click();assert((await page.locator('.reader pre').textContent()).includes('@sarah.klein'));
 await page.locator('[data-view="context"]').click();await page.getByRole('button',{name:'company.md',exact:true}).click();assert((await page.locator('.reader pre').textContent()).includes('NeoEmployee'));
 await page.locator('[data-view="output"]').click();await page.getByRole('button',{name:'▸ discovery/'}).click();await page.getByRole('button',{name:'feedback-clusters.md',exact:true}).click();assert((await page.locator('.reader pre').textContent()).startsWith('# Feedback-Cluster'));
 await page.locator('[data-view="opportunities"]').click();await page.screenshot({path:path.join(work,'desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(work,'mobile.png'),fullPage:true});
 // Build isolated folder fixtures so no real reports are changed.
 const fixture=path.join(work,'fixtures');fs.rmSync(fixture,{recursive:true,force:true});fs.mkdirSync(fixture,{recursive:true});
 fs.cpSync(data+'/context',fixture+'/context',{recursive:true});fs.cpSync(data+'/input',fixture+'/input',{recursive:true});fs.cpSync(data+'/output',fixture+'/output',{recursive:true});
 // Malformed scorecard: show validation error, never render misleading rankings.
 const score=fixture+'/output/2026-11-14/strategy/opportunity-scorecard-v2.md';const original=fs.readFileSync(score,'utf8');fs.writeFileSync(score,original.replace('score: 4','score: 99'));
 await page.locator('#folder-input').setInputFiles(fixture);await page.getByRole('heading',{name:'No valid opportunity scorecards for this run'}).waitFor();assert((await page.locator('#content').textContent()).includes('Score must be integer 1–5'));assert.equal(await page.locator('.card').count(),0);
 // Missing report on newer run; selector can return to prior date, without comparison.
 fs.writeFileSync(score,original);fs.mkdirSync(fixture+'/output/2026-11-15/discovery',{recursive:true});fs.writeFileSync(fixture+'/output/2026-11-15/discovery/notes.md','# Notes');
 await page.locator('#folder-input').setInputFiles(fixture);await page.locator('select').selectOption('2026-11-15');await page.getByRole('heading',{name:'No valid feedback clusters for this run'}).waitFor();await page.locator('select').selectOption('2026-11-14');assert.equal(await page.locator('.card').count(),6);
 // Text is never interpreted as HTML, including malicious source material.
 fs.appendFileSync(fixture+'/input/raw_feedback/slack.md','\n<img src=x onerror="window.INJECTED=true">\n');
 await page.locator('#folder-input').setInputFiles(fixture);await page.locator('[data-view="input"]').click();await page.getByRole('button',{name:'▸ raw_feedback/'}).click();await page.getByRole('button',{name:'slack.md',exact:true}).click();assert((await page.locator('.reader pre').textContent()).includes('<img'));assert.equal(await page.locator('.reader img').count(),0);assert.equal(await page.evaluate(()=>window.INJECTED),undefined);
 // Failed folder import retains the previously loaded workspace.
 const empty=path.join(work,'invalid');fs.mkdirSync(empty,{recursive:true});fs.writeFileSync(empty+'/notes.md','# Wrong root');await page.locator('#folder-input').setInputFiles(empty);await page.getByRole('status').filter({hasText:'Previous workspace retained'}).waitFor();assert.equal(await page.locator('#workspace-name').textContent(),'fixtures');
 assert.deepEqual(errors,[]);assert(requests.every(url=>url.startsWith('file:')),'No network requests allowed');
 console.log('PASS: folder import, 6 ranked scorecards, ties, 6 clusters, evidence highlighting, source/context/report browsing, mobile layout, invalid scores, missing runs, run selection, injection safety, failed-import recovery, zero external requests.');
 console.log('Screenshots and temporary fixtures:',work);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
