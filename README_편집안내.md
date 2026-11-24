# 학교 3D 편집 프로젝트 · 1.6

이 ZIP은 실행 화면만 저장한 파일이 아니라, 다른 사람이 이어서 수정할 수 있는 프로젝트입니다. 웹 소스, 원본 GLB, 완성된 편집용 GLB, 충돌/문/계단 데이터, 모델 가공 스크립트, 검사 코드와 Mac 실행 앱 소스를 포함합니다.

## 바로 실행

Node.js 22.12 이상과 npm을 준비하고 이 폴더에서 터미널을 여세요.

```sh
npm ci
npm run dev
```

터미널에 표시되는 로컬 주소(기본 http://127.0.0.1:5173/)를 엽니다. `index.html`을 파일로 직접 열면 GLB 로딩이 차단될 수 있으므로 로컬 서버를 사용하세요.

## 무엇을 수정하나요?

- `src/explore/main.js`: 학교 탐색 장면, PC/VR 연결
- `src/explore/RenderAppearance.js`: 낮 조명·노출·깊이 우선순위
- `src/explore/HingedDoors.js`: 교실 한쪽 미닫이와 흰색 출입문 여닫이
- `public/models/explore/doors.json`: 문 위치·경첩·가동 문짝 정보
- `public/models/explore/navigation.json`: 계단 보행 기준
- `public/models/explore/render.glb`: 이 ZIP에는 **압축하지 않은 완성본 GLB**가 들어 있습니다. Blender 등에서 바로 편집할 수 있습니다. 실행 시 사용하는 이름도 이 파일입니다.
- `source-models/exterior.glb`, `source-models/interior.glb`: 처음 제공된 외관/실내 원본
- `public/models/explore/school.glb`: 업로드된 통합 원본
- `scripts/explore/`: 원본 복원·별관 제외·층별 재질·게시판·벽 방향 수정과 모델/충돌 생성
- `launcher/`: Mac 실행 앱의 Objective-C 소스와 빌드 파일

## 웹 기능만 수정하기

소스를 편집하면 개발 서버에서 갱신됩니다. 배포 파일은 다음 명령으로 만듭니다.

```sh
npm run build
```

`dist/`가 완성된 웹 폴더입니다. Meta Quest VR은 신뢰되는 HTTPS 주소에서 열어야 합니다. 원본 및 과거 기록은 `/legacy.html`과 별도 문서에 남겨 두었습니다.

## 완성 GLB를 편집하기

1. `public/models/explore/render.glb`를 Blender 등에서 가져옵니다.
2. 문 오브젝트를 정적 벽과 합치지 마세요. 문 노드의 `originalNodeIndex` 사용자 속성은 보존해야 합니다. GLB로 내보낼 때 **Custom Properties**도 내보내세요.
3. 편집본을 프로젝트 안에 다른 이름으로 저장합니다(예: `edited-school.glb`).
4. 아래 명령으로 편집본과 충돌 데이터를 함께 갱신합니다.

```sh
npm run prepare:edited -- edited-school.glb
npm run dev
```

`prepare:edited`는 문 메타데이터를 검사하고, 움직이는 문을 정적 충돌에서 제외해 충돌 파일을 다시 만듭니다. 문 위치/크기를 바꿨다면 `doors.json`의 `pivot`, `min`, `max`도 맞춰야 합니다. 계단을 바꿨다면 `navigation.json`도 맞춰야 합니다.

용량을 줄이려면 편집 후 다음 명령을 실행할 수 있습니다.

```sh
npm run compress:explore
```

압축 전 GLB는 `public/models/explore/render-source.glb`에 보존됩니다. 압축된 GLB를 지원하지 않는 편집기에서는 이 파일을 사용하세요. 압축 뒤 편집본을 다시 적용하려면 명시적으로 압축 전 파일을 지정하세요.

## 원본에서 전체 재생성 및 검사

```sh
npm run prepare:explore
npm test
npm run build
```

이 과정은 제공된 외관·실내·통합 원본과 가공 스크립트에서 현재 모델을 다시 만듭니다. **완성 `render.glb`만 직접 편집한 내용은 전체 재생성에 반영되지 않습니다.** 직접 편집본을 따로 보관하고 `prepare:edited` 방식을 사용하거나, 재생성 스크립트/원본에도 변경을 반영하세요.

재생성 결과인 `repaired-source.glb`, `render-source.glb`, `collision.bin`은 ZIP 크기를 줄이기 위해 중복 포함하지 않았습니다. `prepare:explore`를 실행하면 생성되며, 전체 자동 검사는 이 생성 후 실행합니다. `node_modules`, `dist`, 과거 앱 백업도 제외했습니다.

원본 경로는 `source-models/` 기준 상대 경로여서 다른 PC에서도 재생성할 수 있습니다. Node.js가 처리할 모델이 커서 실행 초기와 재생성에는 시간이 걸릴 수 있습니다.

## Mac 앱 다시 만들기

macOS에서 Xcode Command Line Tools와 Node.js를 준비한 뒤:

```sh
zsh launcher/build-mac.command
```

`build/학교 탐색.app`이 생성됩니다. Windows에서는 웹 프로젝트로 실행하거나 `dist/`를 웹 서버에 올려 사용합니다.

## 1.6 변경

복도 쪽 흰색 기둥과 걸레받이의 뒤집힌 면 90개를 바로잡았습니다. 면을 새로 겹쳐 덮지 않고 기존 삼각형의 방향과 법선을 수정했습니다. 위치·재질·UV 및 문 개구부는 유지합니다. 3층 바닥/1층 게시판 통일, 낮 조명, 교실 한쪽 미닫이와 외부 출입문 여닫이도 유지합니다. 상세 내역은 `docs/explore/v1.6/`을 참고하세요.
