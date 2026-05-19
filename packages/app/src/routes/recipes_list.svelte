<script lang="ts">
  import { push } from "svelte-spa-router";
</script>

<section class="recipes-list" data-testid="recipes-list">
  <header class="list-header">
    <h1 class="list-title">Recipes</h1>
    <button
      class="new-recipe-button"
      data-testid="new-recipe-button"
      type="button"
      onclick={() => push("/recipes/new")}
    >
      + New Recipe
    </button>
  </header>

  <div class="list-body" data-testid="recipes-list-body">
    <p class="empty-message">No recipes yet. Create one to get started!</p>
  </div>
</section>

<style>
  /* ---------------------------------------------------------------------------
    Page shell
  --------------------------------------------------------------------------- */

  .recipes-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    max-width: 960px;
    margin: 0 auto;
  }

  /* ---------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- */

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .list-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .new-recipe-button {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--color-accent);
    color: var(--color-background);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--easing-base),
      opacity var(--duration-fast) var(--easing-base);
  }

  .new-recipe-button:hover {
    background: var(--color-accent-hover);
  }

  .new-recipe-button:active {
    opacity: 0.85;
  }

  /* ---------------------------------------------------------------------------
    List body / empty state
  --------------------------------------------------------------------------- */

  .list-body {
    padding: var(--spacing-xl);
    text-align: center;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .empty-message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
</style>
