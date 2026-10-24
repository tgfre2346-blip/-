// ============================================================
// 서비스 워커 (sw.js)
// ------------------------------------------------------------
// 서비스 워커는 앱 화면 뒤에서 따로 도는 작은 프로그램입니다.
// 앱이 파일(화면, 라이브러리, AI 모델 등)을 요청하면 여기서 먼저 가로채서
//  - 휴대폰에 저장해 둔 것이 있으면 그것을 바로 돌려주고 (인터넷 없이도 동작)
//  - 없으면 인터넷에서 받아 온 뒤 다음을 위해 저장해 둡니다.
// 앱을 고쳐서 다시 올릴 때는 아래 CACHE_NAME 의 숫자를 올려 주세요. (예전 저장본이 지워지고 새로 받음)
// ============================================================

// [1] 저장소 이름 (버전)
const CACHE_NAME = "swing-app-v1";

// [2] 설치할 때 미리 저장해 둘 파일들 (앱의 기본 뼈대)
//     용량이 큰 WebAssembly·AI 모델은 처음 쓸 때 자동으로 저장됩니다.
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "mediapipe/vision_bundle.mjs"
];

// [3] 설치: 기본 파일들을 저장
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(PRECACHE); })
  );
  self.skipWaiting();   // 새 버전을 바로 쓰도록
});

// [4] 활성화: 이름이 다른(예전 버전) 저장소는 지우기
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n !== CACHE_NAME; })
                              .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// [5] 파일 요청 가로채기: 저장본 먼저, 없으면 인터넷에서 받아 저장
self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;                    // 읽기 요청만 처리
  if (req.url.startsWith("blob:") || req.url.startsWith("data:")) return; // 내 영상(blob)은 건드리지 않음

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (saved) {
      if (saved) return saved;                         // 저장본이 있으면 바로 사용
      return fetch(req).then(function (res) {
        // 정상 응답(같은 사이트) 또는 글꼴 같은 다른 사이트 응답이면 저장해 둠
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
