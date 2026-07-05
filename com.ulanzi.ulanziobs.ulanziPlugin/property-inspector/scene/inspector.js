// Scene Property Inspector — pick the target scene (or "seq:<base>") + idle color.
//
// SCAFFOLD STUB: connect/form/settings roundtrip is real. The scene dropdown is
// populated from the live OBS scene list, which the main service must relay to the PI
// via $UD.sendToPropertyInspector (TODO on hardware). Until then the <select> is empty
// and the target can only be restored from saved settings.
let ACTION_SETTING = {};
let form = '';

$UD.connect();

$UD.onConnected(() => {
  form = document.querySelector('#property-inspector');
  document.querySelector('.udpi-wrapper').classList.remove('hidden');

  form.addEventListener(
    'input',
    Utils.debounce(async () => {
      ACTION_SETTING = Utils.getFormValue(form);
      $UD.sendParamFromPlugin(ACTION_SETTING);
    })
  );
});

$UD.onAdd((jsn) => { if (jsn && jsn.param) hydrate(jsn.param); });
$UD.onParamFromApp((jsn) => { if (jsn && jsn.param) hydrate(jsn.param); });

// Main service relays the live scene list here (TODO wire on the plugin side).
$UD.onSendToPropertyInspector?.((jsn) => {
  if (jsn && jsn.param && Array.isArray(jsn.param.scenes)) {
    populateScenes(jsn.param.scenes);
  }
});

function hydrate(params) {
  ACTION_SETTING = params;
  Utils.setFormValue(ACTION_SETTING, form);
}

function populateScenes(scenes) {
  const sel = document.getElementById('target');
  const current = ACTION_SETTING.target;
  sel.innerHTML = '';
  for (const s of scenes) {
    const o = document.createElement('option');
    o.value = s.value;                 // scene name or "seq:<base>"
    o.textContent = s.label || s.value;
    if (s.value === current) o.selected = true;
    sel.appendChild(o);
  }
}
