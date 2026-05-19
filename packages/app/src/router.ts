import type { Component } from "svelte";
import RecipesList from "./routes/recipes_list.svelte";
import RecipeEditor from "./routes/recipe_editor.svelte";
import Settings from "./routes/settings.svelte";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteComponent = Component<any>;

export const routes = new Map<string, RouteComponent>([
  ["/recipes", RecipesList],
  ["/recipes/:id", RecipeEditor],
  ["/settings", Settings],
  ["*", RecipesList],
]);
