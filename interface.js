'use strict';
(() => {
  const groups = [['Потолки',[['ceiling-original.html','Исходная форма'],['ceiling-recesses-down.html','Углубления вниз']]]];
  const nav = document.createElement('nav');
  nav.className = 'project-nav';
  nav.setAttribute('aria-label','Навигация проекта');
  const label = document.createElement('label');
  label.htmlFor = 'project-page';
  label.textContent = 'Модель / инструмент';
  const select = document.createElement('select');
  select.id = 'project-page';
  for(const [name,pages] of groups){
    const group = document.createElement('optgroup');
    group.label = name;
    for(const [url,title] of pages){
      const option = new Option(title,url);
      option.selected = location.pathname.endsWith('/'+url);
      group.append(option);
    }
    select.append(group);
  }
  select.addEventListener('change',()=>location.assign(select.value));
  const home = document.createElement('a');
  home.href = 'index.html';
  home.textContent = 'Все инструменты ↗';
  nav.append(label,select,home);
  document.querySelector('body>header').after(nav);
  // Existing renderers keep ownership of their slider and input events.
  const enhance = () => {
    if(document.querySelector('script[src="controls.js"]')) return;
    document.querySelectorAll('input[type=range]').forEach(slider=>{
      const container = slider.closest('.control,.field');
      if(!container || container.querySelector('input[type=number]')) return;
      const number = document.createElement('input');
      number.type = 'number';
      number.className = 'direct-number';
      for(const name of ['min','max','step']) number[name] = slider[name];
      number.value = slider.value;
      number.disabled = slider.disabled;
      number.setAttribute('aria-label',(container.querySelector('label')?.textContent || 'Параметр').trim());
      const output = container.querySelector('output');
      if(output) {
        const unit = document.createElement('span');
        unit.className = 'control-unit';
        unit.textContent = output.textContent.replace(/[\d.,+−-]+/g,'').trim();
        output.hidden = true;
        output.after(number,unit);
      }
      else container.append(number);
      slider.addEventListener('input',()=>number.value=slider.value);
      number.addEventListener('input',()=>{
        if(!Number.isFinite(number.valueAsNumber)){number.value=slider.value;return;}
        slider.value = number.value;
        number.value = slider.value;
        slider.dispatchEvent(new Event('input',{bubbles:true}));
      });
    });
  };
  enhance();
  new MutationObserver(enhance).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
})();
