// Mute Property Inspector — lets a key override the mic input name.
// SCAFFOLD STUB: the connect/form/settings roundtrip is real; nothing OBS-specific here.
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

function hydrate(params) {
  ACTION_SETTING = params;
  Utils.setFormValue(ACTION_SETTING, form);
}
