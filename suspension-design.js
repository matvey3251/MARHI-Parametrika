'use strict';
const byId = id => document.getElementById(id);
const schemes = {
  frame: {
    lower: 'Бумажные ячейки удерживают сменные прижимные планки. Тросы соединяются с металлическими проушинами периметральной кассеты.',
    upper: 'Регулируемые подвесы идут от балочных зажимов на проверенной несущей стальной балке.'
  },
  rails: {
    lower: 'Печатные модули фиксируются съёмными клипсами на двух металлических рейках. Тросы присоединяются к металлическим точкам подвеса реек.',
    upper: 'Тросы идут от проушин отдельной траверсы. Траверса опирается на проверенные несущие металлические элементы.'
  }
};
const count = byId('count');
const common = byId('length');
const lengths = byId('lengths');
const scheme = byId('scheme');
function validLength(input) {
  return Math.max(.15, Math.min(2, input.valueAsNumber || .55));
}
function buildLengths(reset = false) {
  const previous = [...lengths.querySelectorAll('input')].map(validLength);
  lengths.replaceChildren();
  for (let i = 0; i < Number(count.value); i++) {
    const label = document.createElement('label');
    label.textContent = 'Трос ' + (i + 1) + ', м';
    const input = document.createElement('input');
    Object.assign(input, {type:'number', min:'.15', max:'2', step:'.01', value:reset ? validLength(common) : previous[i] ?? validLength(common)});
    input.addEventListener('input', draw);
    input.addEventListener('change', () => { input.value = validLength(input); draw(); });
    label.append(input);
    lengths.append(label);
  }
  draw();
}
function draw() {
  const values = [...lengths.querySelectorAll('input')].map(validLength);
  const rails = scheme.value === 'rails';
  const points = values.map((value, i) => {
    const row = i % 2;
    const columns = Math.ceil((values.length - row) / 2);
    return {x: columns === 1 ? 380 : 102 + Math.floor(i / 2) * 530 / (columns - 1) + row * 25, y: 120 + value * 123 + row * 28, top: 102 + row * 15, row};
  });
  const path = row => points.filter(p => p.row === row).map(p => p.x + ',' + p.y).join(' ');
  const ring = [...points.filter(p => !p.row), ...points.filter(p => p.row).reverse()].map(p => p.x + ',' + p.y).join(' ');
  const top = rails ? '<rect x="74" y="89" width="612" height="31" rx="5" fill="#829477"/>' : '<rect x="74" y="89" width="612" height="31" rx="5" fill="#4c5552"/>';
  const cables = points.map((p,i) => '<line x1="'+p.x+'" x2="'+p.x+'" y1="'+p.top+'" y2="'+p.y+'" stroke="#424b43" stroke-width="2"/><circle cx="'+p.x+'" cy="'+p.top+'" r="5" fill="#e8cfaa"/><circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="#28312c"/><text x="'+(p.x+7)+'" y="'+(p.y-8)+'" font-size="12">Т'+(i+1)+'</text>').join('');
  const panel = rails ? [0,1].map(row=>'<polyline points="'+path(row)+'" stroke="#829477" stroke-width="9" fill="none"/>').join('') : '<polygon points="'+ring+'" fill="#fdfcf9" stroke="#829477" stroke-width="5"/>';
  byId('diagram').innerHTML = '<title id="diagram-title">Схема подвеса с '+values.length+' тросами</title><g font-family="Segoe UI, sans-serif" fill="#28312c"><text x="74" y="40" font-size="16">'+(rails?'Независимая верхняя траверса':'Подтверждённая стальная балка')+'</text><rect x="74" y="56" width="612" height="14" fill="none" stroke="#8c958c" stroke-dasharray="5 5"/><text x="74" y="83" font-size="11">Условный контур кабельного лотка</text>'+top+panel+cables+'<text x="74" y="424" font-size="16">'+(rails?'Две монтажные рейки с модулями':'Периметральная кассета с бумажными ячейками')+'</text></g>';
  byId('count-value').textContent = values.length;
  byId('summary').textContent = 'Тросов: '+values.length+'. Суммарная длина: '+values.reduce((a,b)=>a+b,0).toFixed(2)+' м. Разброс длин: '+(Math.max(...values)-Math.min(...values)).toFixed(2)+' м.';
  byId('lower').textContent = schemes[scheme.value].lower;
  byId('upper').textContent = schemes[scheme.value].upper;
}
count.addEventListener('input', () => buildLengths());
common.addEventListener('input', () => buildLengths(true));
common.addEventListener('change', () => { common.value = validLength(common); buildLengths(true); });
scheme.addEventListener('change', draw);
buildLengths();
