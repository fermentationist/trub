<script lang="ts">
  import type { EquipmentProfile } from "@trub/types";
  import { EquipmentRepository } from "../../repositories/equipment_repository";
  import UnitInput from "../unit_input/unit_input.svelte";
  import UnitValue from "../unit_value/unit_value.svelte";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const DEFAULT_PROFILE: EquipmentProfile = {
    name: "",
    batch_size_l: 18.93,
    boil_size_l: 24.61,
    boil_time_min: 60,
    efficiency_pct: 72,
    evap_rate_l_per_hr: 3.79,
    trub_chiller_loss_l: 1.89,
    mash_tun_dead_space_l: 0,
    mash_tun_thermal_mass: 0,
    mash_thickness_l_per_kg: 2.6,
    is_default: false,
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    onchange?: () => void;
  }

  const { onchange }: Props = $props();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let profiles = $state<EquipmentProfile[]>([]);
  let is_loading = $state(true);
  let load_error = $state<string | null>(null);

  // Which profile id is currently open for editing (null = none, "new" = add form)
  let editing_id = $state<number | "new" | null>(null);

  // The working copy of the form while editing or adding
  let form_draft = $state<EquipmentProfile>({ ...DEFAULT_PROFILE });

  let is_saving = $state(false);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  async function load_profiles(): Promise<void> {
    is_loading = true;
    load_error = null;
    try {
      profiles = await EquipmentRepository.list();
    } catch (err) {
      load_error =
        err instanceof Error ? err.message : "Failed to load equipment profiles.";
    } finally {
      is_loading = false;
    }
  }

  $effect(() => {
    void load_profiles();
  });

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const is_adding = $derived(editing_id === "new");

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function open_add_form(): void {
    editing_id = "new";
    form_draft = { ...DEFAULT_PROFILE };
  }

  function open_edit_form(profile: EquipmentProfile): void {
    editing_id = profile.id ?? null;
    form_draft = { ...profile };
  }

  function close_form(): void {
    editing_id = null;
    form_draft = { ...DEFAULT_PROFILE };
  }

  function num_field(e: Event): number {
    return parseFloat((e.target as HTMLInputElement).value) || 0;
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handle_save(): Promise<void> {
    if (form_draft.name.trim() === "") {
      return;
    }
    is_saving = true;
    try {
      await EquipmentRepository.save({ ...form_draft, name: form_draft.name.trim() });
      await load_profiles();
      close_form();
      onchange?.();
    } catch {
      // Surface nothing visually for now; the list will not change
    } finally {
      is_saving = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handle_delete(profile: EquipmentProfile): Promise<void> {
    if (profile.id === void 0) {
      return;
    }
    const confirmed = window.confirm(
      `Delete "${profile.name}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await EquipmentRepository.delete(profile.id);
      // Close edit form if this profile was being edited
      if (editing_id === profile.id) {
        close_form();
      }
      await load_profiles();
      onchange?.();
    } catch {
      // Silent — list remains unchanged
    }
  }

  // ---------------------------------------------------------------------------
  // Set default
  // ---------------------------------------------------------------------------

  async function handle_set_default(profile: EquipmentProfile): Promise<void> {
    if (profile.id === void 0) {
      return;
    }
    try {
      await EquipmentRepository.set_default(profile.id);
      await load_profiles();
      onchange?.();
    } catch {
      // Silent
    }
  }
</script>

<!-- ==========================================================================
  Equipment Profiles Section
=========================================================================== -->
<section class="equipment-section" data-testid="equipment-section">
  <!-- -------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- -->
  <header class="section-header">
    <div class="header-text">
      <h2 class="section-title">Equipment Profiles</h2>
      <p class="section-subtitle">
        Define your brew system once; apply it to any recipe.
      </p>
    </div>
    <button
      class="add-button"
      data-testid="equipment-add-button"
      type="button"
      disabled={is_adding}
      onclick={open_add_form}
    >
      + Add Profile
    </button>
  </header>

  <!-- -------------------------------------------------------------------------
    Loading
  --------------------------------------------------------------------------- -->
  {#if is_loading}
    <div class="loading-state" data-testid="equipment-loading">
      <p class="loading-message">Loading profiles…</p>
    </div>

  <!-- -------------------------------------------------------------------------
    Error
  --------------------------------------------------------------------------- -->
  {:else if load_error !== null}
    <div class="error-state" data-testid="equipment-error">
      <p class="error-message">{load_error}</p>
      <button class="retry-button" type="button" onclick={load_profiles}>
        Retry
      </button>
    </div>

  {:else}
    <!-- -----------------------------------------------------------------------
      Add form (shown above the list when adding a new profile)
    ----------------------------------------------------------------------- -->
    {#if is_adding}
      <div class="form-card" data-testid="equipment-form">
        <h3 class="form-title">New Profile</h3>
        <div class="form-grid">
          <!-- Name -->
          <label class="form-label" for="eq-form-name">Name</label>
          <input
            id="eq-form-name"
            class="form-input"
            data-testid="equipment-form-name"
            type="text"
            placeholder="e.g. My 5-Gallon Kettle"
            value={form_draft.name}
            oninput={(e) => (form_draft.name = (e.target as HTMLInputElement).value)}
          />

          <!-- Batch Size -->
          <span class="form-label">Batch Size</span>
          <UnitInput
            value={form_draft.batch_size_l}
            category="BATCH_VOLUME"
            onchange={(v) => { form_draft.batch_size_l = v; }}
            step={0.1}
            min={0}
            data_testid="equipment-form-batch-size"
          />

          <!-- Pre-Boil Volume -->
          <span class="form-label">Pre-Boil Volume</span>
          <UnitInput
            value={form_draft.boil_size_l}
            category="BATCH_VOLUME"
            onchange={(v) => { form_draft.boil_size_l = v; }}
            step={0.1}
            min={0}
            data_testid="equipment-form-boil-size"
          />

          <!-- Boil Time -->
          <label class="form-label" for="eq-form-boil-time">
            Boil Time (min)
          </label>
          <input
            id="eq-form-boil-time"
            class="form-input form-input--numeric"
            data-testid="equipment-form-boil-time"
            type="number"
            min="0"
            step="1"
            value={form_draft.boil_time_min}
            oninput={(e) => (form_draft.boil_time_min = num_field(e))}
          />

          <!-- Efficiency -->
          <label class="form-label" for="eq-form-efficiency">
            Efficiency (%)
          </label>
          <input
            id="eq-form-efficiency"
            class="form-input form-input--numeric"
            data-testid="equipment-form-efficiency"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form_draft.efficiency_pct}
            oninput={(e) => (form_draft.efficiency_pct = num_field(e))}
          />

          <!-- Evaporation Rate -->
          <span class="form-label">Evaporation Rate</span>
          <UnitInput
            value={form_draft.evap_rate_l_per_hr}
            category="EVAP_RATE"
            onchange={(v) => { form_draft.evap_rate_l_per_hr = v; }}
            step={0.1}
            min={0}
            data_testid="equipment-form-evap-rate"
          />

          <!-- Trub/Chiller Loss -->
          <span class="form-label">Trub/Chiller Loss</span>
          <UnitInput
            value={form_draft.trub_chiller_loss_l}
            category="BATCH_VOLUME"
            onchange={(v) => { form_draft.trub_chiller_loss_l = v; }}
            step={0.1}
            min={0}
            data_testid="equipment-form-trub-loss"
          />

          <!-- Mash Tun Dead Space -->
          <span class="form-label">Mash Tun Dead Space</span>
          <UnitInput
            value={form_draft.mash_tun_dead_space_l}
            category="BATCH_VOLUME"
            onchange={(v) => { form_draft.mash_tun_dead_space_l = v; }}
            step={0.1}
            min={0}
            data_testid="equipment-form-dead-space"
          />

          <!-- Mash Tun Thermal Mass -->
          <label class="form-label" for="eq-form-thermal-mass">
            Mash Tun Thermal Mass
          </label>
          <input
            id="eq-form-thermal-mass"
            class="form-input form-input--numeric"
            data-testid="equipment-form-thermal-mass"
            type="number"
            min="0"
            step="0.01"
            value={form_draft.mash_tun_thermal_mass}
            oninput={(e) => (form_draft.mash_tun_thermal_mass = num_field(e))}
          />

          <!-- Mash Thickness -->
          <label class="form-label" for="eq-form-mash-thickness">
            Mash Thickness (L/kg)
          </label>
          <input
            id="eq-form-mash-thickness"
            class="form-input form-input--numeric"
            data-testid="equipment-form-mash-thickness"
            type="number"
            min="0"
            step="0.01"
            value={form_draft.mash_thickness_l_per_kg}
            oninput={(e) => (form_draft.mash_thickness_l_per_kg = num_field(e))}
          />
        </div>

        <!-- Form actions -->
        <div class="form-actions">
          <button
            class="save-button"
            data-testid="equipment-form-save"
            type="button"
            disabled={is_saving || form_draft.name.trim() === ""}
            onclick={handle_save}
          >
            {is_saving ? "Saving…" : "Save"}
          </button>
          <button
            class="cancel-button"
            data-testid="equipment-form-cancel"
            type="button"
            disabled={is_saving}
            onclick={close_form}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- -----------------------------------------------------------------------
      Empty state
    ----------------------------------------------------------------------- -->
    {#if profiles.length === 0 && !is_adding}
      <div class="empty-state" data-testid="equipment-empty-state">
        <p class="empty-state-message">
          No equipment profiles yet. Add one to track your batch size,
          efficiency, and losses.
        </p>
      </div>

    <!-- -----------------------------------------------------------------------
      Profile list
    ----------------------------------------------------------------------- -->
    {:else if profiles.length > 0}
      <ul class="profile-list" data-testid="equipment-profile-list">
        {#each profiles as profile (profile.id)}
          {@const profile_id = profile.id ?? 0}
          {@const is_editing_this = editing_id === profile_id}

          <li
            class="profile-item"
            class:profile-item--editing={is_editing_this}
            data-testid="equipment-profile-{profile_id}"
          >
            <!-- Summary row (always visible) -->
            <div class="profile-row">
              <!-- Left: name + badge -->
              <div class="profile-identity">
                <span
                  class="profile-name"
                  data-testid="equipment-profile-name-{profile_id}"
                >
                  {profile.name}
                </span>
                {#if profile.is_default}
                  <span
                    class="default-badge"
                    data-testid="equipment-profile-default-badge-{profile_id}"
                  >
                    Default
                  </span>
                {/if}
              </div>

              <!-- Center: quick stats -->
              <div class="profile-stats">
                <span class="stat">
                  <span class="stat-label">Batch</span>
                  <span class="stat-value">
                    <UnitValue
                      value={profile.batch_size_l}
                      category="BATCH_VOLUME"
                    />
                  </span>
                </span>
                <span class="stat">
                  <span class="stat-label">Eff.</span>
                  <span class="stat-value">{profile.efficiency_pct}%</span>
                </span>
              </div>

              <!-- Right: actions -->
              <div class="profile-actions">
                {#if !profile.is_default}
                  <button
                    class="action-button action-button--default"
                    data-testid="equipment-set-default-button-{profile_id}"
                    type="button"
                    onclick={() => handle_set_default(profile)}
                  >
                    Set Default
                  </button>
                {/if}
                <button
                  class="action-button action-button--edit"
                  class:action-button--active={is_editing_this}
                  data-testid="equipment-edit-button-{profile_id}"
                  type="button"
                  onclick={() =>
                    is_editing_this ? close_form() : open_edit_form(profile)}
                >
                  {is_editing_this ? "Close" : "Edit"}
                </button>
                <button
                  class="action-button action-button--delete"
                  data-testid="equipment-delete-button-{profile_id}"
                  type="button"
                  onclick={() => handle_delete(profile)}
                >
                  Delete
                </button>
              </div>
            </div>

            <!-- Inline edit form (shown below the row when editing) -->
            {#if is_editing_this}
              <div class="form-card form-card--inline" data-testid="equipment-form">
                <div class="form-grid">
                  <!-- Name -->
                  <label class="form-label" for="eq-edit-name-{profile_id}">
                    Name
                  </label>
                  <input
                    id="eq-edit-name-{profile_id}"
                    class="form-input"
                    data-testid="equipment-form-name"
                    type="text"
                    value={form_draft.name}
                    oninput={(e) =>
                      (form_draft.name = (e.target as HTMLInputElement).value)}
                  />

                  <!-- Batch Size -->
                  <span class="form-label">Batch Size</span>
                  <UnitInput
                    value={form_draft.batch_size_l}
                    category="BATCH_VOLUME"
                    onchange={(v) => { form_draft.batch_size_l = v; }}
                    step={0.1}
                    min={0}
                    data_testid="equipment-form-batch-size"
                  />

                  <!-- Pre-Boil Volume -->
                  <span class="form-label">Pre-Boil Volume</span>
                  <UnitInput
                    value={form_draft.boil_size_l}
                    category="BATCH_VOLUME"
                    onchange={(v) => { form_draft.boil_size_l = v; }}
                    step={0.1}
                    min={0}
                    data_testid="equipment-form-boil-size"
                  />

                  <!-- Boil Time -->
                  <label
                    class="form-label"
                    for="eq-edit-boil-time-{profile_id}"
                  >
                    Boil Time (min)
                  </label>
                  <input
                    id="eq-edit-boil-time-{profile_id}"
                    class="form-input form-input--numeric"
                    data-testid="equipment-form-boil-time"
                    type="number"
                    min="0"
                    step="1"
                    value={form_draft.boil_time_min}
                    oninput={(e) => (form_draft.boil_time_min = num_field(e))}
                  />

                  <!-- Efficiency -->
                  <label
                    class="form-label"
                    for="eq-edit-efficiency-{profile_id}"
                  >
                    Efficiency (%)
                  </label>
                  <input
                    id="eq-edit-efficiency-{profile_id}"
                    class="form-input form-input--numeric"
                    data-testid="equipment-form-efficiency"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form_draft.efficiency_pct}
                    oninput={(e) => (form_draft.efficiency_pct = num_field(e))}
                  />

                  <!-- Evaporation Rate -->
                  <span class="form-label">Evaporation Rate</span>
                  <UnitInput
                    value={form_draft.evap_rate_l_per_hr}
                    category="EVAP_RATE"
                    onchange={(v) => { form_draft.evap_rate_l_per_hr = v; }}
                    step={0.1}
                    min={0}
                    data_testid="equipment-form-evap-rate"
                  />

                  <!-- Trub/Chiller Loss -->
                  <span class="form-label">Trub/Chiller Loss</span>
                  <UnitInput
                    value={form_draft.trub_chiller_loss_l}
                    category="BATCH_VOLUME"
                    onchange={(v) => { form_draft.trub_chiller_loss_l = v; }}
                    step={0.1}
                    min={0}
                    data_testid="equipment-form-trub-loss"
                  />

                  <!-- Mash Tun Dead Space -->
                  <span class="form-label">Mash Tun Dead Space</span>
                  <UnitInput
                    value={form_draft.mash_tun_dead_space_l}
                    category="BATCH_VOLUME"
                    onchange={(v) => { form_draft.mash_tun_dead_space_l = v; }}
                    step={0.1}
                    min={0}
                    data_testid="equipment-form-dead-space"
                  />

                  <!-- Mash Tun Thermal Mass -->
                  <label
                    class="form-label"
                    for="eq-edit-thermal-mass-{profile_id}"
                  >
                    Mash Tun Thermal Mass
                  </label>
                  <input
                    id="eq-edit-thermal-mass-{profile_id}"
                    class="form-input form-input--numeric"
                    data-testid="equipment-form-thermal-mass"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form_draft.mash_tun_thermal_mass}
                    oninput={(e) =>
                      (form_draft.mash_tun_thermal_mass = num_field(e))}
                  />

                  <!-- Mash Thickness -->
                  <label
                    class="form-label"
                    for="eq-edit-mash-thickness-{profile_id}"
                  >
                    Mash Thickness (L/kg)
                  </label>
                  <input
                    id="eq-edit-mash-thickness-{profile_id}"
                    class="form-input form-input--numeric"
                    data-testid="equipment-form-mash-thickness"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form_draft.mash_thickness_l_per_kg}
                    oninput={(e) =>
                      (form_draft.mash_thickness_l_per_kg = num_field(e))}
                  />
                </div>

                <!-- Form actions -->
                <div class="form-actions">
                  <button
                    class="save-button"
                    data-testid="equipment-form-save"
                    type="button"
                    disabled={is_saving || form_draft.name.trim() === ""}
                    onclick={handle_save}
                  >
                    {is_saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    class="cancel-button"
                    data-testid="equipment-form-cancel"
                    type="button"
                    disabled={is_saving}
                    onclick={close_form}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<style>
  /* ---------------------------------------------------------------------------
    Section shell
  --------------------------------------------------------------------------- */

  .equipment-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  /* ---------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- */

  .section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .section-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .section-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  /* ---------------------------------------------------------------------------
    Add button
  --------------------------------------------------------------------------- */

  .add-button {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-md);
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

  .add-button:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .add-button:active:not(:disabled) {
    opacity: 0.85;
  }

  .add-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ---------------------------------------------------------------------------
    Loading state
  --------------------------------------------------------------------------- */

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .loading-message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  /* ---------------------------------------------------------------------------
    Error state
  --------------------------------------------------------------------------- */

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-xl);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-error) 8%, transparent);
    text-align: center;
  }

  .error-message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-error);
  }

  .retry-button {
    padding: var(--spacing-xs) var(--spacing-md);
    background: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--easing-base),
      color var(--duration-fast) var(--easing-base);
  }

  .retry-button:hover {
    background: var(--color-error);
    color: var(--color-background);
  }

  /* ---------------------------------------------------------------------------
    Empty state
  --------------------------------------------------------------------------- */

  .empty-state {
    padding: var(--spacing-xl);
    text-align: center;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .empty-state-message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  /* ---------------------------------------------------------------------------
    Profile list
  --------------------------------------------------------------------------- */

  .profile-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  /* ---------------------------------------------------------------------------
    Profile item
  --------------------------------------------------------------------------- */

  .profile-item {
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: border-color var(--duration-fast) var(--easing-base);
  }

  .profile-item--editing {
    border-color: var(--color-accent);
  }

  /* ---------------------------------------------------------------------------
    Profile summary row
  --------------------------------------------------------------------------- */

  .profile-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    flex-wrap: wrap;
  }

  /* Identity: name + badge */

  .profile-identity {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 1;
    min-width: 0;
  }

  .profile-name {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .default-badge {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: 2px var(--spacing-sm);
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
    color: var(--color-accent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* Quick stats */

  .profile-stats {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    flex-shrink: 0;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: var(--font-weight-medium);
  }

  .stat-value {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
  }

  /* Action buttons cluster */

  .profile-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-shrink: 0;
  }

  /* ---------------------------------------------------------------------------
    Action buttons
  --------------------------------------------------------------------------- */

  .action-button {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition:
      background var(--duration-fast) var(--easing-base),
      border-color var(--duration-fast) var(--easing-base),
      color var(--duration-fast) var(--easing-base);
    white-space: nowrap;
  }

  .action-button--default:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }

  .action-button--edit:hover {
    border-color: var(--color-text-secondary);
    color: var(--color-text-primary);
    background: var(--color-surface-raised);
  }

  .action-button--active {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }

  .action-button--delete:hover {
    border-color: var(--color-error);
    color: var(--color-error);
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
  }

  /* ---------------------------------------------------------------------------
    Inline form card
  --------------------------------------------------------------------------- */

  .form-card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .form-card--inline {
    border: none;
    border-top: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-surface-raised);
  }

  .form-title {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  /* ---------------------------------------------------------------------------
    Form grid — two-column label + input
  --------------------------------------------------------------------------- */

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: var(--spacing-sm) var(--spacing-lg);
  }

  .form-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .form-input {
    width: 100%;
    padding: var(--spacing-xs) var(--spacing-sm);
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
    box-sizing: border-box;
  }

  .form-input:hover {
    border-color: var(--color-accent);
  }

  .form-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  .form-input--numeric {
    text-align: right;
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .form-input--numeric::-webkit-inner-spin-button,
  .form-input--numeric::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* ---------------------------------------------------------------------------
    Form action row
  --------------------------------------------------------------------------- */

  .form-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    justify-content: flex-end;
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--color-border);
  }

  /* Save */

  .save-button {
    padding: var(--spacing-xs) var(--spacing-lg);
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

  .save-button:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .save-button:active:not(:disabled) {
    opacity: 0.85;
  }

  .save-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Cancel */

  .cancel-button {
    padding: var(--spacing-xs) var(--spacing-md);
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      color var(--duration-fast) var(--easing-base),
      background var(--duration-fast) var(--easing-base);
  }

  .cancel-button:hover:not(:disabled) {
    border-color: var(--color-text-secondary);
    color: var(--color-text-primary);
    background: var(--color-surface-raised);
  }

  .cancel-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ---------------------------------------------------------------------------
    Responsive — collapse two-column grid on narrow viewports
  --------------------------------------------------------------------------- */

  @media (max-width: 540px) {
    .form-grid {
      grid-template-columns: 1fr;
    }

    .profile-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .profile-stats {
      width: 100%;
      justify-content: flex-start;
    }

    .profile-actions {
      width: 100%;
      flex-wrap: wrap;
    }
  }
</style>
