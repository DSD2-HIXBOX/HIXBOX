# SCHOOL WALK · 학교 내부 자유 탐색

현재 기본 화면은 사용자가 제공한 학교 GLB를 사용하는 **PC / Meta Quest 자유 탐색**입니다. WASD·마우스 이동, WebXR, 실제 모델 삼각형 기반 충돌, 원본 문짝 48개를 활용한 출입구 24곳의 좌우 미닫이 문 열기/닫기를 제공합니다. 재난·미션은 기본 탐색에서 실행하지 않습니다.

`npm run dev` → [학교 탐색](http://127.0.0.1:5173/). 조작·Quest HTTPS 설정·원본 보존·검증은 [탐색 환경 안내](docs/explore/README.md)를 참고하세요.

수정 1.6: 교실 복도 쪽 기둥과 걸레받이의 뒤집힌 면 90개를 바로잡았습니다. 다른 PC에서 편집·재생성할 수 있는 프로젝트는 [편집 안내](README_편집안내.md)를 참고하세요. 자동 검사 88개 통과.

수정 1.5: 3층 바닥을 2층 재질로, 1층 게시판을 2층 구성으로 맞췄습니다. [1.5 안내](docs/explore/v1.5/수정안내.md). 자동 검사 86개 통과.

수정 1.4: 원본 형상·텍스처·충돌 자산을 바꾸지 않고 깊이 우선순위와 낮 조명을 조정했습니다. [원인과 수정](docs/explore/v1.4/원인과수정.md). 자동 검사 84개 통과.

수정 1.3: 참고 이미지의 목재 벽과 빠진 게시물 복원, 교실 왼쪽 고정·오른쪽 단방향 미닫이, 1층 흰색 외부 출입구 9곳 여닫이와 문턱 통과를 적용했습니다. [1.3 안내](docs/explore/v1.3/수정안내.md).

수정 1.2.1: 2층 복도 게시판의 누락 면·테두리·제목을 원본에서 복원하고 벽 간격을 확보했습니다. [원인과 수정](docs/explore/board-fix/원인과수정.md). 자동 검사 79개 통과.

수정 1.2: 교실 문을 미닫이로 변경하고 서쪽 별관을 제거했습니다. GLB/충돌 데이터를 무손실 압축하며 본관과 부지는 유지합니다. 자동 검사 78개를 통과했습니다.

수정 1.1: 두 계단으로 1–4층 왕복, 바닥/카메라 안정화, 중복 면과 태극기 제거를 반영했습니다. [원인 분석과 검증 결과](docs/explore/repair/진단과수정.md)를 참고하세요. 자동 검사 76개와 빌드를 통과했습니다.

기존 재난 체험의 동작과 자산은 `/legacy.html`에 보존했습니다. 아래는 기존 체험의 기록입니다.

---

# EARTHQUAKE VR · 학교 공간 탐색

Three.js / Vite / WebXR 기반 PC·Meta Quest 공용 프로젝트입니다. 현재 기본 환경은 같은 제작자의 `school_class_room` → `school_hallway` → `school_stairs` → `school_entrance`입니다. 한 장면에서 교실, 복도, 두 구간의 하행 계단, 1층 현관을 왕복합니다. 스마트폰 재난문자 확인 후 지진이 발생하는 교실 장면을 추가했습니다. STEP 02에서 교실 내 안전 행동을 판정하고 지진 종료까지 진행합니다. 이어서 STEP 03에서 안내 방송, 가방 머리 보호, 문을 통한 교실 탈출과 STEP 04 복도 진입 상태 연결을 제공합니다. STEP 04의 추가 대피 과제와 운동장은 아직 포함하지 않습니다.

**스토리:** 체험 시작 → 약 3초 후 문자 수신 → PC는 E / VR은 오른손을 들어 화면 바라보기 → 확인 후 약 2초에 지진 발생. 이어서 약 15초 동안 실제 공간에서 행동합니다. 책상 아래에서 Ctrl/C로 낮추고 F를 한 번 눌러 양팔 머리 보호를 켜세요. 다시 F를 누르면 해제됩니다. E 다리 잡기는 PC에서 선택 사항입니다. VR은 X/실제 웅크리기, 다리 근처 트리거, 반대 손을 머리 가까이 두는 동작을 사용합니다. 잘못된 행동은 **다시 선택하기**, 전체 재시작은 **R**입니다. [STEP 03 가방·탈출 안내](docs/step03-evacuation.md) · [STEP 02 안내](docs/step02-shelter.md) · [스토리 동작과 검증](docs/earthquake-story.md)을 참고하세요.

## 실행

Node.js 20.19+ 또는 22.12+에서:

```sh
npm install
npm run dev
```

[PC 실행](http://localhost:5173/) → **PC 체험 시작**. Chrome/Edge에서 마우스 잠금을 사용할 수 있습니다. 내장 브라우저가 잠금을 제한하면 화면 드래그로 시점을 조절합니다.

```sh
npm test
npm run build
npm run preview
```

배포 결과는 `dist/`입니다. 활성화된 네 모델만 복사하며 이전 모델과 백업은 배포하지 않습니다.

## 조작과 경로

- W/A/S/D 이동, 마우스 시점, Shift 빠르게 이동.
- E: 바라보는 문을 2.5m 안에서 열기/닫기. 앞문과 뒷문은 독립 상태이며 각 문의 원본 두 패널이 반대 방향으로 미끄러집니다.
- C 또는 Ctrl: 숙이기. 낮은 자세로 책상 아래에 들어갈 수 있으며 머리 위가 막혀 있으면 일어서지 못합니다. 의자 자체는 고정되어 있으므로 다리 사이의 빈 공간으로 접근합니다.
- ESC: 메뉴/마우스 잠금 해제. R: 교실 시작 위치로 복귀.
- Quest: 왼쪽 스틱 이동, 오른쪽 스틱 30° 스냅 턴, 트리거 문 조작, X 버튼 가상 숙이기. 실제 헤드셋 높이도 반영합니다.

교실 앞문 또는 뒷문 → 복도에서 +Z 방향으로 끝까지 → 계단실의 열린 오른쪽 통로 → 왼쪽 하행 계단 → 중간참에서 돌아 반대편 하행 계단 → 1층 현관입니다. 보행 시점은 1.65m, 층간 높이는 원본의 4.4m입니다. 반대쪽 상행 계단은 원본 외형으로 남아 있지만 이번 보행 경로는 2층–1층 하행 구간입니다.

## Meta Quest 테스트

1. `npm run dev:https` 실행 후 Quest와 Mac을 같은 Wi-Fi에 연결합니다.
2. Vite의 Network HTTPS 주소를 Quest Browser에서 엽니다. 자체 서명 인증서는 기기의 신뢰 설정에 따라 WebXR이 제한될 수 있습니다.
3. 신뢰되는 HTTPS 정적 호스팅에 `dist/`를 배포하는 방법이 가장 간단합니다. 로컬에서는 기기가 신뢰하는 인증서와 일치하는 호스트/IP를 사용합니다.

```sh
TLS_CERT=/absolute/path/cert.pem TLS_KEY=/absolute/path/key.pem npm run dev:https
```

**VR 체험 시작**이 활성화되면 헤드셋에서 실행합니다. Quest에서는 1024px 텍스처, 낮은 XR 프레임버퍼 배율, 실시간 그림자 비활성화를 적용합니다. PC는 2048px 텍스처와 최대 DPR 1.5를 사용합니다. 실제 Quest 기기의 프레임레이트와 컨트롤러 입력은 기기에서 최종 확인해야 합니다.

## 모델과 백업

- 활성 파생본: `public/models/unified/{classroom,hallway,stairs,entrance}/scene.gltf`.
- 원본: 사용자가 제공한 Downloads 폴더를 수정하지 않습니다.
- 이전 한국 교실·일본 복도·기존 계단 파일은 기존 `public/models/` 하위에 그대로 남아 있습니다. 기본 환경에서 로드하지 않습니다.
- 통합 전 전체 백업: `backups/pre-unified-20261027-1838.tar.gz` (`node_modules`, `dist`, `.git` 제외).
- 분석과 수정 내역: [통합 기록](docs/unified-school.md), [원본 좌표 분석](docs/unified-source-analysis.json), [경량화 수치](docs/unified-build-report.json).

원본에서 파생본을 다시 만들려면 macOS의 `sips`와 설치된 `meshoptimizer`를 사용합니다:

```sh
npm run prepare:school
# 다른 원본 보관 위치:
SCHOOL_SOURCE_ROOT=/absolute/path/to/model-parent npm run prepare:school
```

스크립트는 원본 메시의 UV·재질·텍스처를 유지하며 별도 폴더에 출력합니다. 외형 변경은 곡면 가구 경량화, 연결부 벽 개구부, 교실 바닥 끝 5mm 정합입니다. 문 디자인은 새로 만들지 않습니다.

## 코드와 GLB 확장

`src/world/unifiedSchool.js`는 모델 로딩·배치·문·경로를, `src/core/CollisionWorld.js`와 `SpatialCollider.js`는 공유 충돌을 담당합니다. PC와 XR 입력 모듈은 별도입니다. 보이는 메시와 충돌 데이터가 분리되어 있습니다.

이후 GLB를 사용하려면 `loadEnvironment(collision,{modelUrl:'/models/new.glb',colliders:[{min,max}],surfaces:[{x0,x1,z0,z1,height}],spawn:[x,y,z]})` 형식을 사용하거나 통합 로더의 모델 URL과 출입구/보행 좌표를 함께 갱신하세요. 파일 교체만으로 문 힌지와 충돌이 자동 추론되지는 않습니다. 재질 이름·원본 노드 식별자는 통합 파생본의 `extras`에 보존됩니다.

## 검증

`npm test`는 이전 환경 보존 검사와 새 환경의 양쪽 문, 닫힌 문 충돌, 양방향 전체 경로, 매끄러운 계단 높이, 벽·난간, 낮은 자세와 일어서기 제한을 검사합니다. 개발 전용 [연결부 검증 화면](http://localhost:5173/tests/fixtures/unified.html)에서 각 공간을 확인할 수 있습니다. 이 화면은 배포본에 포함되지 않습니다.

모델: yuuuusukeeee / Comicaroid, CC BY 4.0. 개별 원본 링크와 크레딧은 시작 화면 및 각 모델의 `license.txt`/glTF asset 정보에 있습니다. 메시 절개·좌표 변환·경량화를 적용한 파생본입니다.
