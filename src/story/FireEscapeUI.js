const stages = [
  ['화재 발생', '화재가 발생했습니다.\n즉시 안전한 곳으로 대피하세요.', 'M3 9h4l5-4v14l-5-4H3z M15 9a4 4 0 0 1 0 6 M18 6a8 8 0 0 1 0 12'],
  ['소지품 두고 대피하기', '소지품은 그대로 두고\n빛나는 교실 문 쪽으로 이동하세요.', 'M5 9h14v12H5z M9 9V6a3 3 0 0 1 6 0v3 M8 14h8'],
  ['연기 방향 확인', '빛나는 창문을 잠시 바라보고\n연기가 오는 방향을 확인하세요.', 'M3 5h18v14H3z M12 5v14 M3 12h18'],
  ['낮은 자세로 대피하기', '연기를 피해 낮은 자세를 취하세요.\nC 키를 누르면 몸을 숙일 수 있어요.', 'M5 7h14 M12 10v9 M8 15l4 4 4-4'],
];
export class FireEscapeUI {
  constructor() {
    this.number = document.querySelector('#step-number');
    this.title = document.querySelector('#step-title');
    this.alert = document.querySelector('#alert');
    this.alertText = document.querySelector('#alert-text');
    this.icon = document.querySelector('#alert-icon');
    this.crosshair = document.querySelector('#crosshair');
    const progress = document.querySelector('#progress-bar');
    this.segments = Array.from({length: 10}, () => progress.appendChild(document.createElement('span')));
    this.reset();
  }

  reset() {
    this.alertAnimation?.cancel();
    this.alertKey = '';
    this.step = 0;
    this.alert.classList.remove('visible');
  }

  update(story, target) {
    const [title, instruction, icon] = stages[story.step - 1];
    if (this.step !== story.step) {
      this.step = story.step;
      this.number.textContent = String(story.step).padStart(2, '0') + ' / 10';
      this.title.textContent = title;
      this.segments.forEach((segment, index) => segment.classList.toggle('filled', index < story.step));
    }
    const text = story.completed ? '낮은 자세로 대피할 준비가 되었어요.' : instruction;
    const alertKey = story.alarm ? text : '';
    if (alertKey !== this.alertKey) {
      const replacing = Boolean(this.alertKey);
      this.alertKey = alertKey;
      this.alertAnimation?.cancel();
      const setAlert = () => {
        this.alertText.textContent = text;
        this.icon.setAttribute('d', icon);
        this.alert.classList.add('visible');
      };
      if (replacing && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const fade = this.alert.animate([{opacity: 1}, {opacity: 0}], {duration: 155});
        this.alertAnimation = fade;
        fade.onfinish = () => {
          setAlert();
          this.alertAnimation = this.alert.animate([{opacity: 0}, {opacity: 1}], {duration: 230});
        };
      } else setAlert();
    }
    this.crosshair.classList.toggle('aimed', Boolean(target));
  }
}
