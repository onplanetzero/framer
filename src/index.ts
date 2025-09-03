#!/usr/bin/env node
import figlet from "figlet";
import { makeCli, run } from "./core/program";

console.log(figlet.textSync("Framer"));

run(makeCli(), process.argv);
