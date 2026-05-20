<script lang="ts">
  import Router from "svelte-spa-router";
  import active from "svelte-spa-router/active";
  import { routes } from "./router";
  import { settings_store } from "./stores/settings_store.svelte";

  $effect(() => {
    void settings_store.load();
  });
</script>

<div class="app-shell">
  <nav class="nav-bar" data-testid="nav-bar">
    <a class="nav-brand" href="#/recipes" data-testid="nav-brand"> TRUB </a>

    <div class="nav-links">
      <a
        class="nav-link"
        href="#/recipes"
        use:active={{ className: "nav-link--active", inactiveClassName: "" }}
        data-testid="nav-link-recipes"
      >
        recipes
      </a>
      <a
        class="nav-link"
        href="#/settings"
        use:active={{ className: "nav-link--active", inactiveClassName: "" }}
        data-testid="nav-link-settings"
      >
        settings
      </a>
    </div>
  </nav>

  <main class="app-content">
    <Router {routes} />
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .nav-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: var(--spacing-xl);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--color-background);
    border-bottom: var(--border);
  }

  .nav-brand {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-decoration: none;
    letter-spacing: var(--letter-spacing-caps);
    text-transform: uppercase;
  }

  .nav-links {
    display: flex;
    gap: var(--spacing-lg);
  }

  .nav-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    letter-spacing: var(--letter-spacing-wide);
    transition: color var(--duration-fast) var(--easing-base);
  }

  .nav-link:hover {
    color: var(--color-text-primary);
  }

  /* Applied by the `active` action when the route matches */
  :global(.nav-link--active) {
    color: var(--color-accent);
  }

  .app-content {
    flex: 1;
    padding: var(--spacing-lg);
  }
</style>
