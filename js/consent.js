(function (window, document) {
  'use strict';

  var CONSENT_KEY = 'pdConsentState';
  var defaultConsent = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  gtag('consent', 'default', defaultConsent);

  function applyConsent(consent) {
    gtag('consent', 'update', consent);
  }

  function saveConsent(consent) {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      consent: consent,
      updatedAt: new Date().toISOString()
    }));
  }

  function getStoredConsent() {
    var raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) {
      return null;
    }
    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.consent) {
        return parsed.consent;
      }
    } catch (err) {
      console.warn('Unable to parse stored consent', err);
    }
    return null;
  }

  function setBannerVisibility(visible) {
    if (!banner) return;
    banner.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function syncToggles(consent) {
    if (!consent) return;
    var toggles = banner.querySelectorAll('[data-consent-key]');
    toggles.forEach(function (toggle) {
      var key = toggle.getAttribute('data-consent-key');
      toggle.checked = consent[key] === 'granted';
    });
  }

  function handleChoice(consent) {
    saveConsent(consent);
    applyConsent(consent);
    syncToggles(consent);
    setBannerVisibility(false);
  }

  var banner = document.querySelector('.consent-banner');
  if (!banner) {
    console.warn('Consent banner markup is missing.');
    return;
  }

  var managePanel = banner.querySelector('.consent-manage-panel');
  var manageChoicesButton = banner.querySelector('[data-consent-action="manage"]');
  var acceptButton = banner.querySelector('[data-consent-action="accept"]');
  var rejectButton = banner.querySelector('[data-consent-action="reject"]');
  var saveButton = banner.querySelector('[data-consent-action="save"]');

  function showManagePanel(show) {
    if (!managePanel) return;
    managePanel.setAttribute('aria-hidden', show ? 'false' : 'true');
    managePanel.style.display = show ? 'block' : 'none';
  }

  manageChoicesButton.addEventListener('click', function () {
    showManagePanel(true);
  });

  acceptButton.addEventListener('click', function () {
    handleChoice({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
  });

  rejectButton.addEventListener('click', function () {
    handleChoice(defaultConsent);
  });

  saveButton.addEventListener('click', function () {
    var newConsent = Object.assign({}, defaultConsent);
    banner.querySelectorAll('[data-consent-key]').forEach(function (toggle) {
      var key = toggle.getAttribute('data-consent-key');
      newConsent[key] = toggle.checked ? 'granted' : 'denied';
    });
    handleChoice(newConsent);
  });

  var storedConsent = getStoredConsent();
  if (storedConsent) {
    applyConsent(storedConsent);
    syncToggles(storedConsent);
    setBannerVisibility(false);
  } else {
    showManagePanel(false);
    setBannerVisibility(true);
  }

  var reopenLinks = document.querySelectorAll('[data-open-consent]');
  reopenLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      showManagePanel(false);
      setBannerVisibility(true);
    });
  });

  window.updateConsentFromCMP = function (consentObject) {
    if (!consentObject) return;
    var finalConsent = Object.assign({}, defaultConsent, consentObject);
    handleChoice(finalConsent);
  };

  window.openPrivacyChoices = function () {
    showManagePanel(false);
    setBannerVisibility(true);
  };
})(window, document);
