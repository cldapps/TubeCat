// TubeCat service worker — caches the app shell only.
// API responses are NOT cached here; data persistence is handled
// by the app itself via IndexedDB, so the catalog still works offline.
var CACHE_NAME = "tubecat-shell-v1";
var SHELL_FILES = [
  "./index.html",
  "./manifest.webapp"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; })
        .map(function(n){ return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  var url = event.request.url;
  // Never intercept API calls — always go to network for fresh data.
  if(url.indexOf("googleapis.com") !== -1){
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(cached){
      return cached || fetch(event.request).then(function(res){
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, resClone); });
        return res;
      }).catch(function(){ return cached; });
    })
  );
});

