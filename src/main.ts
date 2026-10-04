import { mount } from "svelte";
import App from "./App.svelte";
import "@fontsource-variable/cinzel";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/geist-mono";
import "./app.css";

const target = document.getElementById("app");
if (!target) throw new Error("Root element #app not found");

const app = mount(App, { target });

export default app;
