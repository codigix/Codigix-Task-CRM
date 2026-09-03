/**
 * Device Notification Service
 * Dispatches native operating system notifications (Windows toast, macOS alert, Android/Linux notification)
 * and soft audio chimes when tasks, mentions, or CRM updates occur.
 */

const STORAGE_KEY_ENABLED = 'crm_device_notifications_enabled';
const STORAGE_KEY_SOUND = 'crm_device_notifications_sound';

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', or 'default'
};

export const isDeviceNotificationEnabled = () => {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  const stored = localStorage.getItem(STORAGE_KEY_ENABLED);
  return stored !== 'false';
};

export const setDeviceNotificationEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
};

export const isSoundEnabled = () => {
  const stored = localStorage.getItem(STORAGE_KEY_SOUND);
  return stored !== 'false';
};

export const setSoundEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEY_SOUND, enabled ? 'true' : 'false');
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setDeviceNotificationEnabled(true);
    }
    return permission;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return Notification.permission;
  }
};

/**
 * Plays a pleasant, subtle two-tone notification chime using the Web Audio API.
 * 100% self-contained, no external audio files required.
 */
export const playNotificationChime = () => {
  if (!isSoundEnabled()) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: 880 Hz (A5) - slightly higher, delayed for melodic chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    // AudioContext autoplay restrictions or disabled audio
  }
};

/**
 * Dispatches a native operating system notification to the user's device.
 */
export const showDeviceNotification = async ({
  title = 'Codigix CRM',
  body = '',
  icon = '/logo192.png',
  badge = '/favicon.svg',
  tag = undefined,
  url = null,
  data = {}
}) => {
  if (!isNotificationSupported()) {
    console.warn('System notifications are not supported in this browser environment.');
    return null;
  }
  if (Notification.permission !== 'granted') {
    console.warn('System notification permission is:', Notification.permission);
    return null;
  }
  if (!isDeviceNotificationEnabled()) {
    console.warn('Device notifications are disabled in local settings.');
    return null;
  }

  // Always play audio chime
  playNotificationChime();

  const origin = window.location.origin;
  const iconUrl = icon?.startsWith('http') ? icon : `${origin}${icon.startsWith('/') ? icon : '/' + icon}`;
  const badgeUrl = badge?.startsWith('http') ? badge : `${origin}${badge.startsWith('/') ? badge : '/' + badge}`;

  const options = {
    body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: tag ? String(tag) : `crm-${Date.now()}-${Math.random()}`,
    renotify: true,
    data: { url: url || window.location.href, ...data }
  };

  // 1. Primary: Service Worker showNotification (Official standard for Chrome, Windows Toast & Android)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        console.log('✅ System notification dispatched via ServiceWorker');
        return true;
      }
    } catch (swErr) {
      console.warn('ServiceWorker notification notice:', swErr);
    }
  }

  // 2. Secondary fallback: Native Window Notification
  try {
    const notif = new Notification(title, options);
    notif.onclick = function (event) {
      event.preventDefault();
      try {
        window.focus();
      } catch (_) {}
      if (url) {
        window.location.href = url;
      }
      notif.close();
    };
    console.log('✅ System notification dispatched via Window Notification');
    return notif;
  } catch (winErr) {
    console.warn('Window notification notice:', winErr);
  }

  return null;
};

/**
 * Sends a test device notification so user can instantly test OS toasts and audio.
 */
export const sendTestDeviceNotification = async () => {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') {
    return { success: false, reason: 'Permission not granted (' + perm + ')' };
  }

  const result = await showDeviceNotification({
    title: '🔔 Codigix CRM - System Alert',
    body: 'Device notifications are active! You will receive instant system alerts on this device.',
    tag: `test-alert-${Date.now()}`,
    url: window.location.href
  });

  return { success: !!result };
};
