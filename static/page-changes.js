(() => {
  const root=document.querySelector('.reading-outline'),time=document.querySelector('footer .page-last-modified time');
  if(!root||!time)return;
  function update(){
    const active=document.getElementById(location.hash.slice(1));
    const current=active&&root.contains(active)?active.closest('[data-document-modified-at]'):document.getElementById(root.dataset.documentTitleSource);
    time.dateTime=current?.dataset.documentModifiedAt??root.dataset.pageLastModified;
    time.textContent=current?.dataset.documentModifiedLabel??root.dataset.pageLastModifiedLabel;
  }
  addEventListener('hashchange',update);addEventListener('popstate',update);update();
})();
