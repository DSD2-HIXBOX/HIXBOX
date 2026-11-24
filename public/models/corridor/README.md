# 일본 학교 복도 모델

- `original/`: 제공된 원본 전체. glTF, bin, 텍스처와 라이선스 보존.
- `connected/scene.gltf`: 교실 연결용 수정본. 런타임은 이 파일을 GLTFLoader로 로딩.
- `connected/connection.bin`: 벽 절개, 계단 끝 정리 및 벽 접합면의 파생 geometry.

수정본은 `../original/scene.bin`과 `../original/textures/*`를 그대로 참조합니다.
따라서 배포할 때 `original/`과 `connected/`를 함께 포함해야 합니다. Vite는 public 전체를 dist로 복사합니다.

재생성:

```sh
npm run prepare:corridor
```

원본은 덮어쓰지 않습니다. 바닥, 천장, 창문, 재질과 텍스처는 원본 데이터 그대로 유지합니다.
수정 영역과 문 재사용 원리는 프로젝트의 `docs/corridor-connection.md`를 참고하세요.

This work is based on "The Japanese School Corridor"
(https://sketchfab.com/3d-models/the-japanese-school-corridor-f7775fea6fc34f518424ef9cad55c926)
by volvor (https://sketchfab.com/volvor), licensed under CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/).
Modifications: shared classroom facade cut, facade depth returns, positive-end evacuation stair connection.
