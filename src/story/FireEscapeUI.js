const stages = [
  ['화재 발생', '화재가 발생했습니다.\n교실에 화재경보가 울리고 있어요.', 'M3 9h4l5-4v14l-5-4H3z M15 9a4 4 0 0 1 0 6 M18 6a8 8 0 0 1 0 12'],
  ['교실 안 상황', '화재경보가 울린 뒤,\n교실 안의 상황이 달라지고 있어요.', 'M5 9h14v12H5z M9 9V6a3 3 0 0 1 6 0v3 M8 14h8'],
  ['복도 상황', '복도 한쪽에서 연기가 보이기 시작해요.', 'M3 5h18v14H3z M12 5v14 M3 12h18'],
  ['번지는 연기', '연기가 교실 안쪽으로 스며들고 있어요.', 'M5 7h14 M12 10v9 M8 15l4 4 4-4'],
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
    const text = story.completed ? '여기까지의 체험을 마쳤어요.' : instruction;
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
