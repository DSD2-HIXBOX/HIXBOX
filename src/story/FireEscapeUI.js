const stages = [
  ['화재 발생', '화재가 발생했습니다.\n즉시 안전한 곳으로 대피하세요.', 'M3 9h4l5-4v14l-5-4H3z M15 9a4 4 0 0 1 0 6 M18 6a8 8 0 0 1 0 12'],
  ['소지품 두고 대피하기', '소지품을 챙기지 말고\n신속하게 대피하세요.', 'M5 9h14v12H5z M9 9V6a3 3 0 0 1 6 0v3 M8 14h8'],
  ['연기 방향 확인', '창문을 통해 연기 방향을\n확인하세요.', 'M3 5h18v14H3z M12 5v14 M3 12h18'],
  ['낮은 자세로 대피하기', '연기를 피해 낮은 자세로\n대피할 준비를 하세요.', 'M5 7h14 M12 10v9 M8 15l4 4 4-4'],
];
const choices = {
  2: ['가방과 소지품 챙기기', '소지품을 두고 대피하기'],
  4: ['서 있는 자세로 대피하기', '허리를 숙이고 낮은 자세로 대피하기'],
};

export class FireEscapeUI {
  constructor() {
    this.number = document.querySelector('#step-number');
    this.title = document.querySelector('#step-title');
    this.alert = document.querySelector('#alert');
    this.alertText = document.querySelector('#alert-text');
    this.icon = document.querySelector('#alert-icon');
    this.crosshair = document.querySelector('#crosshair');
    this.hint = document.querySelector('#hint');
    this.choices = document.querySelector('#choices');
    this.buttons = [...this.choices.querySelectorAll('button')];
    const progress = document.querySelector('#progress-bar');
    this.segments = Array.from({length: 10}, () => progress.appendChild(document.createElement('span')));
    this.reset();
  }

  reset() {
    this.alertAnimation?.cancel();
    this.alertKey = '';
    this.step = 0;
    this.activeChoice = 0;
    this.choices.inert = true;
    this.choices.classList.remove('visible');
    this.alert.classList.remove('visible');
  }

  aim(x = innerWidth / 2, y = innerHeight / 2) {
    if (this.choices.inert || this.choices.classList.contains('offscreen')) return 0;
    return Number(this.buttons.find(button => {
      const box = button.getBoundingClientRect();
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    })?.dataset.choice ?? 0);
  }

  update(story, hint, target) {
    const [title, text, icon] = stages[story.step - 1];
    if (this.step !== story.step) {
      this.step = story.step;
      this.number.textContent = String(story.step).padStart(2, '0') + ' / 10';
      this.title.textContent = title;
      this.segments.forEach((segment, index) => segment.classList.toggle('filled', index < story.step));
      choices[story.step]?.forEach((choice, index) => {
        this.buttons[index].textContent = (index + 1) + '. ' + choice;
      });
    }
    const alertKey = story.alarm ? String(story.step) : '';
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
    if (this.choices.inert === story.choiceOpen) {
      this.choices.inert = !story.choiceOpen;
      this.choices.classList.toggle('visible', story.choiceOpen);
    }
    const aimed = this.aim();
    if (aimed !== this.activeChoice) {
      this.activeChoice = aimed;
      this.buttons.forEach((button, index) => button.classList.toggle('aimed', aimed === index + 1));
    }
    this.crosshair.classList.toggle('aimed', Boolean(aimed || target));
    if (this.hint.textContent !== hint) this.hint.textContent = hint;
  }
}
