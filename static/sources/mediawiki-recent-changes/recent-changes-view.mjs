/* SPDX-License-Identifier: GPL-2.0-or-later
 * Static binding of MediaWiki's classic OldChangesList/ChangesList interface.
 * Copyright MediaWiki contributors; adaptation 2026 PersonalWebsite contributors.
 * Original sources, commit, license and all adaptation boundaries are retained
 * in upstream/recent-changes/ and recent-changes-design-sources.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {transform,Features} from 'lightningcss';

const sourceRoot=new URL('./upstream/recent-changes/',import.meta.url);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateFormat=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric'});
const timeFormat=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
const source=name=>fs.readFileSync(new URL(name,sourceRoot),'utf8');

function timestamp(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Recent Changes requires a UTC ISO timestamp');
  if(new Date(value).toISOString()!==(value.includes('.')?value:value.replace('Z','.000Z')))throw Error('Invalid Recent Changes calendar date');
  return new Date(value);
}
function documentHref(document){
  if(!document||typeof document.nodeId!=='string'||!/^[A-Za-z0-9-]+$/.test(document.nodeId)||typeof document.pageSlug!=='string'||!/^[a-z0-9-]+$/.test(document.pageSlug)||typeof document.title!=='string')throw Error('Invalid Recent Changes document target');
  return '/blog/'+document.pageSlug+'#node-'+document.nodeId;
}

/** Render the classic MediaWiki date/list/line structure, without invented actions. */
export function renderRecentChangesList(snapshot){
  if(snapshot?.schema!=='website-page-changes-v1'||!Array.isArray(snapshot.documents)||!Array.isArray(snapshot.changes))throw Error('Invalid Recent Changes snapshot');
  const current=new Map();
  for(const document of snapshot.documents){
    documentHref(document);
    if(current.has(document.nodeId))throw Error('Duplicate Recent Changes document');
    current.set(document.nodeId,document);
  }
  // Like MediaWiki, withdrawn pages disappear and historical changes follow the
  // current title after a rename. Never render titles from unpublished records.
  const changes=snapshot.changes.filter(change=>current.has(change.nodeId)).map(change=>{
    if(!['created','updated','baseline'].includes(change.kind)||typeof change.summary!=='string')throw Error('Invalid Recent Changes entry');
    return {change,document:current.get(change.nodeId),date:timestamp(change.modifiedAt)};
  }).sort((left,right)=>right.date-left.date||left.document.nodeId.localeCompare(right.document.nodeId)||left.change.kind.localeCompare(right.change.kind));
  if(!changes.length)return '<div class="mw-changeslist" data-recent-changes><p>暂无已发布的页面更改。</p></div>';
  let content='<div class="mw-changeslist" data-recent-changes>',previousDate='';
  changes.forEach(({change,document,date},index)=>{
    const dateLabel=dateFormat.format(date);
    if(dateLabel!==previousDate){
      if(previousDate)content+='</ul>\n';
      // ChangesList::insertDateHeader uses h4 followed by ul.special.
      content+='<h4>'+escape(dateLabel)+'</h4>\n<ul class="special">';
      previousDate=dateLabel;
    }
    // OldChangesList::formatChangeLine: flags, article, timestamp, comment.
    // Diff/history/user/patrol fields are absent because this is a static feed.
    const flag=change.kind==='created'?'<abbr class="newpage" title="新页面">N</abbr> ':'';
    content+='<li class="mw-changeslist-line mw-changeslist-line-not-watched mw-line-'+(index%2?'even':'odd')+'" data-change-node="'+escape(document.nodeId)+'" data-change-kind="'+escape(change.kind)+'" data-change-time="'+escape(change.modifiedAt)+'">'+
      '<span class="mw-changeslist-line-inner" data-target-page="'+escape(document.title)+'">'+flag+
      '<span class="mw-title"><bdi dir="ltr"><a class="mw-changeslist-title" href="'+escape(documentHref(document))+'">'+escape(document.title)+'</a></bdi></span>'+
      '<span class="mw-changeslist-separator--semicolon"></span> '+
      '<time class="mw-changeslist-date mw-changeslist-time" datetime="'+escape(change.modifiedAt)+'">'+escape(timeFormat.format(date))+'</time> '+
      '<span class="mw-changeslist-separator"></span> '+
      '<span class="comment">('+escape(change.summary)+')</span></span></li>\n';
  });
  return content+'</ul></div>';
}

// Select the original top-level Less rule, retaining nested pseudo classes.
// No Less runtime is required: only pinned scalar variables and one documented
// LTR margin mixin are used; Lightning CSS performs native CSS nesting lowering.
function rule(css,wanted,occurrence=0){
  const clean=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'').replace(/^\s*@import[^;]*;/gm,'');
  let position=0;
  while(position<clean.length){
    const begin=clean.indexOf('{',position);if(begin<0)break;
    const selectors=clean.slice(position,begin).trim().split(',').map(selector=>selector.trim());
    let depth=1,end=begin+1;
    while(depth&&end<clean.length){if(clean[end]==='{')depth++;else if(clean[end]==='}')depth--;end++;}
    if(selectors.includes(wanted)&&occurrence--===0)return clean.slice(begin+1,end-1);
    position=end;
  }
  throw Error('Pinned MediaWiki rule missing: '+wanted);
}
function defaults(){
  return new Map([...source('mediawiki-skin.defaults.less').matchAll(/^@([\w-]+):\s*([^;]+);/gm)].map(match=>[match[1],match[2]]));
}
function resolveVariables(css){
  const variables=defaults();
  return css.replace(/@([\w-]+)/g,(_,name)=>{
    const value=variables.get(name);
    if(!value||value.includes('@'))throw Error('Unsupported MediaWiki scalar variable: '+name);
    return value;
  });
}
export function composeRecentChangesStyles(){
  const elements=source('mediawiki-elements.less'),helpers=source('mediawiki-skinStyles.less'),linker=source('mediawiki-linker.styles.less');
  const root='.site-recent-changes-page .mw-changeslist';
  const originalRules=[
    'a {'+rule(elements,'a')+'}',
    'h4 {'+rule(elements,'.mw-heading')+rule(elements,'.mw-heading3')+rule(elements,'.mw-heading4',1)+'}',
    'ul {'+rule(elements,'ul').replace('.margin-inline( 1.6em, 0 );','margin-inline-start: 1.6em; margin-inline-end: 0;')+'}',
    'li {'+rule(elements,'li')+'}',
    'p {'+rule(elements,'p')+'}',
    '.newpage {'+rule(linker,'.newpage')+'}',
    'span.comment {'+rule(linker,'span.comment')+'}',
    '.mw-changeslist-separator:empty::before {'+rule(helpers,'.mw-changeslist-separator:empty::before')+'}',
    '.mw-changeslist-separator--semicolon::before {'+rule(helpers,'.mw-changeslist-separator--semicolon::before').replace('@{msg-semicolon-separator}',';')+'}',
    source('mediawiki-changeslist.less').replaceAll('.mw-changeslist ','')
  ].join('\n');
  const scoped=root+' { font-family: @font-family-base; line-height: @line-height-medium; '+originalRules+' }\n'+
    '.recent-changes-entry { a {'+rule(elements,'a')+'} }';
  const compiled=transform({filename:'recent-changes-upstream.css',code:Buffer.from(resolveVariables(scoped)),include:Features.Nesting,minify:false}).code.toString();
  return '/* MediaWiki classic Recent Changes, GPL-2.0-or-later.\n * Corresponding source and license: /static/sources/mediawiki-recent-changes/README.md\n * Pinned revision: e6ba9b6dff50b451a0d25b858eda3946cf9171b0.\n */\n'+compiled;
}

/** Ship all corresponding component sources; never copy content/state snapshots. */
export function stageRecentChangesSources(siteRoot){
  const manifest=JSON.parse(source('manifest.json'));
  const destination=path.join(path.resolve(siteRoot),'static/sources/mediawiki-recent-changes');
  const upstream=path.join(destination,'upstream/recent-changes');
  fs.mkdirSync(upstream,{recursive:true});
  for(const file of manifest.files){
    if(path.basename(file.file)!==file.file)throw Error('Invalid MediaWiki source filename');
    const contents=fs.readFileSync(new URL(file.file,sourceRoot));
    if(crypto.createHash('sha256').update(contents).digest('hex')!==file.sha256)throw Error('MediaWiki source hash mismatch: '+file.file);
    fs.writeFileSync(path.join(upstream,file.file),contents);
  }
  fs.writeFileSync(path.join(upstream,'manifest.json'),source('manifest.json'));
  fs.copyFileSync(new URL('./recent-changes-view.mjs',import.meta.url),path.join(destination,'recent-changes-view.mjs'));
  fs.copyFileSync(new URL('./recent-changes-design-sources.md',import.meta.url),path.join(destination,'README.md'));
  const license=source('mediawiki-COPYING');
  fs.writeFileSync(path.join(destination,'COPYING'),license);
  fs.writeFileSync(path.join(destination,'package.json'),JSON.stringify({name:'personalwebsite-mediawiki-recent-changes',private:true,type:'module',license:'GPL-2.0-or-later',dependencies:{lightningcss:'1.31.1'}},null,2)+'\n');
  return {base:'/static/sources/mediawiki-recent-changes/',files:manifest.files.length+5,commit:manifest.commit,license:manifest.license};
}
