document.addEventListener('DOMContentLoaded', () => {
  // Functions to open and close a modal
  function openModal($el) {
    $el.classList.add('is-active');
  }

  function closeModal($el) {
    $el.classList.remove('is-active');
  }

  function closeAllModals() {
    (document.querySelectorAll('.modal') || []).forEach(($modal) => {
      closeModal($modal);
    });
  }

  // Add a click event on buttons to open a specific modal
  (document.querySelectorAll('.js-modal-trigger') || []).forEach(($trigger) => {
    const modal = $trigger.dataset.target;
    const $target = document.getElementById(modal);

    $trigger.addEventListener('click', () => {
      openModal($target);
    });
  });

  // Add a click event on various child elements to close the parent modal
  (document.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button') || []).forEach(($close) => {
    const $target = $close.closest('.modal');

    $close.addEventListener('click', () => {
      closeModal($target);
    });
  });

  // Add a keyboard event to close all modals
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      closeAllModals();
    }
  });

  // Submit the contact form to Formspree in the background and show the result inline
  const $form = document.getElementById('contact-form');
  if ($form) {
    const $status = document.getElementById('contact-status');
    const $submit = $form.querySelector('button[type="submit"]');
    const FALLBACK = 'Sorry, your message couldn\'t be sent. Please email devguff@gmail.com.';
    const RATE_LIMITED = 'Too many messages right now. Please try again in a few minutes, or email devguff@gmail.com.';
    const SENT = 'Thanks! Your message is on its way. I\'ll get back to you soon.';

    function showStatus(text, kind) {
      $status.textContent = text;
      $status.classList.remove('is-success', 'is-danger');
      if (kind) $status.classList.add(kind);
    }

    $form.addEventListener('submit', async (event) => {
      event.preventDefault();
      $submit.disabled = true;
      showStatus('Sending…');
      try {
        const response = await fetch($form.action, {
          method: 'POST',
          body: new FormData($form),
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          $form.reset();
          showStatus(SENT, 'is-success');
        } else {
          showStatus(response.status === 429 ? RATE_LIMITED : FALLBACK, 'is-danger');
        }
      } catch (error) {
        showStatus(FALLBACK, 'is-danger');
      } finally {
        $submit.disabled = false;
      }
    });
  }
});