// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Install PWA prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button if needed
  const installBtn = document.createElement('button');
  installBtn.textContent = '📱 Install App';
  installBtn.className = 'btn btn-secondary btn-small install-btn';
  installBtn.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      deferredPrompt = null;
      installBtn.remove();
    });
  });
  
  // Add to header if on welcome screen
  if (typeof currentScreen !== 'undefined' && currentScreen === 'welcome') {
    const headerStats = document.querySelector('.header-stats');
    if (headerStats) {
      headerStats.appendChild(installBtn);
    }
  }
});

// PWA Installation Detection
window.addEventListener('appinstalled', (evt) => {
  console.log('WhibO PWA was installed');
});

// Handle online/offline status
window.addEventListener('online', () => {
  console.log('Back online');
  showToast && showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
  console.log('Gone offline');
  showToast && showToast('Connection lost', 'warning');
});
