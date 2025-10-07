(function (window, document) {
  'use strict';

  var ADSENSE_CLIENT = 'ca-pub-7896945483758478';
  var ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;

  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  function loadScript(src, attributes) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      Object.keys(attributes || {}).forEach(function (key) {
        script.setAttribute(key, attributes[key]);
      });
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function ensureAdSense() {
    if (document.querySelector('script[data-adsense-loaded]')) {
      return Promise.resolve();
    }
    return loadScript(ADSENSE_SRC, {
      async: 'true',
      crossorigin: 'anonymous',
      'data-adsense-loaded': 'true'
    }).catch(function (error) {
      console.error('AdSense failed to load', error);
    });
  }

  ensureAdSense().then(function () {
    window.adsbygoogle = window.adsbygoogle || [];
  });

  window.refreshAds = function () {
    if (!window.adsbygoogle) return;
    document.querySelectorAll('ins.adsbygoogle').forEach(function (ins) {
      window.adsbygoogle.push({
        element: ins
      });
    });
  };
})(window, document);
