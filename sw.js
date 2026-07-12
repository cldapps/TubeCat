"use strict";

/* TubeCat service worker
   Scope: cache the app shell only (index.html + manifests + icons).
   Video/playlist/channel data lives in IndexedDB (handled by the app
   itself) so it already survives offline. YouTube Data API calls,
   thumbnails, and playback pages are intentionally left network-only:
   caching API responses would show stale feeds, and we don't have
   rights to cache YouTube media or thumbnails long-term. */

var CACHE_NAME = "tubecat-shell-v1";

var SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./manifest.webapp",
  "./icons/icon-56.png",
  "./icons/icon-112.png",
  "./icons/icon-128.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

function isShellRequest(url){
  return url.origin === self.location.origin;
}

function isApiOrMediaRequest(url){
  var externalHosts = [
    "googleapis.com",
    "youtube.com",
    "youtu.be",
    "yout-ube.com",
    "ytimg.com" // video/playlist/channel thumbnails
  ];
  return externalHosts.some(function(h){ return url.hostname.indexOf(h) !== -1; });
}

self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  var url = new URL(req.url);

  if(isApiOrMediaRequest(url)) return;

  if(isShellRequest(url)){
    event.respondWith(
      caches.match(req).then(function(cached){
        var networkFetch = fetch(req).then(function(res){
          if(res && res.status === 200){
            var resClone = res.clone();
            caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
          }
          return res;
        }).catch(function(){
          if(req.mode === "navigate") return caches.match("./index.html");
          return cached;
        });
        return cached || networkFetch;
      })
    );
  }
});
