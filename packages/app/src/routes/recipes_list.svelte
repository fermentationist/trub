<script lang="ts">
  import { push } from "svelte-spa-router";
  import { recipe_list_store } from "../stores/recipe_list_store.svelte";
  import { equipment_store } from "../stores/equipment_store.svelte";
  import RecipeCard from "../components/recipe_card/recipe_card.svelte";
  import type { SortField, SortDirection } from "../stores/recipe_list_store.svelte";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const SORT_FIELD_OPTIONS: Array<{ value: SortField; label: string }> = [
    { value: "updated_at", label: "Updated" },
    { value: "created_at", label: "Created" },
    { value: "name", label: "Name" },
  ];

  const DEBOUNCE_MS = 300;

  // ---------------------------------------------------------------------------
  // Debounce timeout — module-level so it survives re-renders
  // ---------------------------------------------------------------------------

  let search_timeout: ReturnType<typeof setTimeout> | void = void 0;

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------

  let search_input_value = $state("");

  // ---------------------------------------------------------------------------
  // Derived shortcuts
  // ---------------------------------------------------------------------------

  const recipes = $derived(recipe_list_store.recipes);
  const is_loading = $derived(recipe_list_store.is_loading);
  const search_query = $derived(recipe_list_store.search_query);
  const sort_by = $derived(recipe_list_store.sort_by);
  const sort_direction = $derived(recipe_list_store.sort_direction);

  const has_recipes = $derived(recipes.length > 0);
  const is_searching = $derived(search_query.trim() !== "");

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  $effect(() => {
    void recipe_list_store.load();
    void equipment_store.load();
  });

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handle_search_input(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    search_input_value = value;

    if (search_timeout !== void 0) {
      clearTimeout(search_timeout);
    }
    search_timeout = setTimeout(() => {
      void recipe_list_store.search(value);
      search_timeout = void 0;
    }, DEBOUNCE_MS);
  }

  function handle_sort_field_change(e: Event): void {
    const field = (e.target as HTMLSelectElement).value as SortField;
    recipe_list_store.set_sort(field, sort_direction);
  }

  function handle_sort_direction_toggle(): void {
    const next_direction: SortDirection =
      sort_direction === "asc" ? "desc" : "asc";
    recipe_list_store.set_sort(sort_by, next_direction);
  }

  function handle_delete(id: number): void {
    const confirmed = window.confirm(
      "Are you sure you want to delete this recipe? This cannot be undone.",
    );
    if (confirmed) {
      void recipe_list_store.delete_recipe(id);
    }
  }

  function handle_duplicate(id: number): void {
    void recipe_list_store.duplicate_recipe(id);
  }
</script>

<section class="recipes_list" data-testid="recipes-list">
  <!-- -------------------------------------------------------------------------
    Header row: title + actions
  --------------------------------------------------------------------------- -->
  <header class="list_header">
    <h1 class="list_title">Recipes</h1>
    <div class="header_actions">
      <a
        class="settings_link"
        href="#/settings"
        aria-label="Settings"
        data-testid="settings-link"
      >
        <svg
          class="settings_icon"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          ></path>
        </svg>
      </a>
      <button
        class="new_recipe_button"
        data-testid="new-recipe-button"
        type="button"
        onclick={() => push("/recipes/new")}
      >
        + New Recipe
      </button>
    </div>
  </header>

  <!-- -------------------------------------------------------------------------
    Search + sort controls
  --------------------------------------------------------------------------- -->
  <div class="controls_row">
    <input
      class="search_input"
      data-testid="search-input"
      type="search"
      placeholder="Search recipes…"
      value={search_input_value}
      oninput={handle_search_input}
      aria-label="Search recipes"
    />

    <div class="sort_controls">
      <select
        class="sort_select"
        data-testid="sort-select"
        value={sort_by}
        onchange={handle_sort_field_change}
        aria-label="Sort by"
      >
        {#each SORT_FIELD_OPTIONS as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>

      <button
        class="sort_direction_button"
        data-testid="sort-direction-button"
        type="button"
        aria-label="Sort direction: {sort_direction === 'asc' ? 'ascending' : 'descending'}"
        onclick={handle_sort_direction_toggle}
      >
        {#if sort_direction === "asc"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
          Asc
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
          Desc
        {/if}
      </button>
    </div>
  </div>

  <!-- -------------------------------------------------------------------------
    Body
  --------------------------------------------------------------------------- -->
  <div class="list_body" data-testid="recipes-list-body">
    {#if is_loading}
      <!-- Loading state -->
      <div class="loading_state" data-testid="recipes-loading">
        <p class="status_message">Loading recipes…</p>
      </div>
    {:else if !has_recipes && !is_searching}
      <!-- Empty state: no recipes at all -->
      <div class="empty_state" data-testid="empty-state">
        <p class="empty_heading">No recipes yet.</p>
        <p class="empty_subtext">Create your first recipe to get started!</p>
        <button
          class="new_recipe_button"
          data-testid="empty-state-new-recipe-button"
          type="button"
          onclick={() => push("/recipes/new")}
        >
          + New Recipe
        </button>
      </div>
    {:else if !has_recipes && is_searching}
      <!-- Empty search state: query returned nothing -->
      <div class="empty_search_state" data-testid="empty-search-state">
        <p class="status_message">No recipes match your search.</p>
      </div>
    {:else}
      <!-- Recipes grid -->
      <div class="recipes_grid" data-testid="recipes-grid">
        {#each recipes as recipe (recipe.id)}
          <RecipeCard
            {recipe}
            ondelete={handle_delete}
            onduplicate={handle_duplicate}
          />
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  /* ---------------------------------------------------------------------------
    Page shell
  --------------------------------------------------------------------------- */

  .recipes_list {
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

  .list_header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .list_title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .header_actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .settings_link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    text-decoration: none;
    transition:
      color var(--duration-fast) var(--easing-base),
      border-color var(--duration-fast) var(--easing-base),
      background var(--duration-fast) var(--easing-base);
  }

  .settings_link:hover {
    color: var(--color-text-primary);
    border-color: var(--color-text-secondary);
    background: var(--color-surface-raised);
  }

  .settings_icon {
    display: block;
  }

  .new_recipe_button {
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

  .new_recipe_button:hover {
    background: var(--color-accent-hover);
  }

  .new_recipe_button:active {
    opacity: 0.85;
  }

  .new_recipe_button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  /* ---------------------------------------------------------------------------
    Controls row: search + sort
  --------------------------------------------------------------------------- */

  .controls_row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex-wrap: wrap;
  }

  .search_input {
    flex: 1;
    min-width: 160px;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    outline: none;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      box-shadow var(--duration-fast) var(--easing-base);
  }

  .search_input::placeholder {
    color: var(--color-text-secondary);
  }

  .search_input:hover {
    border-color: var(--color-accent);
  }

  .search_input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  /* Cancel button in search inputs (webkit) */
  .search_input::-webkit-search-cancel-button {
    cursor: pointer;
  }

  .sort_controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-shrink: 0;
  }

  .sort_select {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      box-shadow var(--duration-fast) var(--easing-base);
  }

  .sort_select:hover {
    border-color: var(--color-accent);
  }

  .sort_select:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  .sort_direction_button {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background var(--duration-fast) var(--easing-base),
      color var(--duration-fast) var(--easing-base),
      border-color var(--duration-fast) var(--easing-base);
  }

  .sort_direction_button:hover {
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
    border-color: var(--color-text-secondary);
  }

  .sort_direction_button:active {
    opacity: 0.85;
  }

  .sort_direction_button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  /* ---------------------------------------------------------------------------
    Body
  --------------------------------------------------------------------------- */

  .list_body {
    display: flex;
    flex-direction: column;
  }

  /* ---------------------------------------------------------------------------
    Loading state
  --------------------------------------------------------------------------- */

  .loading_state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  /* ---------------------------------------------------------------------------
    Empty states
  --------------------------------------------------------------------------- */

  .empty_state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-2xl);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    text-align: center;
  }

  .empty_heading {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .empty_subtext {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .empty_search_state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .status_message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  /* ---------------------------------------------------------------------------
    Recipes grid — 1 col on mobile, 2 cols from ~600 px up
  --------------------------------------------------------------------------- */

  .recipes_grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }

  @media (min-width: 600px) {
    .recipes_grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
