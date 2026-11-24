> 현재 기본 환경은 `unified/classroom`, `unified/hallway`, `unified/stairs`, `unified/entrance`입니다. 다른 모델 폴더는 보존용이며 기본 장면에서 로딩하지 않습니다. 자세한 설명은 프로젝트 루트 README와 `docs/unified-school.md`를 참고하세요.

# 실제 학교 모델 교체 계약

모델을 이 폴더에 넣으면 `/models/school.glb`로 접근할 수 있습니다.

`src/main.js`의 `loadEnvironment(collision)`을 다음처럼 교체합니다.

```js
const world = await loadEnvironment(collision, {
  modelUrl: '/models/school.glb',
  spawn: [0, 0, 2], // 발 위치, 미터 단위
  colliders: [
    {min:{x:-5,y:0,z:-5}, max:{x:5,y:3,z:-4.8}},
    // 벽/책상/의자마다 단순 AABB를 별도 정의
  ],
  surfaces: [
    {x0:-5,x1:5,z0:-5,z1:5,height:0},
    // 경사는 height:(x,z)=> ... 함수, 층별/계단별로 추가
  ],
  zone: position => '학교 교실',
});
```

모델 좌표: +Y 위쪽, 단위 1=1m. spawn은 눈높이가 아닌 발바닥 위치.
충돌체는 월드 축에 정렬된 박스이며 회전된 물체는 여러 작은 박스로 근사합니다.
바닥이 등록되지 않은 곳은 이동 불가입니다. 연속 보행면의 높이 변화는 이동당 0.36m 이하.
겹친 층은 현재 높이에 가까운 보행면으로 선택합니다. 복잡한 지형은 향후 navmesh/physics 어댑터로 확장하세요.
GLB node extras의 `interaction` 문자열을 안내판 등에 지정하면 E / 트리거로 표시됩니다.

임시 환경의 render mesh를 그대로 충돌체로 사용하지 않습니다. 별도 단순 충돌 모델을 유지하세요.
GLTFLoader는 일반 glTF와 GLB를 지원합니다. Draco/KTX2 압축은 decoder 설정을 추가해야 합니다.
PBR baseColor/normal/roughness/metalness와 UV2 lightmap은 모델 로딩 후 적용할 수 있습니다.
라이트맵은 자동 생성하지 않습니다. Blender 등에서 베이크하고 재질별 lightMap을 할당하세요.

Quest 권장 초기 예산(기기에서 측정하며 조정): draw call 100~200 이하, 보이는 삼각형 100k~200k 수준,
1K~2K 텍스처, 베이크 조명 우선, 반복 가구 InstancedMesh, KTX2 압축 및 구역별 로딩.
현재는 작은 임시 학교 전체를 로딩하며 외부 고품질 모델이나 자동 LOD/스트리밍은 포함하지 않습니다.
