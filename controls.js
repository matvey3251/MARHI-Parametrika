/* Precise, accessible controls layered over the original geometry engine. */
(() => {
  'use strict';
  const descriptions = {
    width: 'Поперечный размер потолка в метрах.',
    length: 'Продольный размер потолка в метрах.',
    depth: 'Базовая глубина складки. Правило «Глубже к аттрактору» изменяет её по поверхности.',
    count: 'Общее число ячеек. Больше ячеек — мельче рисунок и дольше пересчёт.',
    opening: 'Доля внутреннего контура относительно внешнего: 0,40 означает 40% линейного размера, а не площади.',
    drop: 'Расстояние от уровня крепления до обода потолка.',
    lineOffset: '0 — по центру; −0,80 и +0,80 — смещение к противоположным краям на 80% полуширины.',
    lineTilt: '0 — вдоль потолка. Знак меняет сторону наклона; это коэффициент, не угол в градусах.',
    falloff: 'Меньше — широкое мягкое влияние линии; больше — эффект сосредоточен ближе к ней.',
    density: '1 — равномерный рисунок. Больше — сильнее сгущение у линии, общее число ячеек сохраняется.',
    depthGain: '0 — одинаковая глубина. Больше — сильнее разница между складками у линии и по краям.',
    waveAmplitude: 'Амплитуда продольной волны в метрах. 0 отключает её геометрический эффект.',
    wavePeriod: 'Длина одного повторения волны в метрах. Меньше — больше волн вдоль потолка.',
    openingGain: '0 — одинаковая доля отверстий. Больше — отверстия сильнее сужаются у линии.',
    shadowStrength: '0 — белая поверхность без затенения; 1 — максимальный контраст граней.',
    shadowSoftness: 'Больше — мягче переходы светотени. Геометрия остаётся прежней.',
    lightDirection: 'Поворот света вокруг модели в градусах.',
    lightElevation: 'Высота света над плоскостью в градусах.'
  };
  const bindings = new WeakMap();
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  function enhance(range) {
    if (bindings.has(range)) {
      bindings.get(range).sync();
      return;
    }
    const container = range.closest('.control');
    const label = container?.querySelector('label');
    const output = container?.querySelector('output');
    if (!container || !label || !output) return;
    const key = range.id.split('-').pop();
    const title = Array.from(label.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent).join('').trim();
    const unit = output.textContent.replace(/^[\s\d.,+−-]+/, '').trim();
    const editor = document.createElement('span');
    editor.className = 'control-value-editor';
    const number = document.createElement('input');
    number.type = 'number';
    number.className = 'control-number';
    number.id = range.id + '-number';
    number.min = range.min;
    number.max = range.max;
    number.step = range.step;
    number.inputMode = Number(range.step) >= 1 ? 'numeric' : 'decimal';
    number.setAttribute('aria-label', title + (unit ? ', ' + unit : ''));
    editor.append(number);
    if (unit) {
      const suffix = document.createElement('span');
      suffix.className = 'control-unit';
      suffix.textContent = unit;
      editor.append(suffix);
    }
    // Keep the engine's output in place: its existing handler still writes to it.
    output.hidden = true;
    label.append(editor);
    container.classList.add('control-enhanced');
    if (descriptions[key]) {
      const help = document.createElement('p');
      help.className = 'control-help';
      help.id = range.id + '-help';
      help.textContent = descriptions[key];
      container.append(help);
      range.setAttribute('aria-describedby', help.id);
      number.setAttribute('aria-describedby', help.id);
    }
    function sync() {
      if (number.disabled !== range.disabled) number.disabled = range.disabled;
      if (document.activeElement !== number) number.value = range.value;
      const min = Number(range.min), max = Number(range.max);
      const progress = max > min ? (Number(range.value) - min) / (max - min) * 100 : 0;
      range.style.setProperty('--range-progress', progress + '%');
      range.setAttribute('aria-valuetext', range.value + (unit ? ' ' + unit : ''));
    }
    function commit() {
      if (range.disabled) return;
      const entered = number.valueAsNumber;
      if (!Number.isFinite(entered)) {
        number.value = range.value;
        return;
      }
      const previous = range.value;
      // Range sanitization applies the original bounds and step without
      // introducing a second parameter model or modifying imported projects.
      range.value = String(entered);
      number.value = range.value;
      if (range.value !== previous) range.dispatchEvent(new Event('input', { bubbles: true }));
      sync();
    }
    number.addEventListener('change', commit);
    number.addEventListener('blur', commit);
    number.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
        number.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        number.value = range.value;
        number.blur();
      }
    });
    range.addEventListener('input', sync);
    bindings.set(range, { sync });
    sync();
  }

  function refresh() {
    sidebar.querySelectorAll('.control input[type="range"]').forEach(enhance);
  }
  // Presets, rule toggles and imports recreate the original controls.
  // Observe only structural changes and disabled state, not style attributes.
  new MutationObserver(refresh).observe(sidebar, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['disabled']
  });
  refresh();
})();
