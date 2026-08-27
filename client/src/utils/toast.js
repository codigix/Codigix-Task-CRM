import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const showSuccessToast = (message) => {
  Toast.fire({
    icon: 'success',
    title: message,
  });
};

export const showErrorToast = (message) => {
  Toast.fire({
    icon: 'error',
    title: message,
  });
};

export const showInfoToast = (message) => {
  Toast.fire({
    icon: 'info',
    title: message,
  });
};

export const showWarningToast = (message) => {
  Toast.fire({
    icon: 'warning',
    title: message,
  });
};

export default Toast;
