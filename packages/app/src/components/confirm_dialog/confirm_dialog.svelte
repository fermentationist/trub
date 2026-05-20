<script lang="ts">
  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirm_label?: string;
    cancel_label?: string;
    variant?: "default" | "danger";
    onconfirm: () => void;
    oncancel: () => void;
  }

  const {
    open,
    title,
    message,
    confirm_label = "Confirm",
    cancel_label = "Cancel",
    variant = "default",
    onconfirm,
    oncancel,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  let cancel_button_el: HTMLButtonElement | void = $state(void 0);

  // ---------------------------------------------------------------------------
  // Autofocus cancel button when dialog opens
  // ---------------------------------------------------------------------------

  $effect(() => {
    if (open && cancel_button_el) {
      cancel_button_el.focus();
    }
  });

  // ---------------------------------------------------------------------------
  // Keyboard handling
  // ---------------------------------------------------------------------------

  function handle_keydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      oncancel();
    }
  }

  // ---------------------------------------------------------------------------
  // Backdrop click
  // ---------------------------------------------------------------------------

  function handle_backdrop_click(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      oncancel();
    }
  }
</script>

{#if open}
  <div
    class="backdrop"
    data-testid="confirm-dialog"
    onkeydown={handle_keydown}
    onclick={handle_backdrop_click}
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-dialog-title"
    aria-describedby="confirm-dialog-message"
    tabindex="-1"
  >
    <div class="dialog">
      <h2
        class="dialog_title"
        id="confirm-dialog-title"
        data-testid="confirm-dialog-title"
      >
        {title}
      </h2>

      <p
        class="dialog_message"
        id="confirm-dialog-message"
        data-testid="confirm-dialog-message"
      >
        {message}
      </p>

      <div class="dialog_actions">
        <button
          class="dialog_button dialog_button--cancel"
          data-testid="confirm-dialog-cancel"
          type="button"
          bind:this={cancel_button_el}
          onclick={() => oncancel()}
        >
          {cancel_label}
        </button>
        <button
          class="dialog_button dialog_button--confirm"
          class:dialog_button--danger={variant === "danger"}
          data-testid="confirm-dialog-confirm"
          type="button"
          onclick={() => onconfirm()}
        >
          {confirm_label}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ---------------------------------------------------------------------------
    Backdrop
  --------------------------------------------------------------------------- */

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
  }

  /* ---------------------------------------------------------------------------
    Dialog box
  --------------------------------------------------------------------------- */

  .dialog {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    width: 100%;
    max-width: 400px;
    margin: var(--spacing-lg);
    padding: var(--spacing-lg);
    background: var(--color-surface);
    border: var(--border);
    border-radius: 0;
  }

  /* ---------------------------------------------------------------------------
    Title
  --------------------------------------------------------------------------- */

  .dialog_title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
  }

  /* ---------------------------------------------------------------------------
    Message
  --------------------------------------------------------------------------- */

  .dialog_message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  /* ---------------------------------------------------------------------------
    Actions
  --------------------------------------------------------------------------- */

  .dialog_actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--color-border);
  }

  /* ---------------------------------------------------------------------------
    Buttons — outlined style
  --------------------------------------------------------------------------- */

  .dialog_button {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-lg);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--easing-base),
      border-color var(--duration-fast) var(--easing-base),
      color var(--duration-fast) var(--easing-base);
  }

  /* Cancel */

  .dialog_button--cancel {
    color: var(--color-text-secondary);
  }

  .dialog_button--cancel:hover {
    border-color: var(--color-text-secondary);
    color: var(--color-text-primary);
    background: var(--color-surface-raised);
  }

  /* Confirm — default (accent) */

  .dialog_button--confirm {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .dialog_button--confirm:hover {
    background: var(--color-accent);
    color: var(--color-background);
  }

  /* Confirm — danger variant */

  .dialog_button--danger {
    color: var(--color-error);
    border-color: var(--color-error);
  }

  .dialog_button--danger:hover {
    background: var(--color-error);
    color: var(--color-background);
  }

  /* Focus */

  .dialog_button:focus-visible {
    outline: 1px solid var(--color-accent);
    outline-offset: 1px;
  }
</style>
